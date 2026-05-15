from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db

router = APIRouter()

@router.get("/fix-constraint")
def fix_constraint(db: Session = Depends(get_db)):
    try:
        # Check if constraint exists (postgres specific)
        check_sql = text("SELECT conname FROM pg_constraint WHERE conname = '_student_prog_uc'")
        result = db.execute(check_sql).fetchone()
        
        if result:
            return {"message": "Constraint '_student_prog_uc' already exists."}
        
        # Add constraint
        # First, remove duplicates to ensure constraint can be added
        # Keep the one with highest ID
        cleanup_sql = text("""
            DELETE FROM progress a USING (
                SELECT min(id) as id, student_id, subject, level, book_name 
                FROM progress 
                GROUP BY student_id, subject, level, book_name 
                HAVING COUNT(*) > 1
            ) b 
            WHERE a.student_id = b.student_id 
            AND a.subject = b.subject 
            AND a.level = b.level 
            AND a.book_name = b.book_name 
            AND a.id <> b.id
        """)
        db.execute(cleanup_sql)

        alter_sql = text("ALTER TABLE progress ADD CONSTRAINT _student_prog_uc UNIQUE (student_id, subject, level, book_name)")
        db.execute(alter_sql)
        db.commit()
        return {"message": "Successfully added constraint '_student_prog_uc' after cleaning duplicates."}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
