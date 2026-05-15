from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel

from app.db.database import get_db
from app.models.models import AuditLog, User
from app.routers.auth import get_current_user

router = APIRouter()

# ==========================================
# 1. スキーマ定義 (レスポンス用)
# ==========================================
class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    branch_id: int | None
    details: str | None
    timestamp: datetime

    class Config:
        from_attributes = True

# ==========================================
# 2. ログを記録する便利関数 (他のAPIから呼び出す用)
# ==========================================
def log_action(db: Session, user_id: int, action: str, branch_id: int = None, details: str = ""):
    """
    他のAPIエンドポイントの中で `log_action(db, user.id, "LOGIN", user.branch_id, "ログイン成功")` 
    のように呼び出して使います。
    """
    new_log = AuditLog(
        user_id=user_id,
        action=action,
        branch_id=branch_id,
        details=details,
        timestamp=datetime.utcnow()
    )
    db.add(new_log)
    db.commit()

# ==========================================
# 3. 監査ログを取得するAPI (ここで権限の分岐！)
# ==========================================
@router.get("/logs")
def get_audit_logs(session: Session = Depends(get_db)):
    # 🌟変更: Userテーブルをくっつけて名前を取得
    logs = session.query(
        AuditLog, 
        User.username.label("user_name")
    ).outerjoin(
        User, AuditLog.user_id == User.id
    ).order_by(AuditLog.timestamp.desc()).all()
    
    result = []
    for log, user_name in logs:
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user_name, # 🌟ここに追加！
            "action": log.action,
            "branch_id": log.branch_id,
            "details": log.details,
            "timestamp": log.timestamp
        })
        
    return result