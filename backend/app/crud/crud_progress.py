# backend/app/crud/crud_progress.py
import json
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List, Any
from datetime import timedelta, datetime, timezone
from app.models.models import Progress, MasterTextbook, Student, AuditLog, EikenResult, User, TenantSetting, RouteLevel
from app.schemas.schemas import ProgressBatchCreate, ProgressUpdate
from app.utils.calculator import calculate_duration  

def get_progress_list_by_student(db: Session, student_id: int):
    """生徒の進捗一覧を取得（GET /list/{student_id} 用）"""
    return db.query(Progress).filter(Progress.student_id == student_id).all()

def add_progress_batch(db: Session, data: ProgressBatchCreate):
    """進捗の一括追加と監査ログ記録（POST /progress/batch 用）"""
    added_items = []
    added_book_names = []

    # マスターテキストからの追加
    for book_id in data.book_ids:
        master_book = db.query(MasterTextbook).filter(MasterTextbook.id == book_id).first()
        if not master_book: continue
        exists = db.query(Progress).filter(Progress.student_id == data.student_id, Progress.book_name == master_book.book_name).first()
        if exists: continue
        new_progress = Progress(
            student_id=data.student_id, subject=master_book.subject, level=master_book.level,
            book_name=master_book.book_name, duration=master_book.duration,
            is_planned=True, is_done=False, completed_units=0, total_units=1 
        )
        db.add(new_progress)
        added_items.append(new_progress)
        added_book_names.append(master_book.book_name)

    # カスタムテキストの追加
    for custom in data.custom_books:
        exists = db.query(Progress).filter(Progress.student_id == data.student_id, Progress.book_name == custom.book_name).first()
        if exists: continue
        new_progress = Progress(
            student_id=data.student_id, subject=custom.subject, level=custom.level,
            book_name=custom.book_name, duration=custom.duration,
            is_planned=True, is_done=False, completed_units=0, total_units=1 
        )
        db.add(new_progress)
        added_items.append(new_progress)
        added_book_names.append(custom.book_name)
    
    # 🌟 監査ログの記録
    if added_items:
        student = db.query(Student).filter(Student.id == data.student_id).first()
        student_name = student.name if student else f"ID:{data.student_id}"

        details_dict = {
            "student_name": student_name,
            "book_name": " / ".join(added_book_names),
            "completed": f"新規一括追加（計 {len(added_items)} 冊）"
        }
        
        audit_log = AuditLog(
            user_id=None, # バッチ処理の起因ユーザーが必要なら引数で受け取るよう要改修
            action="ADD_PROGRESS_BATCH",
            branch_id=None,
            details=json.dumps(details_dict, ensure_ascii=False)
        )
        db.add(audit_log)

    db.commit()
    return added_items

def update_progress(db: Session, student_id: int, updates: List[ProgressUpdate], current_user_id: int):
    """
    進捗の一括更新と監査ログ記録（POST /{student_id}/progress 用）
    フロントエンドから送られてくる配列（List[ProgressUpdate]）をループして一気に保存します。
    """
    # 🌟 ログ記録用に生徒の名前を1回だけ取得しておく（高速化）
    student = db.query(Student).filter(Student.id == student_id).first()
    student_name = student.name if student else f"ID:{student_id}"

    updated_count = 0

    for update_data in updates:
        # 1. データの特定（送られてきた progress の id を使って検索）
        # ※ update_data に id が含まれている前提です
        row_id = getattr(update_data, 'id', None)
        if not row_id:
            continue # IDがないデータはスキップ
            
        progress_item = db.query(Progress).filter(
            Progress.id == row_id,
            Progress.student_id == student_id # セキュリティ: 他人の進捗を書き換えないかチェック
        ).first()
        
        if not progress_item: 
            continue
        
        old_completed = progress_item.completed_units or 0
        
        # 変更がない場合はスキップして処理を軽くする
        if old_completed == update_data.completed_units and progress_item.total_units == update_data.total_units:
            continue

        # 2. データの更新
        progress_item.completed_units = update_data.completed_units
        progress_item.total_units = update_data.total_units 
        db.add(progress_item)
        
        # 3. 監査ログの記録
        details_dict = {
            "student_name": student_name,
            "book_name": progress_item.book_name,
            "completed": f"{old_completed} → {update_data.completed_units} / {update_data.total_units}"
        }
        
        audit_log = AuditLog(
            user_id=current_user_id,
            action="UPDATE_PROGRESS",
            branch_id=None,
            details=json.dumps(details_dict, ensure_ascii=False)
        )
        db.add(audit_log)
        
        updated_count += 1

    # 🌟 全てのループが終わった後に、1回だけまとめてDBに保存（超高速！）
    db.commit()
    
    return updated_count

