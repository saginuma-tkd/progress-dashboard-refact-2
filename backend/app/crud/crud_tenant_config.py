from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas

# ==========================================
# 🟢 科目 (Subject) のCRUD
# ==========================================
def get_subjects(db: Session, tenant_id: int):
    return db.query(models.Subject).filter(models.Subject.tenant_id == tenant_id).all()

def get_subject_by_name(db: Session, tenant_id: int, name: str):
    return db.query(models.Subject).filter(
        models.Subject.tenant_id == tenant_id,
        models.Subject.name == name
    ).first()

def create_subject(db: Session, subject: schemas.SubjectCreate, tenant_id: int):
    new_subject = models.Subject(tenant_id=tenant_id, name=subject.name)
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

def delete_subject(db: Session, subject_id: int, tenant_id: int):
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.tenant_id == tenant_id
    ).first()
    if subject:
        db.delete(subject)
        db.commit()
        return True
    return False

# ==========================================
# 🟢 ルートレベル (RouteLevel) のCRUD
# ==========================================
def get_route_levels(db: Session, tenant_id: int):
    return db.query(models.RouteLevel)\
        .filter(models.RouteLevel.tenant_id == tenant_id)\
        .order_by(models.RouteLevel.sequence_order.asc())\
        .all()

def create_route_level(db: Session, route_level: schemas.RouteLevelCreate, tenant_id: int):
    new_route_level = models.RouteLevel(
        tenant_id=tenant_id,
        level_name=route_level.level_name,
        sequence_order=route_level.sequence_order,
        graph_line_type=route_level.graph_line_type,
        show_on_graph=route_level.show_on_graph,
        target_deviation=route_level.target_deviation
    )
    db.add(new_route_level)
    db.commit()
    db.refresh(new_route_level)
    return new_route_level

def delete_route_level(db: Session, level_id: int, tenant_id: int):
    route_level = db.query(models.RouteLevel).filter(
        models.RouteLevel.id == level_id,
        models.RouteLevel.tenant_id == tenant_id
    ).first()
    if route_level:
        db.delete(route_level)
        db.commit()
        return True
    return False

# ==========================================
# 🟢 テナント設定 (TenantSetting) のCRUD
# ==========================================
def get_tenant_setting(db: Session, tenant_id: int):
    setting = db.query(models.TenantSetting).filter(models.TenantSetting.tenant_id == tenant_id).first()
    # 設定が存在しない場合は自動生成
    if not setting:
        setting = models.TenantSetting(
            tenant_id=tenant_id,
            duration_slope_formula="1.0 * x + 0.0 * y"
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

def update_tenant_setting(db: Session, setting_update: schemas.TenantSettingUpdate, tenant_id: int):
    setting = db.query(models.TenantSetting).filter(models.TenantSetting.tenant_id == tenant_id).first()
    
    if not setting:
        setting = models.TenantSetting(
            tenant_id=tenant_id,
            duration_slope_formula=setting_update.duration_slope_formula
        )
        db.add(setting)
    else:
        setting.duration_slope_formula = setting_update.duration_slope_formula
        
    db.commit()
    db.refresh(setting)
    return setting

# ==========================================
# 🟢 ドラッグ＆ドロップ並び替え (Reorder)
# ==========================================
def reorder_route_levels(db: Session, tenant_id: int, items: list[schemas.ReorderItem]):
    for item in items:
        db.query(models.RouteLevel).filter(
            models.RouteLevel.id == item.id,
            models.RouteLevel.tenant_id == tenant_id
        ).update({"sequence_order": item.sequence_order})
    db.commit()
    return True

def reorder_subjects(db: Session, tenant_id: int, items: list[schemas.ReorderItem]):
    for item in items:
        db.query(models.Subject).filter(
            models.Subject.id == item.id,
            models.Subject.tenant_id == tenant_id
        ).update({"sequence_order": item.sequence_order})
    db.commit()
    return True