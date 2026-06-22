# backend/app/crud/crud_master.py

from sqlalchemy.orm import Session
from sqlalchemy import or_ # 🌟 OR条件用
from app.models.models import MasterTextbook, User, Subject
from app.schemas.schemas import MasterTextbookCreate
from typing import List, Optional

def get_all_subjects(db: Session, current_user: Optional[User] = None) -> List[str]:
    # 🌟 修正: MasterTextbookから科目を抽出するのではなく、
    # 🌟 テナントの「設定（Subjectテーブル）」から科目一覧を取得する
    
    if current_user and current_user.tenant_id:
        # テナントの科目マスタを取得（ID順＝追加された順にソート）
        subjects = db.query(Subject).filter(
            Subject.tenant_id == current_user.tenant_id
        ).order_by(Subject.id).all()
        
        # 名前だけのリストにして返す
        return [s.name for s in subjects]
        
    else:
        # 万が一 current_user がない場合（初期シード時など）は、これまで通りMasterTextbookから拾う
        query = db.query(MasterTextbook.subject).distinct().order_by(MasterTextbook.id).all()
        results = query.all()
        return [r[0] for r in results]

def get_master_textbooks(db: Session, subject: Optional[str] = None, current_user: Optional[User] = None) -> List[MasterTextbook]:
    query = db.query(MasterTextbook).order_by(MasterTextbook.id).all()
    
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