# backend/app/crud/crud_master.py

from sqlalchemy.orm import Session
from sqlalchemy import or_ # 🌟 OR条件用
from app.models.models import MasterTextbook, User
from app.schemas.schemas import MasterTextbookCreate
from typing import List, Optional

def get_all_subjects(db: Session, current_user: Optional[User] = None) -> List[str]:
    query = db.query(MasterTextbook.subject).distinct()
    
    # 🌟 追加: 権限に応じて取得する科目を絞る
    if current_user and current_user.tenant_id:
        condition = (MasterTextbook.tenant_id == current_user.tenant_id) & \
                    or_(MasterTextbook.school_id == None, MasterTextbook.school_id == current_user.school_id)
        query = query.filter(condition)

    results = query.all()
    subjects = [r[0] for r in results]
    
    subject_order = [
        '英語', '国語', '数学', '日本史', '世界史', '政治経済', '物理', '化学', '生物'
    ]
    
    sorted_subjects = sorted(
        subjects,
        key=lambda s: (subject_order.index(s) if s in subject_order else len(subject_order), s)
    )
    return sorted_subjects

def get_master_textbooks(db: Session, subject: Optional[str] = None, current_user: Optional[User] = None) -> List[MasterTextbook]:
    query = db.query(MasterTextbook)
    
    # 🌟 追加: テナント全体用か自分の校舎用の参考書だけ取得
    if current_user and current_user.tenant_id:
        condition = (MasterTextbook.tenant_id == current_user.tenant_id) & \
                    or_(MasterTextbook.school_id == None, MasterTextbook.school_id == current_user.school_id)
        query = query.filter(condition)

    if subject:
        query = query.filter(MasterTextbook.subject == subject)
    return query.all()

def create_master_textbook(db: Session, textbook: MasterTextbookCreate, current_user: Optional[User] = None):
    db_item = MasterTextbook(**textbook.dict())
    
    # 🌟 追加: 保存時に権限に応じて校舎IDを割り振る
    if current_user and current_user.tenant_id:
        db_item.tenant_id = current_user.tenant_id
        db_item.school_id = None if current_user.role in ["developer", "super_admin"] else current_user.school_id

    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item