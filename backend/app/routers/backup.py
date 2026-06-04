import shutil
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime

from app.core.config import settings 
# 🌟 認証用の関数とUserモデルをインポート
from app.routers.deps import get_current_super_admin_user
from app.routers.auth import get_current_user
from app.models.models import User

router = APIRouter()

# ==========================================
# 🚨 スーパー管理者権限のチェック
# ==========================================
def get_current_super_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="スーパー管理者権限が必要です")
    return current_user

# ==========================================
# DB環境の判定
# ==========================================
is_postgres = settings.DATABASE_URL.startswith("postgresql")

if not is_postgres:
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        DB_FILE_PATH = Path(db_url.replace("sqlite:///", ""))
    else:
        DB_FILE_PATH = Path("./app.db")
else:
    DB_FILE_PATH = None

# ==================================
# バックアップのダウンロード (GET)
# ==================================
@router.get("/export")
def export_db(current_user: User = Depends(get_current_super_admin_user)):
    if is_postgres:
        raise HTTPException(
            status_code=400, 
            detail="【本番環境】バックアップはRenderダッシュボードの「Backups」タブからダウンロードしてください。"
        )
        
    # 🌟 型チェッカーを安心させるための直接チェック
    if DB_FILE_PATH is None:
        raise HTTPException(status_code=500, detail="DBのパスが設定されていません")

    if not DB_FILE_PATH.exists():
        raise HTTPException(status_code=404, detail="DBファイルが見つかりません")
    
    # OSを問わず使える一時フォルダを取得
    temp_path = Path(os.environ.get("TEMP", "/tmp")) / f"backup_{DB_FILE_PATH.name}"
    shutil.copy2(DB_FILE_PATH, temp_path)
    
    return FileResponse(
        path=temp_path,
        filename=f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db",
        media_type='application/x-sqlite3'
    )

# ==================================
# データベースのアップロード復元 (POST)
# ==================================
@router.post("/import")
async def import_db(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_super_admin_user)
):
    if is_postgres:
        raise HTTPException(
            status_code=400, 
            detail="【本番環境】データベース破損を防ぐため、アプリからの復元はロックされています。Renderの管理画面から実行してください。"
        )

    # 🌟 型チェッカーを安心させるための直接チェック
    if DB_FILE_PATH is None:
        raise HTTPException(status_code=500, detail="DBのパスが設定されていません")

    if not file.filename or not file.filename.endswith(".db"):
        raise HTTPException(status_code=400, detail=" .db ファイルを選択してください")

    try:
        # バックアップをとってから上書き
        backup_old = DB_FILE_PATH.with_suffix(".db.bak")
        shutil.copy2(DB_FILE_PATH, backup_old)
        
        with open(DB_FILE_PATH, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"message": "復元成功。反映にはサーバーの再起動が必要です。"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"復元失敗: {str(e)}")