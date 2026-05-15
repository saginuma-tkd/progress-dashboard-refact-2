from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.config import settings
from app.crud import crud_external
from app.schemas import schemas
from typing import Optional

router = APIRouter()

async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != settings.FORM_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return x_api_key

@router.get("/get-student-id")
def get_student_id(school: str, name: str, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    student_id = crud_external.get_student_id_by_name(db, school, name)
    if student_id:
        return {"success": True, "student_id": student_id}
    else:
        return {"success": False, "message": "Student not found"}, 404

@router.post("/submit-past-exam")
def submit_past_exam(result: schemas.PastExamResultCreate, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    try:
        crud_external.create_past_exam_result(db, result)
        return {"success": True, "message": "Past exam result saved successfully"}
    except Exception as e:
        return {"success": False, "message": str(e)}, 500

@router.post("/submit-acceptance")
def submit_acceptance(acceptance: schemas.UniversityAcceptanceCreate, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    try:
        crud_external.create_university_acceptance(db, acceptance)
        return {"success": True, "message": "Acceptance result saved successfully"}
    except Exception as e:
         return {"success": False, "message": str(e)}, 500

@router.post("/submit-mock-exam")
def submit_mock_exam(result: schemas.MockExamResultCreate, db: Session = Depends(get_db), api_key: str = Depends(verify_api_key)):
    try:
        crud_external.create_mock_exam_result(db, result)
        return {"success": True, "message": "Mock exam result saved successfully"}
    except Exception as e:
         return {"success": False, "message": str(e)}, 500
