# backend/app/routers/dashboard.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import json

from app.db.database import get_db
from app.models.models import Progress, EikenResult, MasterTextbook, BulkPreset, BulkPresetBook, User, Student, AuditLog
from app.routers.deps import get_current_user, get_current_admin_user

from app.crud import crud_master, crud_progress
from app.crud.crud_progress import get_adjusted_duration
from app.routers import deps
from app.schemas.schemas import ProgressBatchCreate, ProgressUpdate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class DashboardData(BaseModel):
    student_id: int
    total_study_time: float      
    total_planned_time: float    
    progress_rate: float         
    eiken_grade: Optional[str] = "未登録"
    eiken_score: Optional[str] = "-"
    eiken_date: Optional[str] = "-"
    eiken_target: Optional[str] = "未設定"

# ==========================================
# ★修正: 固定パスのエンドポイントを上に移動！
# ==========================================

@router.get("/presets")
def get_presets(
    session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):

    query = session.query(BulkPreset).options(joinedload(BulkPreset.books))

    if current_user.role != "developer":
        query = query.filter(BulkPreset.school_id == current_user.school_id)

    presets = session.query(BulkPreset).options(joinedload(BulkPreset.books)).all()
    all_masters = session.query(MasterTextbook).all()
    master_map = { (m.subject, m.book_name): m for m in all_masters }

    result = []
    for p in presets:
        books_data = []
        for pb in p.books:
            key = (p.subject, pb.book_name)
            master_info = master_map.get(key)
            if master_info:
                books_data.append({"id": master_info.id, "subject": master_info.subject, "level": master_info.level, "book_name": master_info.book_name, "duration": master_info.duration, "is_master": True})
            else:
                books_data.append({"id": None, "subject": p.subject, "level": "プリセット", "book_name": pb.book_name, "duration": 0, "is_master": False})
        result.append({"id": p.id, "name": p.preset_name, "subject": p.subject, "books": books_data})
    return result

@router.get("/books/master")
def get_master_books(
    session: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)  # ← 追加
):
    return crud_master.get_master_textbooks(session, current_user=current_user)

@router.post("/progress/batch")
def add_progress_batch(data: ProgressBatchCreate, session: Session = Depends(get_db)):
    added_items = crud_progress.add_progress_batch(session, data)
    return {"message": f"{len(added_items)} items added"}


# ==========================================
# 変数パス(/{student_id} など)を下に配置
# ==========================================

@router.get("/{student_id}", response_model=DashboardData)
def get_dashboard_data(student_id: int, session: Session = Depends(get_db)):
    data = crud_progress.get_dashboard_summary(session, student_id)
    if not data:
        raise HTTPException(status_code=404, detail="Student not found")

    eiken = session.query(EikenResult).filter(EikenResult.student_id == student_id).order_by(desc(EikenResult.id)).first()
    if eiken:
        data["eiken_grade"] = eiken.grade or "未登録"
        data["eiken_score"] = str(eiken.cse_score) if eiken.cse_score is not None else "-"
        data["eiken_date"] = eiken.exam_date or "-"
        data["eiken_target"] = eiken.target_grade or "未設定"
    else:
        data["eiken_grade"] = "未登録"
        data["eiken_score"] = "-"
        data["eiken_date"] = "-"
        data["eiken_target"] = "未設定"

    return data

@router.get("/chart/{student_id}")
def get_subject_chart(student_id: int, session: Session = Depends(get_db)):
    return crud_progress.get_subject_chart_data(session, student_id)

@router.get("/admin/study-time-summary")
def get_study_time_summary(
    session: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    return crud_progress.get_study_time_summary(session, current_user)

@router.get("/admin/inactive-users")
def get_inactive_users(session: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud_progress.get_inactive_users(session, current_user)

@router.get("/list/{student_id}")
def get_progress_list(student_id: int, session: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    items = crud_progress.get_progress_list_by_student(session, student_id)
    return [{"id": i.id, "subject": i.subject, "level": i.level, "book_name": i.book_name, "completed_units": i.completed_units, "total_units": i.total_units} for i in items]

@router.patch("/progress/{row_id}")
def update_progress(row_id: int, update_data: ProgressUpdate, session: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    updated_item = crud_progress.update_progress(session, row_id, update_data, current_user.id) #type: ignore
    if not updated_item: 
        raise HTTPException(status_code=404, detail="Progress item not found")
    return updated_item

@router.delete("/progress/{row_id}")
def delete_progress(row_id: int, session: Session = Depends(get_db)):
    success = crud_progress.delete_progress(session, row_id)
    if not success: 
        raise HTTPException(status_code=404, detail="Progress item not found")
    return {"message": "Deleted successfully"}
