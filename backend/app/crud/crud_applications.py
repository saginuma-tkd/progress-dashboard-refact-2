# backend/app/crud/crud_applications.py

from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
from app.routers import deps

def _resolve_tenant_id(db: Session, student_id: int, current_user: models.User) -> int:
    """student_id の school から Tenant を解決して tenant_id を返す。見つからなければ 1 を返す。"""
    # まず User に tenant_id 属性があれば使用
    if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
        return current_user.tenant_id
    # Student の school から Tenant を解決
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if student:
        tenant = db.query(models.Tenant).filter(models.Tenant.name == student.school).first()
        if tenant:
            return tenant.id
    return 1  # フォールバック

# --- TransferRequest CRUD ---

def create_transfer_request(db: Session, request: schemas.TransferRequestCreate, current_user: models.User, student_id: int):
    # 🌟 修正: 直接 current_user.tenant_id を使うと空(None)になることがあるので、上の関数を使う
    tenant_id = _resolve_tenant_id(db, student_id, current_user)

    new_req = models.TransferRequest(
        tenant_id=tenant_id,  # 👈 解決したIDを使う！
        student_id=student_id,
        instructor_id=request.instructor_id, # 👈 追加: 担当講師
        original_date=request.original_date,
        candidate_dates=request.candidate_dates,
        reason=request.reason,
        status="pending"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req

def get_transfer_requests(db: Session, current_user: models.User, student_id: int = None):
    # tenant_id がない場合はフィルタなしで全件取得（生徒のschoolで絞る）
    if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
        query = deps.get_tenant_query(db, models.TransferRequest, current_user)
    else:
        query = db.query(models.TransferRequest)
    if student_id:
        query = query.filter(models.TransferRequest.student_id == student_id)
    return query.order_by(models.TransferRequest.created_at.desc()).all()

def update_transfer_status(db: Session, request_id: int, status: str, current_user: models.User):
    if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
        db_request = deps.get_tenant_query(db, models.TransferRequest, current_user).filter(models.TransferRequest.id == request_id).first()
    else:
        db_request = db.query(models.TransferRequest).filter(models.TransferRequest.id == request_id).first()
    if db_request:
        db_request.status = status
        db.commit()
        db.refresh(db_request)
    return db_request

# --- AbsenceReport CRUD ---

def create_absence_report(db: Session, request: schemas.AbsenceReportCreate, current_user: models.User, student_id: int):
    # 🌟 修正: 同様に解決したIDを使う
    tenant_id = _resolve_tenant_id(db, student_id, current_user)

    new_rep = models.AbsenceReport(
        tenant_id=tenant_id,  # 👈 解決したIDを使う！
        student_id=student_id,
        instructor_id=request.instructor_id, # 👈 追加: 担当講師
        absence_date=request.absence_date,   # 👈 変更: day_of_week から変更
        reason=request.reason,
        report_info=request.report_info,     # 👈 追加: レポート進捗
        status="acknowledged"
    )
    db.add(new_rep)
    db.commit()
    db.refresh(new_rep)
    return new_rep

def get_absence_reports(db: Session, current_user: models.User, student_id: int = None):
    if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
        query = deps.get_tenant_query(db, models.AbsenceReport, current_user)
    else:
        query = db.query(models.AbsenceReport)
    if student_id:
        query = query.filter(models.AbsenceReport.student_id == student_id)
    return query.order_by(models.AbsenceReport.created_at.desc()).all()

def update_absence_status(db: Session, report_id: int, status: str, current_user: models.User):
    if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
        db_report = deps.get_tenant_query(db, models.AbsenceReport, current_user).filter(models.AbsenceReport.id == report_id).first()
    else:
        db_report = db.query(models.AbsenceReport).filter(models.AbsenceReport.id == report_id).first()
    if db_report:
        db_report.status = status
        db.commit()
        db.refresh(db_report)
    return db_report