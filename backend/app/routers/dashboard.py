# backend/app/routers/dashboard.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import json

from app.db.database import get_db
from app.models.models import Progress, EikenResult, MasterTextbook, BulkPreset, BulkPresetBook, User, Student, AuditLog
from app.routers.auth import get_current_user
from app.routers.deps import get_current_admin_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def get_adjusted_duration(base_duration: float, book_level: str, student_dev: Optional[float]) -> float:
    if not base_duration or not student_dev or not book_level:
        return float(base_duration or 0.0)

    level_map = {
        "基礎徹底": 50,
        "日大": 60,
        "MARCH": 70,
        "早慶": 75
    }

    target_dev = None
    for key, val in level_map.items():
        if key in book_level:
            target_dev = val
            break
            
    if target_dev is None:
        return float(base_duration)

    diff = target_dev - student_dev
    adjusted_time = base_duration + base_duration * diff * 0.025
    adjusted_time = max(0.1, adjusted_time)
    return round(adjusted_time, 1)

class DashboardData(BaseModel):
    student_id: int
    total_study_time: float      
    total_planned_time: float    
    progress_rate: float         
    eiken_grade: Optional[str] = "未登録"
    eiken_score: Optional[str] = "-"
    eiken_date: Optional[str] = "-"

class ProgressUpdate(BaseModel):
    completed_units: int
    total_units: int

class CustomBookSchema(BaseModel):
    subject: str
    level: str
    book_name: str
    duration: float = 0.0

class ProgressCreate(BaseModel):
    student_id: int
    book_ids: List[int] = [] 
    custom_books: List[CustomBookSchema] = []

# ==========================================
# ★修正: 固定パスのエンドポイントを上に移動！
# ==========================================

@router.get("/presets")
def get_presets(session: Session = Depends(get_db)):
    presets = session.query(BulkPreset).options(joinedload(BulkPreset.books)).all()
    all_masters = session.query(MasterTextbook).all()
    master_map = { (m.subject, m.book_name): m for m in all_masters }

    result = []
    for p in presets:
        books_data = []
        for pb in p.books:
            key = (p.subject, pb.book_name)
            master_info = master_map.get(key)
            if master_info:
                books_data.append({"id": master_info.id, "subject": master_info.subject, "level": master_info.level, "book_name": master_info.book_name, "duration": master_info.duration, "is_master": True})
            else:
                books_data.append({"id": None, "subject": p.subject, "level": "プリセット", "book_name": pb.book_name, "duration": 0, "is_master": False})
        result.append({"id": p.id, "name": p.preset_name, "subject": p.subject, "books": books_data})
    return result

@router.get("/books/master")
def get_master_books(session: Session = Depends(get_db)):
    return session.query(MasterTextbook).all()

@router.post("/progress/batch")
def add_progress_batch(data: ProgressCreate, session: Session = Depends(get_db)):
    added_items = []
    added_book_names = [] # 🌟ログ用に名前を集めるリスト

    for book_id in data.book_ids:
        master_book = session.query(MasterTextbook).filter(MasterTextbook.id == book_id).first()
        if not master_book: continue
        exists = session.query(Progress).filter(Progress.student_id == data.student_id, Progress.book_name == master_book.book_name).first()
        if exists: continue
        new_progress = Progress(
            student_id=data.student_id, subject=master_book.subject, level=master_book.level,
            book_name=master_book.book_name, duration=master_book.duration,
            is_planned=True, is_done=False, completed_units=0, total_units=1 
        )
        session.add(new_progress)
        added_items.append(new_progress)
        added_book_names.append(master_book.book_name) # 名前を記録

    for custom in data.custom_books:
        exists = session.query(Progress).filter(Progress.student_id == data.student_id, Progress.book_name == custom.book_name).first()
        if exists: continue
        new_progress = Progress(
            student_id=data.student_id, subject=custom.subject, level=custom.level,
            book_name=custom.book_name, duration=custom.duration,
            is_planned=True, is_done=False, completed_units=0, total_units=1 
        )
        session.add(new_progress)
        added_items.append(new_progress)
        added_book_names.append(custom.book_name) # 名前を記録
    
    # 🌟🌟ここから監査ログの記録処理🌟🌟
    if added_items:
        student = session.query(Student).filter(Student.id == data.student_id).first()
        student_name = student.name if student else f"ID:{data.student_id}"

        details_dict = {
            "student_name": student_name,
            "book_name": " / ".join(added_book_names), # 追加した本をスラッシュ区切りで連結
            "completed": f"新規一括追加（計 {len(added_items)} 冊）"
        }
        
        audit_log = AuditLog(
            user_id=None, 
            action="ADD_PROGRESS_BATCH", # PROGRESSを含めることでフロントのフィルターに引っかかる
            branch_id=None,
            details=json.dumps(details_dict, ensure_ascii=False)
        )
        session.add(audit_log)
    # 🌟🌟ここまで🌟🌟

    session.commit()
    return {"message": f"{len(added_items)} items added"}


