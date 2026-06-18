from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import models
from app.schemas import schemas
from app.routers import deps
from typing import Optional

def get_events(db: Session, current_user: models.User, start_date: Optional[str] = None, end_date: Optional[str] = None):
    # テナントによる絞り込み（基本安全装置）
    query = deps.get_tenant_query(db, models.SchoolEvent, current_user)

    # 🌟 権限による絞り込みのキモ
    # Developer/Super Admin 以外は「テナント全体(None)」か「自分の所属校舎」のものだけを取得
    if current_user.role not in ["developer", "super_admin"]:
        query = query.filter(
            or_(
                models.SchoolEvent.school_id == None,
                models.SchoolEvent.school_id == current_user.school_id
            )
        )

    # 月間カレンダー表示のための期間絞り込み
    if start_date:
        query = query.filter(models.SchoolEvent.end_date >= start_date)
    if end_date:
        query = query.filter(models.SchoolEvent.start_date <= end_date)

    return query.order_by(models.SchoolEvent.start_date.asc()).all()


def create_event(db: Session, event: schemas.SchoolEventCreate, current_user: models.User):
    tenant_id = getattr(current_user, 'tenant_id', 1)
    
    # 🌟 作成者の権限に応じて対象校舎を自動決定
    # Developer が作れば None (全校舎共通)、Admin が作れば自動的に自校舎限定になる
    school_id = None if current_user.role == "developer" else current_user.school_id

    db_event = models.SchoolEvent(
        tenant_id=tenant_id,
        school_id=school_id,
        title=event.title,
        start_date=event.start_date,
        end_date=event.end_date,
        category=event.category,
        description=event.description
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def delete_event(db: Session, event_id: int, current_user: models.User):
    event = db.query(models.SchoolEvent).filter(models.SchoolEvent.id == event_id).first()
    if not event:
        return False

    # 🌟 セキュリティガード：他校舎のイベントや、Adminが「全体イベント」を消せないようにする
    if current_user.role != "developer":
        if event.school_id != current_user.school_id:
            return False

    db.delete(event)
    db.commit()
    return True