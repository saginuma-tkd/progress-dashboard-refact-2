from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.models import User
from app.routers import deps
from app.schemas.schemas import AcceptanceCreate, PastExamCreate, MockExamCreate
from app.crud import crud_exams

router = APIRouter()

# --- Acceptance ---
@router.get("/acceptance/{student_id}")
def get_acceptances(student_id: Optional[int] = None, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.get_acceptances(session, student_id)

@router.post("/acceptance")
def create_acceptance(data: AcceptanceCreate, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.create_acceptance(session, data, current_user)

@router.patch("/acceptance/{row_id}")
def update_acceptance_full(row_id: int, data: dict = Body(...), session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.update_acceptance(session, row_id, data)

@router.delete("/acceptance/{row_id}")
def delete_acceptance(row_id: int, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    crud_exams.delete_acceptance(session, row_id)
    return {"message": "deleted"}

# --- Past Exam ---
@router.get("/pastexam/{student_id}")
def get_past_exams(student_id: Optional[int] = None, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.get_past_exams(session, student_id)

@router.post("/pastexam")
def create_past_exam(data: PastExamCreate, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.create_past_exam(session, data, current_user)

@router.patch("/pastexam/{row_id}")
def update_past_exam(row_id: int, data: dict = Body(...), session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.update_past_exam(session, row_id, data)

@router.delete("/pastexam/{row_id}")
def delete_past_exam(row_id: int, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    crud_exams.delete_past_exam(session, row_id)
    return {"message": "deleted"}

# --- Mock Exam ---
@router.get("/mock/{student_id}")
def get_mock_exams(student_id: Optional[int] = None, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.get_mock_exams(session, student_id)

@router.post("/mock")
def create_mock_exam(data: MockExamCreate, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.create_mock_exam(session, data, current_user)

@router.patch("/mock/{row_id}")
def update_mock_exam(row_id: int, data: dict = Body(...), session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_exams.update_mock_exam(session, row_id, data)

@router.delete("/mock/{row_id}")
def delete_mock_exam(row_id: int, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    crud_exams.delete_mock_exam(session, row_id)
    return {"message": "deleted"}