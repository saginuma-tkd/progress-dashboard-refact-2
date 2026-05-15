# backend/app/routers/charts.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.db.database import get_db
from app.models.models import Progress, MasterTextbook, Student

router = APIRouter()

# --- ★修正: ご指定の偏差値連動ロジック ---
def get_adjusted_duration(base_duration: float, book_level: str, student_dev: Optional[float]) -> float:
    if not base_duration or not student_dev or not book_level:
        return float(base_duration or 0.0)

    level_map = {
        "基礎徹底": 50,
        "日大": 60,
        "MARCH": 70,
        "早慶": 75
    }

    target_dev = None
    for key, val in level_map.items():
        if key in book_level:
            target_dev = val
            break
            
    if target_dev is None: return float(base_duration)

    # (所要時間) = (マスタの所要時間) + (マスタの所要時間) * ((ルート数値) - (本人の偏差値)) * 0.025
    diff = target_dev - student_dev
    adjusted_time = base_duration + base_duration * diff * 0.025
    
    return round(max(0.1, adjusted_time), 1)


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
    session: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    
    student = session.query(Student).filter(Student.id == student_id).first()
    student_dev = getattr(student, "deviation_value", None)

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
            
            duration = float(duration or 0)
            
            adjusted_duration = get_adjusted_duration(duration, book_level, student_dev)
            
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
            
            duration = float(duration or 0)
            
            adjusted_duration = get_adjusted_duration(duration, book_level, student_dev)
            
            if adjusted_duration > 0 and (item.total_units or 0) > 0:
                total_val = adjusted_duration
                completed_val = (item.completed_units / item.total_units) * adjusted_duration
            else:
                total_val = float(item.total_units or 0)
                completed_val = float(item.completed_units or 0)

            response_data.append({"name": book_name, "completed": round(completed_val, 1), "total": round(total_val, 1), "type": "book"})

    return response_data