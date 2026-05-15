from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx
import asyncio
from datetime import datetime, timezone, timedelta
import time  # 🚨 追加：時間を計るツール
from app.models import models
from app.db.database import get_db
from app.routers.deps import get_current_user
from app.services.attendance_sync import sync_google_sheets_to_db

router = APIRouter()

# GASのURL
GAS_URL = "https://script.google.com/macros/s/AKfycbxKlWTOAaTJtmOflZsEVjLssdyQ2haOWwD686Omq-13M5SRSszkvyRtGiTuLhG2Fzd-/exec"
JST = timezone(timedelta(hours=9), "JST")

# 🚨 追加：キャッシュ（一時記憶）用の変数
# 60秒間は同じデータを使い回す設定にします
CACHE_TTL = 60 
cache_store = {"data": None, "timestamp": 0}

class CompleteTransferRequest(BaseModel):
    rowNumber: int
    name: str

def parse_gas_date(date_str: str):
    if not date_str: return None
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.astimezone(JST)
    except Exception:
        return None

def get_current_academic_year_range():
    now = datetime.now(JST)
    current_year = now.year
    if now.month < 3:
        target_year = current_year - 1
    else:
        target_year = current_year
    start_dt = datetime(target_year, 3, 1, 0, 0, 0, tzinfo=JST)
    end_dt = datetime(target_year + 1, 3, 1, 0, 0, 0, tzinfo=JST)
    return start_dt, end_dt

@router.get("/transfers")
async def get_transfers(
    force_refresh: bool = Query(False),
    db: Session = Depends(get_db) # 🚨 DBを使えるようにする
):
    """データベースから振替・欠席データを取得（爆速0.01秒！）"""
    
    # 🚨 フロントエンドで「最新を読み込む」ボタンが押された時だけ、手動で同期を走らせる
    if force_refresh:
        try:
            sync_google_sheets_to_db()
        except Exception as e:
            raise HTTPException(status_code=500, detail="スプレッドシートの同期に失敗しました")

    start_dt, end_dt = get_current_academic_year_range()
    
    # ==========================================
    # 1. 振替データの処理（未完了のみ取得）
    # ==========================================
    db_transfers = db.query(models.TransferRequest).filter(
        models.TransferRequest.is_completed == False
    ).all()

    pending_transfers = []
    remaining_counts_dict = {}

    for t in db_transfers:
        # タイムスタンプで今年度か判定
        dt_jst = parse_gas_date(t.timestamp)
        if dt_jst and not (start_dt <= dt_jst < end_dt): continue

        orig_dt_jst = parse_gas_date(t.original_date)
        orig_date_str = orig_dt_jst.strftime("%Y/%m/%d") if orig_dt_jst else t.original_date

        row_dict = {
            "rowNumber": t.row_number,
            "timestamp": dt_jst.strftime("%Y/%m/%d %H:%M") if dt_jst else t.timestamp,
            "name": t.name,
            "instructor": t.instructor,
            "originalDate": orig_date_str,
            "candidateDates": t.candidate_dates,
            "reason": t.reason,
        }
        pending_transfers.append(row_dict)
        
        # 残数カウント
        if t.name:
            remaining_counts_dict[t.name] = remaining_counts_dict.get(t.name, 0) + 1

    # 新しい順にソート
    pending_transfers.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    # ==========================================
    # 2. 欠席データの処理
    # ==========================================
    db_absences = db.query(models.AbsenceReport).all()
    
    recent_absences = []
    absence_counts_dict = {}

    for a in db_absences:
        dt_jst = parse_gas_date(a.timestamp)
        # 今年度のデータのみ対象
        if dt_jst and (start_dt <= dt_jst < end_dt):
            if a.name:
                absence_counts_dict[a.name] = absence_counts_dict.get(a.name, 0) + 1
            
            row_dict = {
                "rowNumber": a.row_number,
                "timestamp": dt_jst.strftime("%Y/%m/%d %H:%M"),
                "name": a.name,
                "instructor": a.instructor,
                "dayOfWeek": a.day_of_week,
                "reason": a.reason,
                "reportInfo": a.report_info
            }
            recent_absences.append(row_dict)

    # 新しい順にソート
    recent_absences.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    # ==========================================
    # 3. データの結合と返却
    # ==========================================
    return {
        "pending_transfers": pending_transfers,
        "remaining_counts": [{"name": k, "count": v} for k, v in remaining_counts_dict.items()],
        "absence_counts": [{"name": k, "count": v} for k, v in absence_counts_dict.items()],
        "recent_absences": recent_absences
    }

