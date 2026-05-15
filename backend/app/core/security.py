# backend/app/core/security.py

from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from app.core.config import settings
from werkzeug.security import generate_password_hash, check_password_hash
import os
# bcrypt ハッシュ検証用モジュールを追加
import bcrypt

# SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
# ↑使わないのでいったんコメントアウト
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

def get_password_hash(password: str) -> str:
    """パスワードをハッシュ化する"""
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """入力されたパスワードと、DBのハッシュ済みパスワードを比較する"""
    if not hashed_password:
        return False

    # 1. bcrypt方式（$2b$ や $2a$ で始まる）の場合
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            pass # エラー時は下へ

    # 2. Werkzeug標準のハッシュ方式、または平文（救済措置）の場合
    try:
        return check_password_hash(hashed_password, plain_password)
    except ValueError:
        # 平文として直接比較
        return plain_password == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """アクセストークンを作成する"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt