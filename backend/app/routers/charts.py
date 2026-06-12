from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.db.database import get_db
from app.models.models import Progress, MasterTextbook, Student
from app.crud.crud_progress import get_adjusted_duration

router = APIRouter()

# 科目リスト取得API
@router.get("/subjects/{student_id}")
def get_student_subjects(
    student_id: int,
    session: Session = Depends(get_db)
) -> List[str]:
    results = session.query(Progress.subject).filter(Progress.student_id == student_id).distinct().all()
    subjects = [r[0] for r in results]
    return ["全体"] + subjects


# チャートデータ取得API
@router.get("/progress/{student_id}")
def get_progress_chart(
    student_id: int,
    subject: Optional[str] = Query(None),
    session: Session = Depends(get_db)  # 🌟 ここが session になっています
) -> List[Dict[str, Any]]:
    
    student = session.query(Student).filter(Student.id == student_id).first()
    # 万が一studentが見つからない場合の安全対策
    if not student:
        return []

    query = session.query(Progress).filter(Progress.student_id == student_id)
    if subject and subject != "全体":
        query = query.filter(Progress.subject == subject)
    
    progress_list = query.all()
    
    book_names = list(set([item.book_name for item in progress_list if item.book_name]))
    masters = session.query(MasterTextbook).filter(MasterTextbook.book_name.in_(book_names)).all()
    master_map = { (m.subject, m.book_name): m for m in masters }
    
    if subject == "全体" or subject is None:
        aggregated_data = {}
        for item in progress_list:
            subj_name = item.subject or "その他"
            
            duration = item.duration
            book_level = item.level
            if (duration is None or duration <= 0) and item.subject and item.book_name:
                master_book = master_map.get((item.subject, item.book_name))
                if master_book:
                    duration = master_book.duration
                    if not book_level: book_level = master_book.level
            
            duration = float(duration or 0.0)
            
            # 🌟 修正1: session, student, duration, book_level を正しく渡す
            adjusted_duration = get_adjusted_duration(session, student, duration, book_level)
            
            if adjusted_duration > 0 and (item.total_units or 0) > 0:
                total_val = adjusted_duration
                completed_val = (item.completed_units / item.total_units) * adjusted_duration
            else:
                total_val = float(item.total_units or 0)
                completed_val = float(item.completed_units or 0)

            if subj_name not in aggregated_data:
                aggregated_data[subj_name] = {"completed": 0.0, "total": 0.0}
            
            aggregated_data[subj_name]["completed"] += completed_val
            aggregated_data[subj_name]["total"] += total_val
        
        response_data = [{"name": s, "completed": round(d["completed"], 1), "total": round(d["total"], 1), "type": "subject"} for s, d in aggregated_data.items()]
            
    else:
        response_data = []
        for item in progress_list:
            book_name = item.book_name or "不明な教材"
            
            duration = item.duration
            book_level = item.level
            if (duration is None or duration <= 0) and item.subject and item.book_name:
                master_book = master_map.get((item.subject, item.book_name))
                if master_book:
                    duration = master_book.duration
                    if not book_level: book_level = master_book.level
            
            duration = float(duration or 0.0)
            
            # 🌟 修正2: db ではなく session に変更して正しく渡す
            adjusted_duration = get_adjusted_duration(session, student, duration, book_level)
            
            if adjusted_duration > 0 and (item.total_units or 0) > 0:
                total_val = adjusted_duration
                completed_val = (item.completed_units / item.total_units) * adjusted_duration
            else:
                total_val = float(item.total_units or 0)
                completed_val = float(item.completed_units or 0)

            response_data.append({"name": book_name, "completed": round(completed_val, 1), "total": round(total_val, 1), "type": "book", "level": book_level})

    return response_data