@router.post("/transfers/complete")
async def complete_transfer(req: CompleteTransferRequest):
    """振替完了の書き込み"""
    async with httpx.AsyncClient() as client:
        try:
            payload = {"rowNumber": req.rowNumber, "name": req.name}
            response = await client.post(GAS_URL, json=payload, follow_redirects=True)
            response.raise_for_status()
            result = response.json()
            
            if not result.get("success"):
                raise HTTPException(status_code=400, detail=result.get("error", "スプレッドシートの更新に失敗しました"))
                
            return {"message": "振替を完了にしました"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"スプレッドシートへの書き込みに失敗しました: {str(e)}")

# WebhookでGASから送られてくるデータの形を定義
class WebhookPayload(BaseModel):
    type: str  # "transfer" (振替) または "absence" (欠席)
    student_name: str
    instructor_name: str
    message: str

@router.post("/webhook")
async def receive_webhook(payload: WebhookPayload, db: Session = Depends(get_db)):
    """GASからリアルタイム通知を受け取り、対象者のDBに保存する"""
    
    target_users = []
    
    # 1. 担当講師（usernameが一致するユーザー）を探す
    instructor = db.query(models.User).filter(models.User.username == payload.instructor_name).first()
    if instructor:
        target_users.append(instructor)
        
    # 2. 全ての管理者(admin)を探す
    admins = db.query(models.User).filter(models.User.role == "admin").all()
    for admin in admins:
        # もし担当講師自身がadminだった場合、通知が2重にならないようにスキップ
        if instructor and admin.id == instructor.id:
            continue
        target_users.append(admin)
        
    # 3. DBに通知（Notification）を作成して保存
    title = "🔄 新規の振替申請" if payload.type == "transfer" else "❌ 新規の欠席連絡"
    
    for user in target_users:
        new_notif = models.Notification(
            user_id=user.id,
            title=title,
            message=payload.message
        )
        db.add(new_notif)
        
    db.commit() # DBに変更を確定させる
    
    return {"status": "success", "notified_users": len(target_users)}

@router.get("/notifications/unread")
async def get_unread_notifications(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """ログイン中のユーザー宛ての「未読」通知を取得する"""
    notifs = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).all()
    
    return notifs

@router.post("/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """通知を「既読」にする"""
    notif = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if notif:
        notif.is_read = True
        db.commit()
        
    return {"status": "success"}

@router.get("/my-students")
async def get_my_students_attendance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """ログイン中の講師が担当する生徒の振替・欠席データを取得"""
    
    # 1. 担当している生徒の名前リストを取得
    my_student_records = db.query(models.Student.name).join(
        models.StudentInstructor, models.Student.id == models.StudentInstructor.student_id
    ).filter(
        models.StudentInstructor.user_id == current_user.id
    ).all()
    
    my_student_names = [record[0] for record in my_student_records]
    
    if not my_student_names:
        return {"transfers": [], "absences": []}

    # 2. 担当生徒の未完了振替申請を取得
    my_transfers = db.query(models.TransferRequest).filter(
        models.TransferRequest.name.in_(my_student_names),
        models.TransferRequest.is_completed == False
    ).order_by(models.TransferRequest.id.desc()).all()

    # 3. 担当生徒の欠席連絡を取得
    my_absences = db.query(models.AbsenceReport).filter(
        models.AbsenceReport.name.in_(my_student_names)
    ).order_by(models.AbsenceReport.id.desc()).all()

    return {
        "transfers": my_transfers,
        "absences": my_absences
    }