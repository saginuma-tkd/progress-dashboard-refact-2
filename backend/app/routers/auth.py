from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.security import create_access_token, verify_password
from app.core.config import settings
from app.crud.crud_user import get_user_by_username
from app.schemas.schemas import Token
from app.db.database import get_db
from pydantic import BaseModel
from app.models.models import User
from app.core.security import get_password_hash, verify_password
from sqlalchemy.orm import Session
from app.routers.deps import get_current_user, get_current_admin_user

router = APIRouter()

@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "school": user.school}, # Include role and school in token
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- 1. 管理者用の強制リセットAPI（要admin権限） ---
class AdminPasswordResetRequest(BaseModel):
    username: str
    new_password: str

@router.post("/admin/reset-password")
def admin_reset_password(
    data: AdminPasswordResetRequest, 
    session: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user) # ログイン中のユーザー情報を取得
):
    # 管理者権限チェック
    user = session.query(User).filter(User.username == data.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません。")
        
    user.password = get_password_hash(data.new_password)
    session.add(user)
    session.commit()
    
    return {"message": f"管理者権限で {data.username} のパスワードをリセットしました。"}


# --- 2. 一般ユーザー用のパスワード変更API（自分専用） ---
class UserPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
def change_my_password(
    data: UserPasswordChangeRequest,
    session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # 自分自身の情報を取得
):
    # まず、入力された「現在のパスワード」が本当に合っているかチェック
    if not verify_password(data.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="現在のパスワードが間違っています。")
        
    # 合っていれば新しいパスワードで上書き
    current_user.password = get_password_hash(data.new_password)
    session.add(current_user)
    session.commit()
    
    return {"message": "パスワードを正常に変更しました。"}