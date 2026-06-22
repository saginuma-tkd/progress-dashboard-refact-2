"""
User CRUD Module
システムを利用するユーザー（講師・管理者）の作成、取得、更新、削除を行います。
"""
import logging
from typing import List, Optional, cast

from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models import models
from app.schemas.schemas import AdminUserCreate
# ❌ ここにあった from app.routers.audit import log_action を削除しました！

# ロガーの設定
logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_users(db: Session, current_user: models.User) -> List[models.User]:
    """権限に応じたユーザー一覧を取得する"""
    query = db.query(models.User).filter(models.User.role != 'student').order_by(models.User.id).all()
    
    if current_user.role == 'developer':
        return query.all()
        
    if current_user.role == 'admin':
        return query.filter(models.User.school == current_user.school).all()
        
    return query.filter(models.User.id == current_user.id).all()


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user_in: AdminUserCreate, current_user: models.User) -> models.User:
    """新規ユーザー（講師・管理者）を作成し、監査ログに記録する"""
    logger.info(f"新規講師作成プロセス開始: 実行者 {current_user.username} (権限: {current_user.role})")
    
    # DBから最新の実行者情報を取得
    real_admin = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not real_admin:
        raise HTTPException(status_code=404, detail="実行者のユーザー情報が見つかりません")

    school_id = real_admin.school_id
    tenant_id = real_admin.tenant_id
    school_str = real_admin.school or user_in.school

    # Developerの場合は指定された校舎IDを解決する
    if real_admin.role == "developer" and user_in.school:
        school_obj = db.query(models.School).filter(models.School.name == user_in.school).first()
        if school_obj:
            school_id = school_obj.id
            tenant_id = school_obj.tenant_id
            school_str = school_obj.name
    
    if get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # 初期パスワードの設定
    hashed_pw = pwd_context.hash("password123")
    
    new_user = models.User(
        username=user_in.username, 
        password=hashed_pw,
        role=user_in.role, 
        school=school_str,
        school_id=school_id,
        tenant_id=tenant_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 監査ログの記録
    try:
        # 🌟 修正：循環インポートを防ぐため、ここでローカルインポートする！
        from app.routers.audit import log_action
        
        log_action(
            db=db, 
            user_id=cast(int, real_admin.id),
            action="CREATE_USER", 
            branch_id=cast(Optional[int], new_user.school_id), 
            details=f"新規講師 '{new_user.username}' (権限: {new_user.role}) を作成しました"
        )
    except Exception as e:
        logger.error(f"監査ログの記録に失敗: {e}")

    return new_user


def update_user(db: Session, user_id: int, data: dict, current_user: models.User) -> models.User:
    """ユーザー情報の更新（パスワード変更や権限変更を含む）"""
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role == 'admin' and user.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot edit users from other schools")

    for key, value in data.items():
        if key == "password": 
            str_val = str(value).strip() if value else ""
            if str_val and not str_val.startswith(("$2b$", "$2a$")) and str_val != "********":
                user.password = pwd_context.hash(str_val)
                
        elif hasattr(user, key) and key != "id": 
            if key == "role" and current_user.role == 'admin' and value == 'developer':
                raise HTTPException(status_code=403, detail="Admin cannot create developer")
            setattr(user, key, value)
            
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> bool:
    user = get_user(db, user_id)
    if user:
        db.delete(user)
        db.commit()
        return True
    return False