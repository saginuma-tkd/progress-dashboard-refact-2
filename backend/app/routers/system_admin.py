# backend/app/routers/system_admin.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.db.database import get_db
from app.models.models import Tenant, User, SystemSetting, TeachingMaterial
from app.schemas.schemas import TenantCreateWithAdmin, TenantOut
from app.routers.deps import get_current_super_admin, get_current_super_admin_user
from app.core.security import get_password_hash

router = APIRouter(
    prefix="/system_admin",
    tags=["system_admin"],
    dependencies=[Depends(get_current_super_admin)]
)

@router.get("/tenants", response_model=List[TenantOut])
def get_all_tenants(db: Session = Depends(get_db)):
    return db.query(Tenant).all()

@router.post("/tenants", response_model=TenantOut)
def create_tenant_and_admin(tenant_in: TenantCreateWithAdmin, db: Session = Depends(get_db)):
    # 1. ユーザー名（メールアドレス）の重複チェック： User.email ではなく User.username
    user = db.query(User).filter(User.username == tenant_in.admin_email).first()
    if user:
        raise HTTPException(status_code=400, detail="このメールアドレス(ユーザー名)は既に登録されています")

    try:
        # 2. テナント（塾）の作成
        new_tenant = Tenant(name=tenant_in.tenant_name)
        db.add(new_tenant)
        db.flush() # IDを発番させる

        # 3. 初期管理者（塾長）の作成
        new_admin = User(
            username=tenant_in.admin_email,                       # 👈 email ではなく username
            password=get_password_hash(tenant_in.admin_password), # 👈 hashed_password ではなく password
            role="admin",
            tenant_id=new_tenant.id
            # is_active はモデルに無いので削除しました
        )
        db.add(new_admin)
        
        # 4. 全て成功したらコミット
        db.commit()
        db.refresh(new_tenant)
        return new_tenant

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"テナントの作成に失敗しました: {str(e)}")

@router.get("/stats")
def get_system_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_super_admin_user)):
    # 1. 契約テナント数
    total_tenants = db.query(func.count(Tenant.id)).scalar()
    # 2. 全システムの総ユーザー数 (生徒は除く、ログインできる全アカウント)
    total_users = db.query(func.count(User.id)).scalar()
    # 3. 全システムの総ファイル数 (S3に上がっている教材)
    total_files = db.query(func.count(TeachingMaterial.id)).scalar()
    # 4. 稼働ステータス
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    maintenance_mode = settings.maintenance_mode if settings else False

    return {
        "total_tenants": total_tenants or 0,
        "total_users": total_users or 0,
        "total_files": total_files or 0,
        "maintenance_mode": maintenance_mode
    }