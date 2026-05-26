from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import datetime
from app.models.models import User, Student, UniversityAcceptance, PastExamResult, MockExamResult
from app.schemas.schemas import AcceptanceCreate, PastExamCreate, MockExamCreate

def resolve_student_id(db: Session, data_student_id: Optional[int], current_user: User) -> int:
    student_id = data_student_id
    if current_user.role == "student":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            student_id = student.id
    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID is required for non-student users")
    return student_id

# --- Acceptance (合格実績) ---
def get_acceptances(db: Session, student_id: Optional[int]):
    return db.query(UniversityAcceptance).filter(UniversityAcceptance.student_id == student_id).order_by(UniversityAcceptance.exam_date).all()

def create_acceptance(db: Session, data: AcceptanceCreate, current_user: User):
    resolved_student_id = resolve_student_id(db, data.student_id, current_user)
    new_item = UniversityAcceptance(**data.dict(exclude={"student_id"}), student_id=resolved_student_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

def update_acceptance(db: Session, row_id: int, data: dict):
    item = db.query(UniversityAcceptance).filter(UniversityAcceptance.id == row_id).first()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    for key, value in data.items():
        if key in ["id", "student_id"]: continue
        if hasattr(item, key) and key != "id":
            if value == "": value = None
            if value and key in ["application_deadline", "exam_date", "announcement_date", "procedure_deadline"]:
                if isinstance(value, str):
                    value = datetime.datetime.strptime(value, "%Y-%m-%d").date()
            setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

def delete_acceptance(db: Session, row_id: int):
    item = db.query(UniversityAcceptance).filter(UniversityAcceptance.id == row_id).first()
    if item:
        db.delete(item)
        db.commit()
        return True
    return False

# --- Past Exam (過去問) ---
def get_past_exams(db: Session, student_id: Optional[int]):
    return db.query(PastExamResult).filter(PastExamResult.student_id == student_id).order_by(PastExamResult.date.desc()).all()

def create_past_exam(db: Session, data: PastExamCreate, current_user: User):
    resolved_student_id = resolve_student_id(db, data.student_id, current_user)
    new_item = PastExamResult(**data.dict(exclude={"student_id"}), student_id=resolved_student_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item
    
def update_past_exam(db: Session, row_id: int, data: dict):
    item = db.query(PastExamResult).filter(PastExamResult.id == row_id).first()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    for key, value in data.items():
        if key in ["id", "student_id"]: continue
        if hasattr(item, key) and key != "id":
            if value == "": value = None
            if value and key == "date":
                 if isinstance(value, str):
                    value = datetime.datetime.strptime(value, "%Y-%m-%d").date()
            setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

def delete_past_exam(db: Session, row_id: int):
    item = db.query(PastExamResult).filter(PastExamResult.id == row_id).first()
    if item:
        db.delete(item)
        db.commit()
        return True
    return False

# --- Mock Exam (模試) ---
def get_mock_exams(db: Session, student_id: Optional[int]):
    return db.query(MockExamResult).filter(MockExamResult.student_id == student_id).order_by(MockExamResult.exam_date.desc()).all()
    
def create_mock_exam(db: Session, data: MockExamCreate, current_user: User):
    resolved_student_id = resolve_student_id(db, data.student_id, current_user)
    new_item = MockExamResult(**data.dict(exclude={"student_id"}), student_id=resolved_student_id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

def update_mock_exam(db: Session, row_id: int, data: dict):
    item = db.query(MockExamResult).filter(MockExamResult.id == row_id).first()
    if not item: raise HTTPException(status_code=404, detail="Item not found")
    for key, value in data.items():
        if key in ["id", "student_id"]: continue
        if hasattr(item, key) and key != "id":
            if value == "": value = None
            if value and key == "exam_date":
                if isinstance(value, str):
                    value = datetime.datetime.strptime(value, "%Y-%m-%d").date()
            setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

def delete_mock_exam(db: Session, row_id: int):
    item = db.query(MockExamResult).filter(MockExamResult.id == row_id).first()
    if item:
        db.delete(item)
        db.commit()
        return True
    return False