def delete_progress(db: Session, row_id: int):
    """進捗の削除と監査ログ記録（DELETE /progress/{row_id} 用）"""
    progress_item = db.query(Progress).filter(Progress.id == row_id).first()
    if not progress_item: 
        return False
    
    # 🌟 監査ログの記録
    student = db.query(Student).filter(Student.id == progress_item.student_id).first()
    student_name = student.name if student else f"ID:{progress_item.student_id}"

    details_dict = {
        "student_name": student_name,
        "book_name": progress_item.book_name,
        "completed": f"削除時の進捗: {progress_item.completed_units or 0} / {progress_item.total_units}"
    }
    
    audit_log = AuditLog(
        user_id=None,
        action="DELETE_PROGRESS",
        branch_id=None,
        details=json.dumps(details_dict, ensure_ascii=False)
    )
    db.add(audit_log)
    db.delete(progress_item)
    db.commit()
    return True

def get_adjusted_duration(db: Session, student: Any, base_duration: float, book_level: str) -> float:
    """
    テナントのカスタム数式を用いた学習時間の調整ロジック
    """
    if not base_duration or not book_level or getattr(student, "deviation_value", None) is None:
        return float(base_duration or 0.0)

    # 🌟 修正: Studentモデルには直接 tenant_id がないため、school経由で安全に取得する
    tenant_id = getattr(student, 'tenant_id', None)
    
    # tenant_id が直接取れない場合（Studentモデルの場合）は校舎IDから逆引きする
    if not tenant_id and getattr(student, 'school_id', None):
        from app.models.models import School # 循環参照防止のためここでインポート
        school = db.query(School).filter(School.id == student.school_id).first()
        tenant_id = school.tenant_id if school else None

    # それでもテナントIDが特定できない場合は安全のため計算せずに返す
    if not tenant_id:
        return float(base_duration)

    # 取得した tenant_id を使って設定を読み込む
    setting = db.query(TenantSetting).filter(TenantSetting.tenant_id == tenant_id).first()
    formula = str(setting.duration_slope_formula) if setting else "1.0 * x + 0.0 * y"

    level_setting = db.query(RouteLevel).filter(
        RouteLevel.tenant_id == tenant_id,
        RouteLevel.level_name == book_level
    ).first()
    
    y_val = float(level_setting.sequence_order) if level_setting else 0.0
    x_val = float(student.deviation_value)  # type: ignore
    t_val = float(base_duration)

    try:
        calculated_time = calculate_duration(formula_str=formula, x=x_val, y=y_val, t=t_val)
        return max(0.1, round(calculated_time, 1))
    except Exception as e:
        print(f"Duration calculation error: {e}")
        return float(base_duration)

