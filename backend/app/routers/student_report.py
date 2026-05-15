# backend/app/routers/student_report.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import StudentReportState
from app.schemas.schemas import ReportStateResponse, ReportStateUpdate

router = APIRouter()

@router.get("/{student_id}", response_model=ReportStateResponse)
def get_student_report_state(student_id: int, db: Session = Depends(get_db)):
    """特定の生徒のレポート入力状態（下書き）を取得する"""
    state = db.query(StudentReportState).filter(StudentReportState.student_id == student_id).first()
    if not state:
        # まだデータがない場合は空の状態を返す
        return {"id": 0, "student_id": student_id, "report_data": {}}
    return state

@router.put("/{student_id}", response_model=ReportStateResponse)
def update_student_report_state(student_id: int, state_in: ReportStateUpdate, db: Session = Depends(get_db)):
    """特定の生徒のレポート入力状態（下書き）を保存・更新する"""
    state = db.query(StudentReportState).filter(StudentReportState.student_id == student_id).first()
    
    if state:
        # 既存データの更新
        state.report_data = state_in.report_data
    else:
        # 新規作成
        state = StudentReportState(student_id=student_id, report_data=state_in.report_data)
        db.add(state)
        
    db.commit()
    db.refresh(state)
    return state