# backend/app/routers/schools.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.db.database import get_db
from app.models import models
from app.routers.auth import get_current_user

router = APIRouter()

# --- スキーマ定義 ---
class SchoolCreate(BaseModel):
    name: str

class SchoolResponse(BaseModel):
    id: int
    name: str
    tenant_id: int
    class Config:
        from_attributes = True

# --- APIエンドポイント ---

# 1. 校舎一覧の取得
@router.get("/", response_model=List[SchoolResponse])
def get_schools(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # テナントに所属している場合はそのテナントの校舎のみ、
    # super_admin等はすべての校舎を取得
    if current_user.tenant_id:
        return db.query(models.School).filter(models.School.tenant_id == current_user.tenant_id).all()
    else:
        return db.query(models.School).all()

# 2. 新規校舎の作成 (developer権限が必要)
@router.post("/", response_model=SchoolResponse)
def create_school(
    school_in: SchoolCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "developer" and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="校舎を追加する権限がありません")
    
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="所属テナントが不明です")
        
    # 重複チェック
    existing = db.query(models.School).filter(
        models.School.tenant_id == tenant_id,
        models.School.name == school_in.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"校舎「{school_in.name}」は既に存在します")

    new_school = models.School(
        tenant_id=tenant_id,
        name=school_in.name
    )
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school