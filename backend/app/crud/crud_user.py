from sqlalchemy.orm import Session
from app.models.models import User
from app.schemas.schemas import UserCreate
from app.core.security import get_password_hash
from typing import List

def get_users(db: Session, current_user: User) -> List[User]:
    if current_user.role == 'developer':
        # Developer は全校舎の全ユーザーを取得
        return db.query(User).all()
    elif current_user.role == 'admin':
        # Admin は自分の所属する校舎のユーザーのみを取得
        return db.query(User).filter(User.school == current_user.school).all()
    else:
        # 一般 User は基本的には自分の情報のみ（要件に応じて変更可）
        return db.query(User).filter(User.id == current_user.id).all()

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        password=hashed_password,
        role=user.role,
        school=user.school
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
