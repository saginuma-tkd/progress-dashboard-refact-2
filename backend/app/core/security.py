"""
Security Module
パスワードのハッシュ化・検証、およびJWT（JSON Web Token）の生成を管理します。
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import jwt
from werkzeug.security import check_password_hash

from app.core.config import settings

# JWTエンコード用のアルゴリズム
ALGORITHM = "HS256"

def get_password_hash(password: str) -> str:
    """
    平文パスワードをbcryptでハッシュ化します。
    """
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    入力されたパスワードとDBのハッシュ済みパスワードを比較・検証します。
    後方互換性のため、Werkzeug標準のハッシュ方式にも対応しています。
    """
    if not hashed_password:
        return False

    # 1. 最新のbcrypt方式（$2b$ や $2a$ で始まる）の検証
    if hashed_password.startswith(("$2b$", "$2a$")):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            pass  # エラー時はフォールバック処理へ

    # 2. 過去のWerkzeug標準ハッシュ方式の検証（レガシー互換用）
    try:
        return check_password_hash(hashed_password, plain_password)
    except ValueError:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    認証用のJWTアクセストークンを生成します。
    """
    to_encode = data.copy()
    
    # 有効期限の設定（指定がない場合は設定ファイルのデフォルト値を使用）
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    
    # トークンの署名
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt