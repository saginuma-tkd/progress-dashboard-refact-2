from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.routers import deps
from app.crud import crud_master
from app.models.models import User

router = APIRouter()

@router.get("/subjects", response_model=List[str])
def read_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return crud_master.get_all_subjects(db)

@router.get("/textbooks", response_model=List[dict]) 
# simplified response model or use schema
def read_textbooks(
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # This might be used by students too, to select textbooks
    items = crud_master.get_master_textbooks(db, subject, current_user)
    return [
        {
            "id": i.id, 
            "book_name": i.book_name,  
            "level": i.level, 
            "subject": i.subject,
            "duration": i.duration,     
            "school_id": i.school_id,
            "tenant_id": i.tenant_id
        } 
        for i in items
    ]
