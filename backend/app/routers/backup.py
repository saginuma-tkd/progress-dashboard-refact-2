import shutil
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime

from app.core.config import settings 
# 🌟 認証用の関数とUserモデルをインポート
from app.routers.deps import get_current_super_admin_user
from app.models.models import User

router = APIRouter()

# settings.DATABASE_URL からファイルパスを抽出する
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///"):
    # "sqlite:///./app.db" から "./app.db" だけを取り出す
    DB_FILE_PATH = Path(db_url.replace("sqlite:///", ""))
else:
    # 万が一見つからなかった場合の保険
    DB_FILE_PATH = Path("./app.db")

# ==================================
# バックアップのダウンロード (GET)
# ==================================
@router.get("/export")
def export_db(
    # 🌟 ノーガードだった部分にスーパー管理者の認証を追加！！
    current_user: User = Depends(get_current_super_admin_user)
):
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
    # 🌟 ここにもスーパー管理者の認証を追加！！
    current_user: User = Depends(get_current_super_admin_user)
):
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