def get_dashboard_summary(db: Session, student_id: int):
    """ダッシュボードのメイン集計処理"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        student = db.query(User).filter(User.id == student_id).first()
    if not student:
        return None # 見つからない場合はNoneを返し、Router側でエラーを出す

    student_dev = getattr(student, "deviation_value", None)
    progress_items = db.query(Progress).filter(Progress.student_id == student_id).all()
    
    total_completed_time = 0.0
    total_planned_time = 0.0
    weighted_progress_sum = 0.0 
    total_duration_for_rate = 0.0 
    simple_ratios = [] 

    if progress_items:
        book_names = list(set([item.book_name for item in progress_items if item.book_name]))
        masters = db.query(MasterTextbook).filter(MasterTextbook.book_name.in_(book_names)).all()
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
            adjusted_duration = get_adjusted_duration(db, student, float(duration or 0.0), book_level)

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

    latest_eiken = db.query(EikenResult).filter(EikenResult.student_id == student_id).order_by(desc(EikenResult.exam_date)).first()
    
    return {
        "student_id": student.id if hasattr(student, 'id') else student_id,
        "total_study_time": round(total_completed_time, 1),
        "total_planned_time": round(total_planned_time, 1),
        "progress_rate": round(total_progress_pct, 1),
        "eiken_grade": latest_eiken.grade or "未登録" if latest_eiken else "未登録",
        "eiken_score": str(latest_eiken.cse_score) if latest_eiken and latest_eiken.cse_score is not None else "-",
        "eiken_date": str(latest_eiken.exam_date) if latest_eiken and latest_eiken.exam_date else "-"
    }

def get_subject_chart_data(db: Session, student_id: int):
    """科目別進捗チャートのデータ生成"""
    student = db.query(Student).filter(Student.id == student_id).first()
    student_dev = getattr(student, "deviation_value", None)
    items = db.query(Progress).filter(Progress.student_id == student_id).all()
    subject_stats = {} 
    
    all_masters = db.query(MasterTextbook).all()
    master_map = { (m.subject, m.book_name): m for m in all_masters }

    for item in items:
        if (item.total_units or 0) <= 0: continue

        subj = item.subject or "その他"
        if subj not in subject_stats:
            subject_stats[subj] = {"planned": 0.0, "completed": 0.0, "ratios": []}

        duration = getattr(item, "duration", None)
        book_level = getattr(item, "level", None) or ""
        if (duration is None or duration <= 0) and item.subject and item.book_name:
            master_book = master_map.get((item.subject, item.book_name))
            if master_book:
                duration = getattr(master_book, "duration", None)
                if not book_level: book_level = getattr(master_book, "level", None) or ""
                    
        duration = float(duration or 0) 
        adjusted_duration = get_adjusted_duration(db, student, float(duration), book_level)
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
        result.append({"subject": subj, "progress": round(avg_progress, 1)})
        
    return result

def get_study_time_summary(db: Session, current_user: User):
    """管理者画面用: 学習予定時間と実績時間の乖離集計"""
    query = db.query(Student).filter(Student.grade != "退塾済")
    if current_user.role == "admin":
        query = query.filter(Student.school == current_user.school)
        
    students = query.all()
    student_ids = [s.id for s in students]
    all_progress = db.query(Progress).filter(Progress.student_id.in_(student_ids)).all()
    all_masters = db.query(MasterTextbook).all()
    master_map = { (m.subject, m.book_name): m for m in all_masters }

    summary_list = []
    for student in students:
        my_progress = [p for p in all_progress if p.student_id == student.id]
        total_planned = 0.0
        total_actual = 0.0
        student_dev = getattr(student, "deviation_value", None)

        for item in my_progress:
            duration = getattr(item, "duration", None) or 0
            book_level = getattr(item, "level", None) or ""
            
            if (duration is None or duration <= 0) and item.subject and item.book_name:
                master_book = master_map.get((item.subject, item.book_name))
                if master_book:
                    duration = getattr(master_book, "duration", None) or 0
                    if not book_level: book_level = getattr(master_book, "level", None) or ""
            
            duration = float(duration or 0.0)
            adjusted_duration = get_adjusted_duration(db, student, float(duration), book_level)
            ratio = 0.0
            if (item.total_units or 0) > 0:
                ratio = min(1.0, (item.completed_units or 0) / item.total_units)

            if adjusted_duration > 0:
                total_planned += adjusted_duration
                total_actual += ratio * adjusted_duration

        diff = total_actual - total_planned
        summary_list.append({
            "student_id": student.id, "name": student.name, "grade": student.grade or "未設定",
            "planned_time": round(total_planned, 1), "actual_time": round(total_actual, 1),
            "diff": round(diff, 1)
        })

    summary_list.sort(key=lambda x: abs(x["diff"]), reverse=True)
    return summary_list

def get_inactive_users(db: Session, current_user: User):
    """管理者用: 進捗未更新ユーザー抽出"""
    now_utc = datetime.now(timezone.utc)
    threshold_date = datetime.now() - timedelta(days=30)
    query = db.query(User).filter(User.role != 'student')
    
    if current_user.role != 'developer':
        query = query.filter(User.school_id == current_user.school_id)
        
    users = query.all()
    inactive_users = []
    
    for u in users:
        last_log = db.query(AuditLog).filter(
            AuditLog.user_id == u.id,
            AuditLog.action.like("%PROGRESS%")
        ).order_by(desc(AuditLog.id)).first()
        
        user_name = getattr(u, 'username', getattr(u, 'name', f"ユーザー{u.id}"))
        
        if last_log:
            last_date = getattr(last_log, 'created_at', None)
            if last_date and last_date < threshold_date:
                days_inactive = (datetime.now() - last_date).days
                inactive_users.append({
                    "user_id": u.id, "name": user_name,
                    "last_update": last_date.strftime("%Y-%m-%d"), "days_inactive": days_inactive
                })
        else:
            inactive_users.append({
                "user_id": u.id, "name": user_name,
                "last_update": "記録なし", "days_inactive": "30+"
            })
            
    inactive_users.sort(key=lambda x: 9999 if str(x["days_inactive"]) == "30+" else int(x["days_inactive"]), reverse=True)
    return inactive_users