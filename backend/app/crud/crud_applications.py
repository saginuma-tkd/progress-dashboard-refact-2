# backend/app/crud/crud_applications.py

from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
from app.routers import deps
from typing import Optional

def _resolve_tenant_id(db: Session, student_id: int, current_user: models.User) -> int:
    """student_id の school から Tenant を解決して tenant_id を返す。見つからなければ 1 を返す。"""
    user_tenant_id = getattr(current_user, 'tenant_id', None)
    if user_tenant_id:
        return int(user_tenant_id)  # 念押しで int() にして返す！
    # Student の school から Tenant を解決
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if student:
        tenant = db.query(models.Tenant).filter(models.Tenant.name == student.school).first()
        if tenant:
            t_id = getattr(tenant, 'id', None)
            if t_id:
                return int(t_id)
    return 1  # フォールバック

# --- TransferRequest CRUD ---

def create_transfer_request(db: Session, request: schemas.TransferRequestCreate, current_user: models.User, student_id: int):
    tenant_id = _resolve_tenant_id(db, student_id, current_user)

    # 🌟 振替申請も同様に担当講師を探し出す！
    instructor_id = getattr(request, "instructor_id", None)
    if not instructor_id:
        mapping = db.query(models.StudentInstructor).filter(
            models.StudentInstructor.student_id == student_id,
            models.StudentInstructor.is_main == 1
        ).first()
        if not mapping:
            mapping = db.query(models.StudentInstructor).filter(
                models.StudentInstructor.student_id == student_id
            ).first()
        instructor_id = mapping.user_id if mapping else 1

    new_req = models.TransferRequest(
        tenant_id=tenant_id,
        student_id=student_id,
        instructor_id=instructor_id, # 🌟 探し出した講師IDをセット！
        original_date=request.original_date,
        candidate_dates=request.candidate_dates,
        reason=request.reason,
        status="pending"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req

def get_transfer_requests(db: Session, current_user: models.User, student_id: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, status: Optional[str] = None, instructor_id: Optional[int] = None):
    if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
        query = deps.get_tenant_query(db, models.TransferRequest, current_user)
    else:
        query = db.query(models.TransferRequest)
        
    if current_user.role == "user":
        query = query.join(models.Student, models.TransferRequest.student_id == models.Student.id)\
                     .join(models.StudentInstructor, models.Student.id == models.StudentInstructor.student_id)\
                     .filter(models.StudentInstructor.user_id == current_user.id)

    if student_id:
        query = query.filter(models.TransferRequest.student_id == student_id)
        
    # 🌟 追加: 日付での絞り込み
    if start_date:
        query = query.filter(models.TransferRequest.original_date >= start_date)
    if end_date:
        query = query.filter(models.TransferRequest.original_date <= end_date)
    
    if status:
        query = query.filter(models.TransferRequest.status == status)
    if instructor_id:
        query = query.filter(models.TransferRequest.instructor_id == instructor_id)
        
    return query.order_by(models.TransferRequest.created_at.desc()).all()

def update_transfer_status(db: Session, request_id: int, update_data: schemas.TransferRequestUpdate, current_user: models.User):
    if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
        db_request = deps.get_tenant_query(db, models.TransferRequest, current_user).filter(models.TransferRequest.id == request_id).first()
    else:
        db_request = db.query(models.TransferRequest).filter(models.TransferRequest.id == request_id).first()
    if db_request:
        db_request.status = update_data.status

        if update_data.approved_date is not None:
            db_request.approved_date = update_data.approved_date
        if update_data.instructor_comment is not None:
            db_request.instructor_comment = update_data.instructor_comment
            
        db.commit()
        db.refresh(db_request)
    return db_request

# --- AbsenceReport CRUD ---

def create_absence_report(db: Session, request: schemas.AbsenceReportCreate, current_user: models.User, student_id: int):
    tenant_id = _resolve_tenant_id(db, student_id, current_user)

    # 🌟 追加: StudentInstructor テーブルから担当講師を探し出す！
    instructor_id = getattr(request, "instructor_id", None)
    if not instructor_id:
        # メインの担当講師を探す
        mapping = db.query(models.StudentInstructor).filter(
            models.StudentInstructor.student_id == student_id,
            models.StudentInstructor.is_main == 1
        ).first()
        # メインがいなければ、紐づいている誰かを探す
        if not mapping:
            mapping = db.query(models.StudentInstructor).filter(
                models.StudentInstructor.student_id == student_id
            ).first()
            
        # 見つかればその user_id を、誰も紐づいていなければ念のため 1(塾長等) を入れる
        instructor_id = mapping.user_id if mapping else 1

    new_rep = models.AbsenceReport(
        tenant_id=tenant_id,
        student_id=student_id,
        instructor_id=instructor_id, # 🌟 探し出した講師IDをセット！
        absence_date=request.absence_date,
        reason=request.reason,
        report_info=request.report_info,
        status="pending"
    )
    db.add(new_rep)
    db.commit()
    db.refresh(new_rep)
    return new_rep

def get_absence_reports(db: Session, current_user: models.User, student_id: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, status: Optional[str] = None, instructor_id: Optional[int] = None):
    if hasattr(current_user, 'tenant_id') and current_user.tenant_id:
        query = deps.get_tenant_query(db, models.AbsenceReport, current_user)
    else:
        query = db.query(models.AbsenceReport)
        
    if current_user.role == "user":
        query = query.join(models.Student, models.AbsenceReport.student_id == models.Student.id)\
                     .join(models.StudentInstructor, models.Student.id == models.StudentInstructor.student_id)\
                     .filter(models.StudentInstructor.user_id == current_user.id)

    if student_id:
        query = query.filter(models.AbsenceReport.student_id == student_id)
        
    # 🌟 追加: 日付での絞り込み
    if start_date:
        query = query.filter(models.AbsenceReport.absence_date >= start_date)
    if end_date:
        query = query.filter(models.AbsenceReport.absence_date <= end_date)
    
    if status:
        query = query.filter(models.AbsenceReport.status == status)
    if instructor_id:
        query = query.filter(models.AbsenceReport.instructor_id == instructor_id)
        
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