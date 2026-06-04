# backend/app/routers/system_admin.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy import text, inspect

from app.db.database import get_db
from app.models.models import Tenant, User, SystemSetting, TeachingMaterial
from app.schemas.schemas import TenantCreateWithAdmin, TenantOut
from app.routers.deps import get_current_super_admin, get_current_super_admin_user
from app.routers.auth import get_current_user
from app.core.security import get_password_hash

router = APIRouter(
    prefix="/system_admin",
    tags=["system_admin"],
    dependencies=[Depends(get_current_super_admin)]
)

@router.get("/tenants", response_model=List[TenantOut])
def get_all_tenants(db: Session = Depends(get_db)):
    return db.query(Tenant).all()

@router.post("/tenants", response_model=TenantOut)
def create_tenant_and_admin(tenant_in: TenantCreateWithAdmin, db: Session = Depends(get_db)):
    # 1. ユーザー名（メールアドレス）の重複チェック： User.email ではなく User.username
    user = db.query(User).filter(User.username == tenant_in.admin_email).first()
    if user:
        raise HTTPException(status_code=400, detail="このメールアドレス(ユーザー名)は既に登録されています")

    try:
        # 2. テナント（塾）の作成
        new_tenant = Tenant(name=tenant_in.tenant_name)
        db.add(new_tenant)
        db.flush() # IDを発番させる

        # 3. 初期管理者（塾長）の作成
        new_admin = User(
            username=tenant_in.admin_email,                       # 👈 email ではなく username
            password=get_password_hash(tenant_in.admin_password), # 👈 hashed_password ではなく password
            role="admin",
            tenant_id=new_tenant.id
            # is_active はモデルに無いので削除しました
        )
        db.add(new_admin)
        
        # 4. 全て成功したらコミット
        db.commit()
        db.refresh(new_tenant)
        return new_tenant

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"テナントの作成に失敗しました: {str(e)}")

@router.get("/stats")
def get_system_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_super_admin_user)):
    # 1. 契約テナント数
    total_tenants = db.query(func.count(Tenant.id)).scalar()
    # 2. 全システムの総ユーザー数 (生徒は除く、ログインできる全アカウント)
    total_users = db.query(func.count(User.id)).scalar()
    # 3. 全システムの総ファイル数 (S3に上がっている教材)
    total_files = db.query(func.count(TeachingMaterial.id)).scalar()
    # 4. 稼働ステータス
    settings = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    maintenance_mode = settings.maintenance_mode if settings else False

    return {
        "total_tenants": total_tenants or 0,
        "total_users": total_users or 0,
        "total_files": total_files or 0,
        "maintenance_mode": maintenance_mode
    }

# Pydanticスキーマ
class SuperAdminCreate(BaseModel):
    username: str
    password: str

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# スーパー管理者以外を弾く依存関係
def require_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="スーパー管理者権限が必要です")
    return current_user

# 1. スーパー管理者の一覧取得
@router.get("/super_admins")
def get_super_admins(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    admins = db.query(User).filter(User.role == "super_admin").all()
    return [{"id": a.id, "username": a.username, "role": a.role} for a in admins]

# 2. 新規スーパー管理者の作成
@router.post("/super_admins")
def create_super_admin(
    admin_in: SuperAdminCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_super_admin)
):
    # 重複チェック
    existing_user = db.query(User).filter(User.username == admin_in.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="このユーザー名は既に使用されています")

    hashed_password = pwd_context.hash(admin_in.password)
    
    # tenant_id, school_id は現状デフォルトのもの（1番）を入れるか、NULLを許可するか仕様に合わせます
    new_admin = User(
        username=admin_in.username,
        password=hashed_password,
        role="super_admin",
        tenant_id=1,
        school_id=1
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return {"message": "スーパー管理者を作成しました"}

# 3. スーパー管理者の削除
@router.delete("/super_admins/{admin_id}")
def delete_super_admin(
    admin_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_super_admin)
):
    admin_to_delete = db.query(User).filter(User.id == admin_id, User.role == "super_admin").first()
    if not admin_to_delete:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    # 自分自身は削除できないようにする保護
    if admin_to_delete.id == current_user.id:
        raise HTTPException(status_code=400, detail="自分自身のアカウントは削除できません")

    db.delete(admin_to_delete)
    db.commit()
    return {"message": "スーパー管理者を削除しました"}

# ==========================================
# 🗄️ RAWデータベースビューア API
# ==========================================

# 1. 存在する全テーブル名の取得
@router.get("/db/tables")
def get_all_tables(db: Session = Depends(get_db), current_user: User = Depends(require_super_admin)):
    # データベースに存在するテーブル一覧を自動取得
    inspector = inspect(db.get_bind())
    tables = inspector.get_table_names()
    return {"tables": tables}

# 2. 指定したテーブルのRAWデータを取得
@router.get("/db/tables/{table_name}")
def get_table_data(
    table_name: str, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_super_admin)
):
    # セキュリティ対策: SQLインジェクションを防ぐため、本当に存在するテーブルか確認
    inspector = inspect(db.get_bind())
    if table_name not in inspector.get_table_names():
        raise HTTPException(status_code=404, detail="指定されたテーブルが存在しません")
    
    try:
        # RAWクエリの実行（最大100件までに制限して負荷を防ぐ）
        query = text(f"SELECT * FROM {table_name} LIMIT :limit")
        result = db.execute(query, {"limit": limit})
        
        # カラム名とデータを抽出して辞書のリストに変換
        columns = list(result.keys())
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
        
        return {"columns": columns, "rows": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"データの取得に失敗しました: {str(e)}")

# ==========================================
# 汎用データ更新用スキーマ
# ==========================================
class RowUpdatePayload(BaseModel):
    table_name: str
    row_id: int
    updates: Dict[str, Any]

# 3. 指定したテーブルの特定の行を更新する
@router.put("/db/tables/row")
def update_table_row(
    payload: RowUpdatePayload,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_super_admin)
):
    inspector = inspect(db.get_bind())
    if payload.table_name not in inspector.get_table_names():
        raise HTTPException(status_code=404, detail="指定されたテーブルが存在しません")
    
    valid_columns = [col['name'] for col in inspector.get_columns(payload.table_name)]
    
    set_clauses = []
    params = {"row_id": payload.row_id}
    
    for col, val in payload.updates.items():
        if col == "id":
            continue
        if col not in valid_columns:
            raise HTTPException(status_code=400, detail=f"カラム '{col}' は存在しません")
            
        set_clauses.append(f"{col} = :{col}")
        params[col] = val
        
    if not set_clauses:
        return {"message": "更新するデータがありません"}
        
    set_clause_str = ", ".join(set_clauses)
    
    try:
        # 🌟 修正ポイント: rowcountを使わず、先にSELECTで存在確認をする
        check_query = text(f"SELECT 1 FROM {payload.table_name} WHERE id = :row_id")
        exists = db.execute(check_query, {"row_id": payload.row_id}).scalar()
        
        if not exists:
            raise HTTPException(status_code=404, detail="対象の行が見つからないか、idカラムが存在しません")

        # 存在することが確定したのでUPDATEを実行
        query = text(f"UPDATE {payload.table_name} SET {set_clause_str} WHERE id = :row_id")
        db.execute(query, params)
        db.commit()
        
        return {"message": "更新しました"}
        
    except HTTPException:
        # 404や400のエラーはそのまま返す
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"更新失敗: {str(e)}")