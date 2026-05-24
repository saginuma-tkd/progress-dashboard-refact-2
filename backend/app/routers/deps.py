from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.database import get_db
from app.crud.crud_user import get_user_by_username
from app.schemas.schemas import TokenData
from app.models.models import User
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # デバッグ用プリント
        print(f"DEBUG: 受信したトークン: {token[:10]}...")
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        
        if username is None:
            print("DEBUG: トークンの'sub'が空です")
            raise credentials_exception
            
        print(f"DEBUG: トークン内のユーザー名: {username}")
        token_data = TokenData(username=username)
        
    except JWTError as e:
        print(f"DEBUG: JWTデコード失敗: {e}")
        raise credentials_exception

    # DBからユーザーを探す
    if token_data.username is None:
        raise credentials_exception
    user = get_user_by_username(db, username=token_data.username)
    
    if user is None:
        print(f"DEBUG: DBにユーザー '{token_data.username}' が見つかりません")
        raise credentials_exception
        
    print(f"DEBUG: ログイン成功ユーザー: {user.username} (Role: {user.role})")
    return user

def get_current_active_user(current_user = Depends(get_current_user)):
    # If we had an 'is_active' field, we would check it here
    return current_user

def get_current_admin_user(current_user = Depends(get_current_user)):
    if current_user.role not in ["admin", "developer"]:
        raise HTTPException(status_code=403, detail="The user does not have enough privileges")
    return current_user

def get_current_developer_user(current_user = Depends(get_current_user)):
    if current_user.role != "developer":
        raise HTTPException(status_code=403, detail="The user does not have enough privileges")
    return current_user

def get_current_super_admin_user(current_user = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin privileges required")
    return current_user

def get_tenant_id_for_user(db: Session, current_user) -> "int | None":
    """
    ユーザーの tenant_id を解決する。
    優先順位: User.tenant_id → User.school で Tenant テーブルを検索 → None
    """
    # 1. User モデルに tenant_id が直接設定されている場合
    tid = getattr(current_user, 'tenant_id', None)
    if tid:
        return tid

    # 2. User.school から Tenant を逆引き
    school = getattr(current_user, 'school', None)
    if school:
        from app.models.models import Tenant
        tenant = db.query(Tenant).filter(Tenant.name == school).first()
        if tenant:
            return tenant.id

    return None

def get_tenant_query(db: Session, model, current_user):
    """
    tenant_id でフィルタするクエリを返す。
    tenant_id が解決できない場合（developer など）はフィルタなしで全件返す。
    model に tenant_id カラムがない場合もフィルタなしで返す。
    """
    if not hasattr(model, 'tenant_id'):
        return db.query(model)

    tid = get_tenant_id_for_user(db, current_user)
    if tid is None:
        # developer や tenant 未設定ユーザーは全件アクセス可
        return db.query(model)
    return db.query(model).filter(model.tenant_id == tid)

def get_current_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="スーパー管理者の権限が必要です"
        )
    return current_user