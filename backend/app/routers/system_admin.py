"""
System Admin Router - super_admin 専用のテナント管理 CRUD API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.models.models import Tenant, User
from app.core.security import get_password_hash
from app.routers.deps import get_current_super_admin_user

router = APIRouter()


# ─── Pydantic スキーマ ───────────────────────────────────────────

class TenantCreate(BaseModel):
    """新規テナント開設リクエスト"""
    tenant_name: str
    admin_username: str
    admin_password: str

class UserSummary(BaseModel):
    id: int
    username: str
    role: str
    class Config:
        from_attributes = True

class TenantResponse(BaseModel):
    id: int
    name: str
    user_count: int
    users: List[UserSummary] = []

class TenantDetail(TenantResponse):
    pass


# ─── エンドポイント ──────────────────────────────────────────────

@router.get("/tenants", response_model=List[TenantResponse])
def list_tenants(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin_user),
):
    """全テナント一覧（super_admin 専用）"""
    tenants = db.query(Tenant).all()
    result = []
    for t in tenants:
        users = db.query(User).filter(User.tenant_id == t.id).all()
        result.append(TenantResponse(
            id=t.id,
            name=t.name,
            user_count=len(users),
            users=[UserSummary(id=u.id, username=u.username, role=u.role) for u in users],
        ))
    return result


@router.post("/tenants", response_model=TenantResponse, status_code=201)
def create_tenant(
    payload: TenantCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin_user),
):
    """
    新規テナント開設（1トランザクション）
    - Tenant レコードを作成
    - 紐づく最初の admin ユーザーを作成
    """
    # 重複チェック
    if db.query(Tenant).filter(Tenant.name == payload.tenant_name).first():
        raise HTTPException(status_code=400, detail=f"テナント '{payload.tenant_name}' は既に存在します")
    if db.query(User).filter(User.username == payload.admin_username).first():
        raise HTTPException(status_code=400, detail=f"ユーザー名 '{payload.admin_username}' は既に使用されています")

    # テナント作成
    tenant = Tenant(name=payload.tenant_name)
    db.add(tenant)
    db.flush()  # tenant.id を取得するために flush

    # 最初の admin ユーザーを作成
    admin_user = User(
        username=payload.admin_username,
        password=get_password_hash(payload.admin_password),
        role="admin",
        school=payload.tenant_name,
        tenant_id=tenant.id,
    )
    db.add(admin_user)
    db.commit()
    db.refresh(tenant)

    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        user_count=1,
        users=[UserSummary(id=admin_user.id, username=admin_user.username, role=admin_user.role)],
    )


@router.delete("/tenants/{tenant_id}", status_code=204)
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin_user),
):
    """テナントを削除（super_admin 専用）"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="テナントが見つかりません")
    db.delete(tenant)
    db.commit()
    return


@router.get("/users", response_model=List[UserSummary])
def list_all_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin_user),
):
    """全ユーザー一覧（super_admin 専用）"""
    return db.query(User).all()
