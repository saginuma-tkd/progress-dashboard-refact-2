"""
Configuration Module
環境変数やアプリケーションの全体設定を一元管理します。
PydanticのBaseSettingsを利用し、型安全に設定値を読み込みます。
"""
import os
from typing import List, Union

from pydantic import validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ---------------------------------------------------------
    # 🌐 共通・API設定
    # ---------------------------------------------------------
    API_V1_STR: str = "/api/v1"
    
    # ---------------------------------------------------------
    # 🔐 セキュリティ・認証
    # ---------------------------------------------------------
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    # トークン有効期限: 60分 * 24時間 * 8日 = 8日間
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    
    # ---------------------------------------------------------
    # 🗄️ データベース
    # ---------------------------------------------------------
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/mydatabase")
    
    # ---------------------------------------------------------
    # ☁️ AWS S3 (ファイルストレージ)
    # ---------------------------------------------------------
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-northeast-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "my-s3-bucket")

    # ---------------------------------------------------------
    # 🔌 外部APIキー・連携サービス
    # ---------------------------------------------------------
    FORM_API_KEY: str = os.getenv("FORM_API_KEY", "YOUR_SECRET_API_KEY")
    LINE_CHANNEL_ACCESS: str = os.getenv("LINE_CHANNEL_ACCESS", "")
    LINE_GROUP_ID: str = os.getenv("LINE_GROUP_ID", "")

    # ---------------------------------------------------------
    # 🛡️ CORS設定 (アクセスを許可するフロントエンドのURL)
    # ---------------------------------------------------------
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "https://progress-dashboard-frontend.onrender.com",
        "https://progress-dashboard-refact-2.onrender.com"
    ]

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        """環境変数からカンマ区切りの文字列で渡されたCORS設定をリストにパースする"""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        case_sensitive = True
        env_file = ".env"

# アプリケーション全体でこのインスタンスをインポートして利用する
settings = Settings()