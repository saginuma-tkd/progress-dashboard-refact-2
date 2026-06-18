from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers import deps
from app.crud import crud_calendar

router = APIRouter()

@router.get("/events", response_model=List[schemas.SchoolEventResponse])
def read_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user) # 閲覧は全員OK
):
    return crud_calendar.get_events(db, current_user, start_date, end_date)


@router.post("/events", response_model=schemas.SchoolEventResponse)
def create_event(
    event: schemas.SchoolEventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_admin_user) # 作成はAdmin以上
):
    return crud_calendar.create_event(db, event, current_user)


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_admin_user) # 削除はAdmin以上
):
    success = crud_calendar.delete_event(db, event_id, current_user)
    if not success:
        raise HTTPException(status_code=403, detail="削除権限がないか、イベントが見つかりません")
    return {"message": "イベントを削除しました"}