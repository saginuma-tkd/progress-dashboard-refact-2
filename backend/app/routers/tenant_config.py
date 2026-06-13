from app.crud import crud_tenant_config
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, cast

# ご自身の環境に合わせてインポート元を調整してください
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.deps import get_current_user # ログインユーザー取得用関数
from app.crud import crud_tenant_config
from app.utils.calculator import calculate_duration

router = APIRouter()

def get_valid_tenant_id(current_user: models.User) -> int:
    if current_user.tenant_id is None:
        raise HTTPException(status_code=400, detail="Tenant ID not found for user")
    return cast(int, current_user.tenant_id)

# --- 科目 ---
@router.get("/subjects", response_model=List[schemas.SubjectResponse])
def get_subjects(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    return crud_tenant_config.get_subjects(db=db, tenant_id=tenant_id)

@router.post("/subjects", response_model=schemas.SubjectResponse)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    
    if crud_tenant_config.get_subject_by_name(db=db, tenant_id=tenant_id, name=subject.name):
        raise HTTPException(status_code=400, detail="この科目は既に登録されています")
        
    return crud_tenant_config.create_subject(db=db, subject=subject, tenant_id=tenant_id)

@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    if not crud_tenant_config.delete_subject(db=db, subject_id=subject_id, tenant_id=tenant_id):
        raise HTTPException(status_code=404, detail="指定された科目は見つかりません")
    return None

# 🌟 科目の並び替えエンドポイント（# --- 科目 --- のブロックの最後に追加）
@router.put("/subjects/reorder")
def reorder_subjects(req: schemas.BulkReorderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    crud_tenant_config.reorder_subjects(db, tenant_id, req.items)
    return {"message": "科目の並び順を更新しました"}

# --- ルートレベル ---
@router.get("/route-levels", response_model=List[schemas.RouteLevelResponse])
def get_route_levels(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    return crud_tenant_config.get_route_levels(db=db, tenant_id=tenant_id)

@router.post("/route-levels", response_model=schemas.RouteLevelResponse)
def create_route_level(route_level: schemas.RouteLevelCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    return crud_tenant_config.create_route_level(db=db, route_level=route_level, tenant_id=tenant_id)

# 🌟 ルートレベルの並び替えエンドポイント（# --- ルートレベル --- のブロックの最後に追加）
@router.put("/route-levels/reorder")
def reorder_route_levels(req: schemas.BulkReorderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    crud_tenant_config.reorder_route_levels(db, tenant_id, req.items)
    return {"message": "ルートレベルの並び順を更新しました"}

@router.delete("/route-levels/{level_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_route_level(level_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    if not crud_tenant_config.delete_route_level(db=db, level_id=level_id, tenant_id=tenant_id):
        raise HTTPException(status_code=404, detail="指定されたルートレベルは見つかりません")
    return None

@router.put("/route-levels/{level_id}")
def update_route_level(level_id: int, req: schemas.RouteLevelUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    level = db.query(models.RouteLevel).filter(models.RouteLevel.id == level_id, models.RouteLevel.tenant_id == current_user.tenant_id).first()
    if not level:
        raise HTTPException(status_code=404, detail="レベルが見つかりません")
    
    level.level_name = req.level_name
    level.sequence_order = req.sequence_order
    level.graph_line_type = req.graph_line_type
    level.show_on_graph = req.show_on_graph
    level.target_deviation = req.target_deviation
    db.commit()
    return {"message": "更新完了"}

# --- テナント設定 ---
@router.get("/settings", response_model=schemas.TenantSettingResponse)
def get_tenant_settings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    return crud_tenant_config.get_tenant_setting(db=db, tenant_id=tenant_id)

@router.put("/settings", response_model=schemas.TenantSettingResponse)
def update_tenant_settings(setting_update: schemas.TenantSettingUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant_id = get_valid_tenant_id(current_user)
    return crud_tenant_config.update_tenant_setting(db=db, setting_update=setting_update, tenant_id=tenant_id)

# ==========================================
# 🟢 所要時間計算のエンドポイント
# ==========================================

# 9. 偏差値(x)とルートレベル(y)から所要時間を計算
@router.post("/calculate-duration", response_model=schemas.DurationCalculateResponse)
def calculate_tenant_duration(
    request_data: schemas.DurationCalculateRequest, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    tenant_id = get_valid_tenant_id(current_user)
    
    # テナントの計算式設定をDBから取得
    setting = crud_tenant_config.get_tenant_setting(db=db, tenant_id=tenant_id)
    formula = setting.duration_slope_formula
    
    try:
        # 先ほど作った最強の計算エンジンに「数式」「x」「y」を渡して計算！
        result_duration = calculate_duration(
            formula_str=str(formula), 
            x=request_data.x, 
            y=request_data.y,
            t=request_data.t
        )
        
        return schemas.DurationCalculateResponse(
            duration=result_duration,
            formula_used=str(formula)
        )
        
    except ValueError as e:
        # 文法エラーやゼロ除算など、計算エンジンが弾いたエラーをそのままフロントに返す
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # 予期せぬエラー用
        raise HTTPException(status_code=500, detail="計算処理中にエラーが発生しました")