# ==========================================
# 変数パス(/{student_id} など)を下に配置
# ==========================================

@router.get("/{student_id}", response_model=DashboardData)
def get_dashboard_data(student_id: int, session: Session = Depends(get_db)):
    student = session.query(Student).filter(Student.id == student_id).first()
    if not student:
        student = session.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_dev = getattr(student, "deviation_value", None)

    progress_items = session.query(Progress).filter(Progress.student_id == student_id).all()
    
    total_completed_time = 0.0
    total_planned_time = 0.0
    weighted_progress_sum = 0.0 
    total_duration_for_rate = 0.0 
    simple_ratios = [] 

    if progress_items:
# その生徒が登録している参考書名だけを抽出
        book_names = list(set([item.book_name for item in progress_items if item.book_name]))
        
        # 必要なマスターデータだけをDBから取得（大幅な高速化）
        masters = session.query(MasterTextbook).filter(MasterTextbook.book_name.in_(book_names)).all()
        master_map = { (m.subject, m.book_name): m for m in masters }

        for item in progress_items:
            duration = item.duration
            book_level = item.level
            
            if (duration is None or duration <= 0) and item.subject and item.book_name:
                master_book = master_map.get((item.subject, item.book_name))
                if master_book:
                    duration = master_book.duration
                    if not book_level:
                        book_level = master_book.level
            
            duration = float(duration or 0)
            
            adjusted_duration = get_adjusted_duration(duration, book_level, student_dev)

            ratio = 0.0
            if (item.total_units or 0) > 0:
                ratio = min(1.0, (item.completed_units or 0) / item.total_units)
            
            simple_ratios.append(ratio)

            if adjusted_duration > 0:
                total_planned_time += adjusted_duration
                total_completed_time += ratio * adjusted_duration
                
                weighted_progress_sum += ratio * adjusted_duration
                total_duration_for_rate += adjusted_duration

    total_progress_pct = 0.0
    if total_duration_for_rate > 0:
        total_progress_pct = (weighted_progress_sum / total_duration_for_rate) * 100
    elif len(simple_ratios) > 0:
        total_progress_pct = (sum(simple_ratios) / len(simple_ratios)) * 100

    latest_eiken = session.query(EikenResult).filter(EikenResult.student_id == student_id).order_by(desc(EikenResult.exam_date)).first()
    eiken_grade = latest_eiken.grade or "未登録" if latest_eiken else "未登録"
    eiken_score = str(latest_eiken.cse_score) if latest_eiken and latest_eiken.cse_score is not None else "-"
    eiken_date = str(latest_eiken.exam_date) if latest_eiken and latest_eiken.exam_date else "-"

    return {
        "student_id": student.id if hasattr(student, 'id') else student_id,
        "total_study_time": round(total_completed_time, 1),
        "total_planned_time": round(total_planned_time, 1),
        "progress_rate": round(total_progress_pct, 1),
        "eiken_grade": eiken_grade,
        "eiken_score": eiken_score,
        "eiken_date": eiken_date
    }


