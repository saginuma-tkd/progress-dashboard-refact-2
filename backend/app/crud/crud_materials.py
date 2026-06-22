# backend/app/crud/crud_materials.py

from sqlalchemy.orm import Session
from sqlalchemy import or_  # 🌟 OR条件を使うために追加
from app.models import models
from app.routers import deps
from app.routers.deps import get_tenant_id_for_user
from app.models.models import User
from typing import List, Optional

# --- タグ操作 ---
def get_or_create_subject_tag(db: Session, name: str):
    tag = db.query(models.SubjectTag).filter(models.SubjectTag.name == name).first()
    if not tag:
        tag = models.SubjectTag(name=name)
        db.add(tag)
        db.commit()
        db.refresh(tag)
    return tag

def get_or_create_detail_tag(db: Session, name: str):
    tag = db.query(models.DetailTag).filter(models.DetailTag.name == name).first()
    if not tag:
        tag = models.DetailTag(name=name)
        db.add(tag)
        db.commit()
        db.refresh(tag)
    return tag

def get_all_subject_tags(db: Session):
    return db.query(models.SubjectTag).all()

def get_all_detail_tags(db: Session):
    return db.query(models.DetailTag).all()

def delete_subject_tag(db: Session, tag_id: int):
    tag = db.query(models.SubjectTag).filter(models.SubjectTag.id == tag_id).first()
    if tag:
        db.delete(tag)
        db.commit()
    return tag

def delete_detail_tag(db: Session, tag_id: int):
    tag = db.query(models.DetailTag).filter(models.DetailTag.id == tag_id).first()
    if tag:
        db.delete(tag)
        db.commit()
    return tag


# --- 教材操作 ---
def _set_material_tags(db: Session, db_material: models.TeachingMaterial, subject_ids: List[int], detail_tag_ids: List[int]):
    """教材にタグを紐付ける共通処理"""
    if subject_ids is not None:
        db_material.subjects = db.query(models.SubjectTag).filter(models.SubjectTag.id.in_(subject_ids)).all()
    if detail_tag_ids is not None:
        db_material.detail_tags = db.query(models.DetailTag).filter(models.DetailTag.id.in_(detail_tag_ids)).all()

def create_material(db: Session, title: str, s3_key: str, file_size: int, original_filename: str, current_user: User, internal_memo: Optional[str] = None, subject_ids: List[int] = [], detail_tag_ids: List[int] = [], category: str = "material"):
    tenant_id = get_tenant_id_for_user(db, current_user)
    
    # 🌟 追加: テナント長(developer)や開発者はテナント全体(None)、校舎長などは自分の校舎専用にする
    school_id = None if current_user.role in ["developer", "super_admin"] else current_user.school_id

    db_material = models.TeachingMaterial(
        title=title,
        s3_key=s3_key,
        file_path=s3_key,
        file_size=file_size,
        original_filename=original_filename,
        internal_memo=internal_memo,
        tenant_id=tenant_id,
        school_id=school_id, # 🌟 保存時にセット
        category=category
    )
    _set_material_tags(db, db_material, subject_ids, detail_tag_ids)
    
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material

def update_material(db: Session, material_id: int, title: str, current_user: User, s3_key: Optional[str] = None, file_size: Optional[int] = None, original_filename: Optional[str] = None, internal_memo: Optional[str] = None, subject_ids: Optional[List[int]] = None, detail_tag_ids: Optional[List[int]] = None):
    db_material = deps.get_tenant_query(db, models.TeachingMaterial, current_user).filter(models.TeachingMaterial.id == material_id).first()
    if not db_material:
        return None
        
    db_material.title = title
    db_material.internal_memo = internal_memo
    if s3_key:
        db_material.s3_key = s3_key
        db_material.file_size = file_size
        db_material.original_filename = original_filename
        
    _set_material_tags(db, db_material, subject_ids or [], detail_tag_ids or [])
    
    db.commit()
    db.refresh(db_material)
    return db_material

def get_materials(db: Session, current_user: User, subject_id: Optional[int] = None, detail_tag_id: Optional[int] = None, search_query: Optional[str] = None, category: Optional[str] = None):
    query = deps.get_tenant_query(db, models.TeachingMaterial, current_user)
    
    # 🌟 追加: 「テナント全体（school_idが空）」または「自分の校舎」のものだけを取得
    if current_user.role not in ["developer", "super_admin"]:
        query = query.filter(
            or_(
                models.TeachingMaterial.school_id == None,
                models.TeachingMaterial.school_id == current_user.school_id
            )
        )
    
    if category:
        query = query.filter(models.TeachingMaterial.category == category)
    if subject_id:
        query = query.filter(models.TeachingMaterial.subjects.any(id=subject_id))
    if detail_tag_id:
        query = query.filter(models.TeachingMaterial.detail_tags.any(id=detail_tag_id))
    if search_query:
        query = query.filter(models.TeachingMaterial.title.ilike(f"%{search_query}%"))
        
    return query.order_by(models.TeachingMaterial.created_at.desc()).all()

def get_material(db: Session, material_id: int, current_user: User):
    return db.query(models.TeachingMaterial).filter(models.TeachingMaterial.id == material_id).first().order_by(models.TeachingMaterial.id)

def delete_material(db: Session, material_id: int, current_user: User):
    db_material = get_material(db, material_id, current_user)
    if db_material:
        db.delete(db_material)
        db.commit()
    return db_material