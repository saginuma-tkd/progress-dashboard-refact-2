from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from pydantic import BaseModel
from datetime import date
from app.db.database import get_db
from app.models.models import User, UniversityAcceptance, PastExamResult, MockExamResult
import datetime
from app.routers import deps

router = APIRouter()

# --- Helper ---
def resolve_student_id(data_student_id: Optional[int], current_user: User, session: Session) -> int:
    student_id = data_student_id
    if current_user.role == "student":
        from app.models.models import Student
        student = session.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            student_id = student.id
    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID is required for non-student users")
    return student_id

# --- Pydantic Models ---

class AcceptanceCreate(BaseModel):
    student_id: Optional[int] = None
    university_name: str
    faculty_name: str
    department_name: Optional[str] = None
    exam_system: Optional[str] = None
    result: Optional[str] = "未受験"
    application_deadline: Optional[str] = None
    exam_date: Optional[str] = None
    announcement_date: Optional[str] = None
    procedure_deadline: Optional[str] = None

class AcceptanceUpdate(BaseModel):
    result: str

class PastExamCreate(BaseModel):
    student_id: Optional[int] = None
    date: str
    university_name: str
    faculty_name: Optional[str] = None
    exam_system: Optional[str] = None
    year: int
    subject: str
    time_required: Optional[Union[int,str]] = None
    total_time_allowed: Optional[Union[int,str]] = None
    correct_answers: Optional[Union[int,str]] = None
    total_questions: Optional[Union[int,str]] = None

# ★修正: 全科目に対応したスキーマ
class MockExamCreate(BaseModel):
    student_id: Optional[int] = None
    result_type: str
    mock_exam_name: str
    mock_exam_format: str
    grade: str
    round: str
    exam_date: Optional[date] = None
    
    # 記述式
    subject_kokugo_desc: Optional[Union[int,str]] = None
    subject_math_desc: Optional[Union[int,str]] = None
    subject_english_desc: Optional[Union[int,str]] = None
    subject_rika1_desc: Optional[Union[int,str]] = None
    subject_rika2_desc: Optional[Union[int,str]] = None
    subject_shakai1_desc: Optional[Union[int,str]] = None
    subject_shakai2_desc: Optional[Union[int,str]] = None
    
    # マーク式
    subject_kokugo_mark: Optional[Union[int,str]] = None
    subject_math1a_mark: Optional[Union[int,str]] = None
    subject_math2bc_mark: Optional[Union[int,str]] = None
    subject_english_r_mark: Optional[Union[int,str]] = None
    subject_english_l_mark: Optional[Union[int,str]] = None
    subject_rika1_mark: Optional[Union[int,str]] = None
    subject_rika2_mark: Optional[Union[int,str]] = None
    subject_shakai1_mark: Optional[Union[int,str]] = None
    subject_shakai2_mark: Optional[Union[int,str]] = None
    subject_rika_kiso1_mark: Optional[Union[int,str]] = None
    subject_rika_kiso2_mark: Optional[Union[int,str]] = None
    subject_info_mark: Optional[Union[int,str]] = None

# --- API Endpoints ---
# (以下、変更なし。get_acceptances, create_acceptance, update, delete等の既存処理)

@router.get("/acceptance/{student_id}")
def get_acceptances(student_id: Optional[int] = None, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return session.query(UniversityAcceptance).filter(
        UniversityAcceptance.student_id == student_id
    ).order_by(UniversityAcceptance.exam_date).all()

@router.post("/acceptance")
def create_acceptance(data: AcceptanceCreate, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    resolved_student_id = resolve_student_id(data.student_id, current_user, session)
    new_item = UniversityAcceptance(**data.dict(exclude={"student_id"}), student_id=resolved_student_id)
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return new_item

@router.delete("/acceptance/{row_id}")
def delete_acceptance(row_id: int, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    item = session.query(UniversityAcceptance).filter(UniversityAcceptance.id == row_id).first()
    if item:
        session.delete(item)
        session.commit()
    return {"message": "deleted"}

@router.patch("/acceptance/{row_id}")
def update_acceptance_full(row_id: int, data: dict = Body(...), session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    item = session.query(UniversityAcceptance).filter(UniversityAcceptance.id == row_id).first()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in data.items():
        if key in ["id", "student_id"]:
                continue
        if hasattr(item, key) and key != "id":
            if value == "":
                value = None
            if value and key in ["application_deadline", "exam_date", "announcement_date", "procedure_deadline"]:
                if isinstance(value, str):
                    value = datetime.datetime.strptime(value, "%Y-%m-%d").date()
            setattr(item, key, value)
            
    session.commit()
    session.refresh(item)
    return item

@router.get("/pastexam/{student_id}")
def get_past_exams(student_id: Optional[int] = None, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return session.query(PastExamResult).filter(
        PastExamResult.student_id == student_id
    ).order_by(PastExamResult.date.desc()).all()

@router.post("/pastexam")
def create_past_exam(data: PastExamCreate, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    resolved_student_id = resolve_student_id(data.student_id, current_user, session)
    new_item = PastExamResult(**data.dict(exclude={"student_id"}), student_id=resolved_student_id)
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return new_item

@router.delete("/pastexam/{row_id}")
def delete_past_exam(row_id: int, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    item = session.query(PastExamResult).filter(PastExamResult.id == row_id).first()
    if item:
        session.delete(item)
        session.commit()
    return {"message": "deleted"}

@router.patch("/pastexam/{row_id}")
def update_past_exam(row_id: int, data: dict = Body(...), session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    item = session.query(PastExamResult).filter(PastExamResult.id == row_id).first()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in data.items():
        if key in ["id", "student_id"]:
            continue
        if hasattr(item, key) and key != "id":
            if value == "":
                value = None
            if value and key == "date":
                 if isinstance(value, str):
                    value = datetime.datetime.strptime(value, "%Y-%m-%d").date()
            setattr(item, key, value)
            
    session.commit()
    session.refresh(item)
    return item

@router.get("/mock/{student_id}")
def get_mock_exams(student_id: Optional[int] = None, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return session.query(MockExamResult).filter(
        MockExamResult.student_id == student_id
    ).order_by(MockExamResult.exam_date.desc()).all()

@router.post("/mock")
def create_mock_exam(data: MockExamCreate, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    resolved_student_id = resolve_student_id(data.student_id, current_user, session)
    new_item = MockExamResult(**data.dict(exclude={"student_id"}), student_id=resolved_student_id)
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return new_item

@router.delete("/mock/{row_id}")
def delete_mock_exam(row_id: int, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    item = session.query(MockExamResult).filter(MockExamResult.id == row_id).first()
    if item:
        session.delete(item)
        session.commit()
    return {"message": "deleted"}

@router.patch("/mock/{row_id}")
def update_mock_exam(row_id: int, data: dict = Body(...), session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    item = session.query(MockExamResult).filter(MockExamResult.id == row_id).first()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in data.items():
        if key in ["id", "student_id"]:
            continue
        if hasattr(item, key) and key != "id":
            if value == "":
                value = None
            if value and key == "exam_date":
                if isinstance(value, str):
                    value = datetime.datetime.strptime(value, "%Y-%m-%d").date()
            setattr(item, key, value)
            
    session.commit()
    session.refresh(item)
    return item