@router.get("/chart/{student_id}")
def get_subject_chart(student_id: int, session: Session = Depends(get_db)):
    student = session.query(Student).filter(Student.id == student_id).first()
    student_dev = getattr(student, "deviation_value", None)

    items = session.query(Progress).filter(Progress.student_id == student_id).all()
    subject_stats = {} 
    
    all_masters = session.query(MasterTextbook).all()
    master_map = { (m.subject, m.book_name): m for m in all_masters }

    for item in items:
        if (item.total_units or 0) <= 0:
            continue

        subj = item.subject or "その他"
        if subj not in subject_stats:
            subject_stats[subj] = {"planned": 0.0, "completed": 0.0, "ratios": []}

        duration = item.duration
        book_level = item.level
        if (duration is None or duration <= 0) and item.subject and item.book_name:
            master_book = master_map.get((item.subject, item.book_name))
            if master_book:
                duration = master_book.duration
                if not book_level:
                    book_level = master_book.level
                    
        duration = float(duration or 0)
        
        adjusted_duration = get_adjusted_duration(duration, book_level, student_dev)

        ratio = min(1.0, (item.completed_units or 0) / item.total_units)
        subject_stats[subj]["ratios"].append(ratio * 100)
        
        if adjusted_duration > 0:
            subject_stats[subj]["planned"] += adjusted_duration
            subject_stats[subj]["completed"] += ratio * adjusted_duration
            
    result = []
    for subj, stats in subject_stats.items():
        if stats["planned"] > 0:
            avg_progress = (stats["completed"] / stats["planned"]) * 100
        elif stats["ratios"]:
            avg_progress = sum(stats["ratios"]) / len(stats["ratios"])
        else:
            avg_progress = 0.0
            
        result.append({
            "subject": subj,
            "progress": round(avg_progress, 1)
        })
        
    return result

