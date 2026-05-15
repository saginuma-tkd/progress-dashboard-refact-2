from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import SystemSetting

router = APIRouter()

@router.get("/settings/public")
def get_public_system_settings(db: Session = Depends(get_db)):
    """認証なしで誰でも取得可能なお知らせ・メンテナンス状態API"""
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    if not settings:
        return {
            "maintenance_mode": False, 
            "announcement_enabled": False, 
            "announcement_message": ""
        }
    
    return {
        "maintenance_mode": settings.maintenance_mode,
        "announcement_enabled": settings.announcement_enabled,
        "announcement_message": settings.announcement_message
    }