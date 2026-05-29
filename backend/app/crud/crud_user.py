from sqlalchemy.orm import Session
from app.models import models
from app.schemas.schemas import UserCreate
from app.core.security import get_password_hash
from typing import List, Optional
from app.schemas.schemas import AdminUserCreate
from fastapi import HTTPException
from typing import cast
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_users(db: Session, current_user: models.User) -> List[models.User]:
    query = db.query(models.User).filter(models.User.role != 'student')
    
    if current_user.role == 'developer':
        # Developer は全校舎の全ユーザーを取得
        return query.all()
    elif current_user.role == 'admin':
        # Admin は自分の所属する校舎のユーザーのみを取得
        return query.filter(models.User.school == current_user.school).all()
    else:
        # 一般 User は基本的には自分の情報のみ（要件に応じて変更可）
        return query.filter(models.User.id == current_user.id).all()

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user_in: AdminUserCreate, current_user: models.User):
    # 🕵️ デバッグログ開始
    print("\n=== 🕵️ DEBUG: 新規講師作成プロセス開始 ===")
    print(f"実行者（トークン）: {current_user.username} (権限: {current_user.role})")
    
    # DBから最新の実行者情報を取得
    real_admin = db.query(models.User).filter(models.User.id == current_user.id).first()

    school_id = real_admin.school_id
    tenant_id = real_admin.tenant_id
    school_str = real_admin.school or user_in.school

    # Developerならフロントエンドの指定校舎からIDを探す
    if real_admin.role == "developer" and user_in.school:
        school_obj = db.query(models.School).filter(models.School.name == user_in.school).first()
        if school_obj:
            school_id = school_obj.id
            tenant_id = school_obj.tenant_id
            school_str = school_obj.name
    
    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
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

    try:
        from app.routers.audit import log_action
        log_action(
            db=db, user_id=cast(int, real_admin.id),
            action="CREATE_USER", 
            branch_id=cast(Optional[int], new_user.school_id), 
            details=f"新規講師 '{new_user.username}' (権限: {new_user.role}) を作成しました"
        )
    except Exception as e:
        print(f"監査ログの記録に失敗: {e}")

    return new_user

def update_user(db: Session, user_id: int, data: dict, current_user: models.User):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")

    if current_user.role == 'admin' and user.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Cannot edit users from other schools")

    for key, value in data.items():
        if key == "password": 
            str_val = str(value).strip() if value else ""
            if str_val and not str_val.startswith("$2b$") and not str_val.startswith("$2a$") and str_val != "********":
                user.password = pwd_context.hash(str_val)
        elif hasattr(user, key) and key != "id": 
            if key == "role" and current_user.role == 'admin' and value == 'developer':
                raise HTTPException(status_code=403, detail="Admin cannot create developer")
            setattr(user, key, value)
            
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False