@router.get("/list/{student_id}")
def get_progress_list(student_id: int, session: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    items = session.query(Progress).filter(Progress.student_id == student_id).all()
    return [{"id": i.id, "subject": i.subject, "book_name": i.book_name, "completed_units": i.completed_units, "total_units": i.total_units} for i in items]

@router.patch("/progress/{row_id}")
def update_progress(row_id: int, update_data: ProgressUpdate, session: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    progress_item = session.query(Progress).filter(Progress.id == row_id).first()
    if not progress_item: 
        raise HTTPException(status_code=404, detail="Progress item not found")
    
    # ログ用に古い値を保持しておく
    old_completed = progress_item.completed_units or 0
    
    # 進捗の更新
    progress_item.completed_units = update_data.completed_units
    progress_item.total_units = update_data.total_units 
    session.add(progress_item)
    
    # 🌟🌟ここから監査ログの記録処理🌟🌟
    # 誰の進捗か分かりやすくするために生徒の名前を取得
    student = session.query(Student).filter(Student.id == progress_item.student_id).first()
    student_name = student.name if student else f"ID:{progress_item.student_id}"

    # フロントエンドが綺麗にバッジ化できるようにJSON形式で詳細を作る
    details_dict = {
        "student_name": student_name,
        "book_name": progress_item.book_name,
        "completed": f"{old_completed} → {update_data.completed_units} / {update_data.total_units}"
    }
    
    # 監査ログレコードの作成
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE_PROGRESS", # フロントの `includes('PROGRESS')` に引っかかるように！
        branch_id=None,
        details=json.dumps(details_dict, ensure_ascii=False)
    )
    session.add(audit_log)
    # 🌟🌟ここまで🌟🌟

    # 一緒に保存！
    session.commit()
    session.refresh(progress_item)
    return progress_item

@router.delete("/progress/{row_id}")
def delete_progress(row_id: int, session: Session = Depends(get_db)):
    progress_item = session.query(Progress).filter(Progress.id == row_id).first()
    if not progress_item: 
        raise HTTPException(status_code=404, detail="Progress item not found")
    
    # 🌟🌟ここから監査ログの記録処理（削除される前に情報を抜き取る）🌟🌟
    student = session.query(Student).filter(Student.id == progress_item.student_id).first()
    student_name = student.name if student else f"ID:{progress_item.student_id}"

    details_dict = {
        "student_name": student_name,
        "book_name": progress_item.book_name,
        "completed": f"削除時の進捗: {progress_item.completed_units or 0} / {progress_item.total_units}"
    }
    
    audit_log = AuditLog(
        user_id=None,
        action="DELETE_PROGRESS", # PROGRESSを含めることでフィルター対象に
        branch_id=None,
        details=json.dumps(details_dict, ensure_ascii=False)
    )
    session.add(audit_log)
    # 🌟🌟ここまで🌟🌟

    # ログを作った後に、本体を削除してコミット！
    session.delete(progress_item)
    session.commit()
    return {"message": "Deleted successfully"}

@router.get("/admin/study-time-summary")
def get_study_time_summary(
    session: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
    ):
    """
    管理者画面用: 全生徒の学習予定時間と実績時間の乖離をチェックするAPI
    """
    # 1. 退塾済以外の全生徒を取得(管理者の所属している校舎のみ)
    query = session.query(Student).filter(Student.grade != "退塾済")
    if current_user.role == "admin":
        query = query.filter(Student.school == current_user.school)
        
    students = query.all()
    
    # 全ての進捗データとマスターデータを一括で取得（N+1問題回避のため）
    student_ids = [s.id for s in students]
    all_progress = session.query(Progress).filter(Progress.student_id.in_(student_ids)).all()
    
    all_masters = session.query(MasterTextbook).all()
    master_map = { (m.subject, m.book_name): m for m in all_masters }

    summary_list = []

    for student in students:
        # この生徒の進捗データだけを抽出
        my_progress = [p for p in all_progress if p.student_id == student.id]
        
        total_planned = 0.0
        total_actual = 0.0
        student_dev = getattr(student, "deviation_value", None)

        for item in my_progress:
            duration = item.duration
            book_level = item.level
            
            # マスターデータからの補完
            if (duration is None or duration <= 0) and item.subject and item.book_name:
                master_book = master_map.get((item.subject, item.book_name))
                if master_book:
                    duration = master_book.duration
                    if not book_level:
                        book_level = master_book.level
            
            duration = float(duration or 0.0)
            
            # 偏差値による傾斜計算（ダッシュボードと同じロジック）
            adjusted_duration = get_adjusted_duration(duration, book_level, student_dev)

            # 進捗率の計算
            ratio = 0.0
            if (item.total_units or 0) > 0:
                ratio = min(1.0, (item.completed_units or 0) / item.total_units)

            if adjusted_duration > 0:
                total_planned += adjusted_duration
                total_actual += ratio * adjusted_duration

        # 差分の計算（実績 - 予定）
        diff = total_actual - total_planned

        summary_list.append({
            "student_id": student.id,
            "name": student.name,
            "grade": student.grade or "未設定",
            "planned_time": round(total_planned, 1),
            "actual_time": round(total_actual, 1),
            "diff": round(diff, 1)
        })

    # 差分の絶対値が大きい順（つまり違和感が大きい順）に並び替えて返す
    summary_list.sort(key=lambda x: abs(x["diff"]), reverse=True)
    
    return summary_list

@router.get("/admin/inactive-users")
def get_inactive_users(session: Session = Depends(get_db)):
    """
    管理者用: 1ヶ月間(30日)進捗を更新していない講師(User)を抽出するAPI
    """
    # 30日前の日時を計算
    threshold_date = datetime.now() - timedelta(days=30)
    
    # ユーザー一覧を取得（※もしUserモデルに role などの権限カラムがあり、
    # 管理者をアラートから除外したい場合は filter(User.role != 'admin') などを足してください）
    users = session.query(User).all()
    
    inactive_users = []
    
    for u in users:
        # このユーザーが実行した最新の「進捗関連の操作」ログを取得
        # action名が "UPDATE_PROGRESS", "ADD_PROGRESS_BATCH" などPROGRESSを含むものを検索
        last_log = session.query(AuditLog).filter(
            AuditLog.user_id == u.id,
            AuditLog.action.like("%PROGRESS%")
        ).order_by(desc(AuditLog.id)).first()  # ID降順で最新のログを取得
        
        user_name = getattr(u, 'username', getattr(u, 'name', f"ユーザー{u.id}"))
        
        if last_log:
            # AuditLogモデルに作成日時のカラム（created_at等）があることを想定
            last_date = getattr(last_log, 'created_at', None)
            
            if last_date and last_date < threshold_date:
                days_inactive = (datetime.now() - last_date).days
                inactive_users.append({
                    "user_id": u.id,
                    "name": user_name,
                    "last_update": last_date.strftime("%Y-%m-%d"),
                    "days_inactive": days_inactive
                })
        else:
            # ログが1件もない（一度も進捗更新をしたことがない）場合
            inactive_users.append({
                "user_id": u.id,
                "name": user_name,
                "last_update": "記録なし",
                "days_inactive": "30+"
            })
            
    # 放置日数が多い順に並び替え（「記録なし(30+)」を一番上にする）
    inactive_users.sort(
        key=lambda x: 9999 if str(x["days_inactive"]) == "30+" else int(x["days_inactive"]), 
        reverse=True
    )
    
    return inactive_users