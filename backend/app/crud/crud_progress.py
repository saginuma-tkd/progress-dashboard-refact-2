from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.models.models import Progress, MasterTextbook
from app.schemas.schemas import ProgressCreate, ProgressUpdate
from typing import List

def get_student_progress(db: Session, student_id: int):
    # Join with MasterTextbook to get default duration if needed, 
    # but the logic in original app had a complex coalesce.
    # We will try to fetch Progress and map it.
    # The original app also had 'level_deviation_map' adjustment logic.
    # We should probably move that logic to the Service layer or this CRUD.
    # For now, let's just return the raw progress records plus textbook info.
    
    results = db.query(Progress, MasterTextbook).outerjoin(
        MasterTextbook, 
        (Progress.book_name == MasterTextbook.book_name) & 
        (Progress.subject == MasterTextbook.subject) & 
        (Progress.level == MasterTextbook.level)
    ).filter(Progress.student_id == student_id).all()
    
    return results

def update_student_progress(db: Session, student_id: int, progress_updates: List[ProgressUpdate]):
    # Using Postgres UPSERT (ON CONFLICT)
    # This requires using the underlying table or core insert construct with ON CONFLICT
    
    # We'll translate the logic from `add_or_update_student_progress`
    
    records = []
    for update in progress_updates:
        update_data = update.dict(exclude_unset=True)
        # Assuming validation is done, ensure IDs match
        
        # Original logic: duration = COALESCE(EXCLUDED.duration, progress.duration)
        # Postgres `insert(...).on_conflict_do_update(...)`
        
        # For simplicity in SQLAlchemy ORM, we might iterate and merge,
        # but bulk operations are better with core.
        
        record = {
            "student_id": student_id,
            "subject": update.subject,
            "level": update.level,
            "book_name": update.book_name,
            "duration": update.duration,
            "is_planned": update.is_planned,
            "is_done": update.is_done,
            "completed_units": update.completed_units if update.completed_units is not None else 0,
            "total_units": update.total_units if update.total_units is not None else 1
        }
        records.append(record)
        
    if not records:
        return 0

    stmt = insert(Progress).values(records)
    
    # Define what to update on conflict
    # We update everything provided.
    # note: "duration" logic in original was strict about maintaining existing if None passed?
    # Original: "duration = COALESCE(EXCLUDED.duration, progress.duration)"
    
    update_dict = {
        "is_planned": stmt.excluded.is_planned,
        "is_done": stmt.excluded.is_done,
        "completed_units": stmt.excluded.completed_units,
        "total_units": stmt.excluded.total_units
    }
    
    # If duration is in the update, we set it, otherwise we leave it? 
    # In the constructed 'record', duration is there (None if not provided in Pydantic defaults or passed as None).
    # If we want to preserve existing duration if new is None, we use coalesce.
    # But SQLAlchemy expression would be func.coalesce(stmt.excluded.duration, Progress.duration)
    
    from sqlalchemy import func
    update_dict["duration"] = func.coalesce(stmt.excluded.duration, Progress.duration)

    stmt = stmt.on_conflict_do_update(
        constraint='_student_prog_uc', # Matches the name in models.py
        set_=update_dict
    )
    
    db.execute(stmt)
    db.commit()
    return len(records)
