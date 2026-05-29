from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.crud import crud_applications
from app.schemas import schemas
from app.routers.deps import get_current_user
from app.models import models

# 🌟 1. さっき作った共通のLINE送信関数をインポート！
from app.utils.line import send_line_message

router = APIRouter()

def get_student_id_for_user(db: Session, current_user: models.User) -> int:
    """Helper to get student_id if user is a student, or raise 403."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized as a student")
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Associated student record not found")
    return student.id

# --- Transfer Request Endpoints ---

@router.post("/transfer", response_model=schemas.TransferRequestResponse)
def create_transfer_request(
    request: schemas.TransferRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student_id = get_student_id_for_user(db, current_user)
    
    # まずはDBに保存 (※ここで CRUD 側が自動的に担当講師を探して new_request.instructor_id に入れてくれます)
    new_request = crud_applications.create_transfer_request(db, request, current_user, student_id)
    
    # 🌟 1. 生徒の名前を user_id から User テーブルを検索して取得
    student_record = db.query(models.Student).filter(models.Student.id == student_id).first()
    student_name = student_record.name if student_record else current_user.username

    # 🌟 2. 担当講師名を取得 (CRUDでセットされた instructor_id から逆引き)
    instructor_name = "未設定"
    if new_request and new_request.instructor_id:
        instructor_user = db.query(models.User).filter(models.User.id == new_request.instructor_id).first()
        if instructor_user:
            instructor_name = instructor_user.username

    # 🌟 3. LINE通知文面を作成して送信
    if new_request:
        line_text = (
            "🔄【振替申請が届きました】\n"
            f"👤 生徒: {student_name}\n"
            f"👨‍🏫 担当講師: {instructor_name}\n"
            f"❌ 対象日: {request.original_date}\n"
            f"⭕ 振替希望: {request.candidate_dates}\n"
            f"📝 理由: {request.reason or '特になし'}\n"
            "----------------------------\n"
            "ダッシュボードから内容を確認してください。"
        )
        send_line_message(line_text)
        
    return new_request

# 🌟 2. 振替一覧APIの引数を Query(None) に変更
@router.get("/transfer", response_model=List[schemas.TransferRequestResponse])
def get_transfer_requests(
    start_date: str = Query(None), 
    end_date: str = Query(None), 
    status: str = Query(None),          # 👈 明示的に Query(None) にする
    student_id: int = Query(None),      
    instructor_id: int = Query(None),   
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "student":
        student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
        s_id = student.id if student else -1
        return crud_applications.get_transfer_requests(db, current_user, student_id=s_id, start_date=start_date, end_date=end_date, status=status, instructor_id=instructor_id)
    else:
        return crud_applications.get_transfer_requests(db, current_user, student_id=student_id, start_date=start_date, end_date=end_date, status=status, instructor_id=instructor_id)

@router.patch("/transfer/{request_id}/status", response_model=schemas.TransferRequestResponse)
def update_transfer_status(
    request_id: int,
    update_data: schemas.TransferRequestUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "student":
        raise HTTPException(status_code=403, detail="Not authorized to update status")
    
    updated = crud_applications.update_transfer_status(db, request_id, update_data, current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    return updated

# --- Absence Report Endpoints ---

@router.post("/absence", response_model=schemas.AbsenceReportResponse)
def create_absence_report(
    report: schemas.AbsenceReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student_id = get_student_id_for_user(db, current_user)
    new_report = crud_applications.create_absence_report(db, report, current_user, student_id)
    
    # 生徒名を取得
    student_record = db.query(models.Student).filter(models.Student.id == student_id).first()
    student_name = student_record.name if student_record else current_user.username
    
    # 🌟 担当講師名を取得 (CRUDでセットされた instructor_id から逆引き)
    instructor_name = "未設定"
    if new_report and new_report.instructor_id:
        instructor_user = db.query(models.User).filter(models.User.id == new_report.instructor_id).first()
        if instructor_user:
            instructor_name = instructor_user.username

    if new_report:
        line_text = (
            "🚨【欠席報告が届きました】\n"
            f"👤 生徒: {student_name}\n"
            f"👨‍🏫 担当講師: {instructor_name}\n"
            f"📅 欠席日: {report.absence_date}\n"
            f"📝 理由: {report.reason}\n"
            "----------------------------\n"
            "ダッシュボードから内容を確認してください。"
        )
        send_line_message(line_text)
        
    return new_report

@router.get("/absence", response_model=List[schemas.AbsenceReportResponse])
def get_absence_reports(
    start_date: str = Query(None), 
    end_date: str = Query(None), 
    status: str = Query(None),          
    student_id: int = Query(None),      
    instructor_id: int = Query(None),   
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "student":
        student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
        s_id = student.id if student else -1
        return crud_applications.get_absence_reports(db, current_user, student_id=s_id, start_date=start_date, end_date=end_date, status=status, instructor_id=instructor_id)
    else:
        return crud_applications.get_absence_reports(db, current_user, student_id=student_id, start_date=start_date, end_date=end_date, status=status, instructor_id=instructor_id)

@router.patch("/absence/{report_id}/status", response_model=schemas.AbsenceReportResponse)
def update_absence_status(
    report_id: int,
    update_data: schemas.AbsenceReportUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "student":
        raise HTTPException(status_code=403, detail="Not authorized to update status")
        
    updated = crud_applications.update_absence_status(db, report_id, update_data.status, current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Absence report not found")
    return updated

# --- Delete Endpoints (削除機能) ---

@router.delete("/transfer/{request_id}", status_code=204)
def delete_transfer_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 生徒は削除不可
    if current_user.role == "student":
        raise HTTPException(status_code=403, detail="Not authorized to delete requests")
    
    # 対象の振替申請を検索（※モデル名が違う場合は models.Transfer に変更してください）
    transfer = db.query(models.TransferRequest).filter(models.TransferRequest.id == request_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    
    db.delete(transfer)
    db.commit()
    return None

@router.delete("/absence/{report_id}", status_code=204)
def delete_absence_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 生徒は削除不可
    if current_user.role == "student":
        raise HTTPException(status_code=403, detail="Not authorized to delete reports")
    
    # 対象の欠席申請を検索（※モデル名が違う場合は models.Absence に変更してください）
    absence = db.query(models.AbsenceReport).filter(models.AbsenceReport.id == report_id).first()
    if not absence:
        raise HTTPException(status_code=404, detail="Absence report not found")
    
    db.delete(absence)
    db.commit()
    return None

@router.get("/pending-count")
def get_pending_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 生徒自身には未承認バッジは不要なので 0 を返す
    if current_user.role == "student":
        return {"count": 0}
        
    # 欠席と振替の pending をカウント
    a_query = db.query(models.AbsenceReport).filter(models.AbsenceReport.status == "pending")
    t_query = db.query(models.TransferRequest).filter(models.TransferRequest.status == "pending")
    
    # 🌟 開発者以外は、自分の校舎（テナント）の申請のみに絞り込む
    if current_user.role != "developer":
        a_query = a_query.filter(models.AbsenceReport.tenant_id == current_user.tenant_id)
        t_query = t_query.filter(models.TransferRequest.tenant_id == current_user.tenant_id)

    return {"count": a_query.count() + t_query.count()}