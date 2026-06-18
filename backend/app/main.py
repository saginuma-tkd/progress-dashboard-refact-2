"""
Main Application Entry Point
アプリケーションの起動設定、ミドルウェアの登録、APIルーターの統合を行います。
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.scheduler import start_scheduler
# from app.models import models  # DB初期化をAlembicに任せている場合は不要かも？
# from app.db.database import engine

# -------------------------------------------------------------------
# 📦 Routers (アルファベット順や機能ごとに改行すると見やすいです)
# -------------------------------------------------------------------
from app.routers import (
    admin, applications, attendance, audit, auth, backup, calendar, charts, chat,
    common, csv_import, dashboard, developer, exams, external, fix_db,
    materials, reports, routes, schools, student_report, students, system,
    system_admin, system_status, tenant_config
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    アプリケーションのライフサイクルイベント
    起動時・終了時に実行したい処理をここに記述します。
    """
    # [起動時の処理] 定期実行タスク（スケジューラー）の開始
    start_scheduler()
    
    yield  # ここでアプリケーションが実行されます
    
    # [終了時の処理] DB接続のクローズなどを記述（必要に応じて）
    pass


# -------------------------------------------------------------------
# 🚀 FastAPI Application Setup
# -------------------------------------------------------------------
app = FastAPI(
    title="Progress Dashboard API",
    description="学習進捗・校舎管理ダッシュボードのためのコアAPI",
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    lifespan=lifespan,
)


# -------------------------------------------------------------------
# 🛡️ Middleware (CORS設定など)
# -------------------------------------------------------------------
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# -------------------------------------------------------------------
# 🔗 API Routers (機能ごとにグループ化して登録)
# -------------------------------------------------------------------
API_V1 = settings.API_V1_STR

# 1. 認証 & 共通系
app.include_router(auth.router, prefix=f"{API_V1}/auth", tags=["Auth"])
app.include_router(common.router, prefix=f"{API_V1}/common", tags=["Common"])
app.include_router(external.router, prefix="/api", tags=["External"])  # 互換性維持

# 2. 生徒 & 学習進捗・レポート系
app.include_router(students.router, prefix=f"{API_V1}/students", tags=["Students"])
app.include_router(charts.router, prefix=f"{API_V1}/charts", tags=["Charts"])
app.include_router(dashboard.router, prefix=f"{API_V1}/dashboard", tags=["Dashboard"])
app.include_router(student_report.router, prefix=f"{API_V1}/student_report", tags=["Student Report"])
app.include_router(reports.router, prefix=f"{API_V1}/reports", tags=["Reports"])

# 3. カリキュラム & 教材 & 試験系
app.include_router(routes.router, prefix=f"{API_V1}/routes", tags=["Routes"])
app.include_router(materials.router, prefix=f"{API_V1}/materials", tags=["Materials"])
app.include_router(exams.router, prefix=f"{API_V1}/exams", tags=["Exams"])

# 4. 校舎運営 & コミュニケーション系
app.include_router(schools.router, prefix=f"{API_V1}/schools", tags=["Schools"])
app.include_router(attendance.router, prefix=f"{API_V1}/attendance", tags=["Attendance"])
app.include_router(applications.router, prefix=f"{API_V1}/applications", tags=["Applications"])
app.include_router(chat.router, prefix=f"{API_V1}/chat", tags=["Chat"])

# 5. テナント & システム管理・運用系
app.include_router(tenant_config.router, prefix=f"{API_V1}/tenant-config", tags=["Tenant Config"])
app.include_router(admin.router, prefix=f"{API_V1}/admin", tags=["Admin"])
app.include_router(system.router, prefix=f"{API_V1}/system", tags=["System"])
app.include_router(system_admin.router, prefix=API_V1, tags=["System Admin"])
app.include_router(system_status.router, prefix=f"{API_V1}/system_status", tags=["System Status"])
app.include_router(audit.router, prefix=f"{API_V1}/audit", tags=["Audit Logs"])
app.include_router(backup.router, prefix=f"{API_V1}/backup", tags=["Backup"])
app.include_router(csv_import.router, prefix=f"{API_V1}/csv_import", tags=["CSV Import"])
app.include_router(calendar.router, prefix="/api/v1/calendar", tags=["Calendar"])

# 6. 開発者 & メンテナンス系
app.include_router(developer.router, prefix=f"{API_V1}/developer", tags=["Developer"])
app.include_router(fix_db.router, prefix=API_V1, tags=["Fix DB"])


# -------------------------------------------------------------------
# 📍 Root Endpoint
# -------------------------------------------------------------------
@app.get("/", tags=["Root"])
def root():
    """ヘルスチェック用エンドポイント"""
    return {"message": "Hello from Progress Dashboard API"}