from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List
import os
import subprocess
import logging

from app.db.database import get_db, SessionLocal
from app.models.models import User, Student, SystemSetting
from app.routers.deps import get_current_developer_user
from app.routers.auth import get_password_hash
from app.routers.audit import log_action

# --- Logger Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# --- 学年自動更新のロジック (scheduler.py と同じ内容を共通化できるとベストですが、今回は直接記述します) ---
def update_grades_logic(db: Session):
    students = db.query(Student).all()
    
    grade_mapping = {
        "中1": "中2",
        "中2": "中3",
        "中3": "高1",
        "高1": "高2",
        "高2": "高3",
        "高3": "既卒"
    }
    
    updated_count = 0
    for student in students:
        if student.grade in grade_mapping:
            student.grade = grade_mapping[student.grade]
            updated_count += 1
            
    db.commit()
    return updated_count

# --- 1. 学年更新の強制実行 (Developer専用) ---
@router.post("/force-update-grades")
def force_update_grades(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer_user)
):
    try:
        updated_count = update_grades_logic(db)
        logger.info(f"👨‍💻 Developer {current_user.username} triggered force grade update. Updated {updated_count} students.")
        return {
            "message": "学年の強制更新が完了しました。",
            "updated_count": updated_count
        }
    except Exception as e:
        logger.error(f"❌ Force grade update error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="学年の更新中にエラーが発生しました。")

# --- 2. データベースのダウンロード (Admin/UserからDeveloperへ移設) ---
@router.get("/export-db")
def export_database(
    current_user: User = Depends(get_current_developer_user)
):
    # Render等の環境でのパスに注意。ここではカレントディレクトリの test.db を想定。
    # 実際の環境に合わせてパスを変更してください。
    db_path = "test.db"
    
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="データベースファイルが見つかりません。")
        
    # 現在の日時をファイル名に付与
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sqlite3" # or .db
    
    logger.info(f"👨‍💻 Developer {current_user.username} downloaded the database.")
    
    return FileResponse(
        path=db_path,
        filename=filename,
        media_type="application/octet-stream"
    )

# --- 3. システム情報の取得 (ダッシュボード表示用) ---
@router.get("/system-info")
def get_system_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer_user)
):
    # DBのサイズや最終バックアップ日時などを取得する想定（今回はモックデータを返します）
    db_size = os.path.getsize("test.db") if os.path.exists("test.db") else 0
    size_mb = round(db_size / (1024 * 1024), 2)
    
    return {
        "db_size_mb": size_mb,
        "last_backup": "未取得",
        "active_users": db.query(User).count(),
        "total_students": db.query(Student).count()
    }

# --- 設定更新用のスキーマ ---
class SystemSettingUpdate(BaseModel):
    maintenance_mode: bool
    announcement_enabled: bool
    announcement_message: str

# --- 初期設定を取得（または作成）するヘルパー関数 ---
def get_or_create_settings(db: Session):
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    if not settings:
        settings = SystemSetting(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

# --- 設定の取得API (Developer向け) ---
@router.get("/settings")
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer_user)
):
    settings = get_or_create_settings(db)
    return {
        "maintenance_mode": settings.maintenance_mode,
        "announcement_enabled": settings.announcement_enabled,
        "announcement_message": settings.announcement_message
    }

# --- 設定の更新API (Developer向け) ---
@router.put("/settings")
def update_system_settings(
    update_data: SystemSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer_user)
):
    settings = get_or_create_settings(db)
    
    settings.maintenance_mode = update_data.maintenance_mode
    settings.announcement_enabled = update_data.announcement_enabled
    settings.announcement_message = update_data.announcement_message
    
    db.commit()
    logger.info(f"👨‍💻 Developer {current_user.username} updated system settings.")
    
    return {"message": "設定を保存しました"}

# ==========================================
# スキーマ定義 (ファイルの上のほうの class SystemSettingUpdate の下あたりに追加)
# ==========================================

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: str  # 'user', 'admin', 'developer' のいずれか

class DeveloperCreate(BaseModel):
    username: str
    password: str

# ==========================================
# APIエンドポイント (ファイルの下部に追加)
# ==========================================

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_developer_user)
):
    """全ユーザーのリストと現在のロールを取得"""
    users = db.query(User).all()
    return users

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int, 
    role_data: UserRoleUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_developer_user)
):
    """特定のユーザーのロール（権限）を変更"""
    # 自分自身の権限をうっかり下げてしまわないためのガード
    if user_id == current_user.id and role_data.role != "developer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="自分自身のDeveloper権限は外せません。"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません。")

    # ロールの文字列を小文字に統一して保存
    user.role = role_data.role.lower()
    db.commit()
    logger.info(f"User {user_id} role updated to {user.role} by {current_user.username}")
    
    return {"message": "ロールを更新しました。", "new_role": user.role}

@router.post("/accounts")
def create_developer_account(
    new_dev: DeveloperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer_user)
):
    """新しい開発者アカウント(role='developer')を作成する"""
    
    # 重複チェックは username のみに変更
    existing_user = db.query(User).filter(User.username == new_dev.username).first()
    
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="このユーザー名は既に登録されています。"
        )

    hashed_pw = get_password_hash(new_dev.password)
    
    # DB保存時も email を渡さない
    db_user = User(
        username=new_dev.username,
        password=hashed_pw,
        role="developer" 
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    logger.info(f"New developer account '{db_user.username}' created by '{current_user.username}'")
    
    return {"message": f"開発者アカウント「{db_user.username}」を作成しました。"}

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int, 
    role_data: UserRoleUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_developer_user)
):
    # 自分自身の権限をうっかり下げてしまわないためのガード（既存）
    if user_id == current_user.id and role_data.role != "developer":
        raise HTTPException(status_code=400, detail="自分自身のDeveloper権限は外せません。")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません。")

    user.role = role_data.role.lower()
    db.commit()
    
    # 🌟🌟 ここに「監査ログの記録」を追加！ 🌟🌟
    # （※ user.branch_id が無いエラーが出たら、ここは None にしてください）
    log_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE_ROLE",
        branch_id=getattr(user, 'branch_id', None), # userモデルにbranch_idがあれば取得、なければNone
        details=f"ユーザーID:{user_id} ({user.username}) の権限を {user.role} に変更しました"
    )
    
    return {"message": "ロールを更新しました。", "new_role": user.role}