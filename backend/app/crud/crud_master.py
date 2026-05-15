from sqlalchemy.orm import Session
from app.models.models import MasterTextbook
from app.schemas.schemas import MasterTextbookCreate
from typing import List

def get_all_subjects(db: Session) -> List[str]:
    results = db.query(MasterTextbook.subject).distinct().all()
    subjects = [r[0] for r in results]
    
    subject_order = [
        '英語', '国語', '数学', '日本史', '世界史', '政治経済', '物理', '化学', '生物'
    ]
    
    sorted_subjects = sorted(
        subjects,
        key=lambda s: (subject_order.index(s) if s in subject_order else len(subject_order), s)
    )
    return sorted_subjects

def get_master_textbooks(db: Session, subject: str = None) -> List[MasterTextbook]:
    query = db.query(MasterTextbook)
    if subject:
        query = query.filter(MasterTextbook.subject == subject)
    return query.all()

def create_master_textbook(db: Session, textbook: MasterTextbookCreate):
    db_item = MasterTextbook(**textbook.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
