from typing import List
from fastapi import APIRouter, Depends, HTTPException
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
    # まずは通常通りDBに保存
    new_request = crud_applications.create_transfer_request(db, request, current_user, student_id)
    
    # 🌟 2. 振替申請用のLINE通知文面を作成して送信！
    if new_request:
        line_text = (
            "🔄【振替申請が届きました】\n"
            f"生徒: {current_user.username}\n"
            f"対象日: {request.original_date}\n"
            f"振替希望日: {request.candidate_dates}\n"
            f"理由: {request.reason or '特になし'}\n"
            "塾長・講師の皆様、確認と承認をお願いします！"
        )
        send_line_message(line_text)
        
    return new_request

@router.get("/transfer", response_model=List[schemas.TransferRequestResponse])
def get_transfer_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "student":
        student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
        student_id = student.id if student else -1
        return crud_applications.get_transfer_requests(db, current_user, student_id=student_id)
    else:
        return crud_applications.get_transfer_requests(db, current_user)

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
    # まずは通常通りDBに保存
    new_report = crud_applications.create_absence_report(db, report, current_user, student_id)
    
    # 🌟 3. 欠席報告用のLINE通知文面を作成して送信！
    if new_report:
        line_text = (
            "🚨【欠席報告が届きました】\n"
            f"生徒: {current_user.username}\n"
            f"欠席日: {report.absence_date}\n"
            f"理由: {report.reason}\n"
            "ダッシュボードから確認と振替調整をお願いします！"
        )
        send_line_message(line_text)
        
    return new_report

@router.get("/absence", response_model=List[schemas.AbsenceReportResponse])
def get_absence_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "student":
        student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
        student_id = student.id if student else -1
        return crud_applications.get_absence_reports(db, current_user, student_id=student_id)
    else:
        return crud_applications.get_absence_reports(db, current_user)

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

# 🪓 テスト用だった @router.post("/webhook/line") や WebhookHandler 関連は綺麗に削除しました！