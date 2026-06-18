from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.models import models
import random

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

@router.post("/migrate-student-usernames")
def migrate_student_usernames(db: Session = Depends(get_db)):
    """
    既存の生徒のユーザー名を student_{id} から student_{6桁ランダム} に移行する1回限りのバッチ処理
    """
    # roleがstudentのユーザーを全取得
    students = db.query(models.User).filter(models.User.role == "student").all()
    updated_count = 0
    
    for user in students:
        # すでに "student_6桁" になっている（長さが 15文字: s-t-u-d-e-n-t-_-1-2-3-4-5-6）ものはスキップ
        if len(user.username) == 15 and user.username.startswith("student_"):
            continue

        # 新しいランダムIDを生成
        while True:
            random_digits = str(random.randint(100000, 999999))
            new_username = f"student_{random_digits}"
            
            # 重複チェック
            exists = db.query(models.User).filter(models.User.username == new_username).first()
            if not exists:
                user.username = new_username
                updated_count += 1
                break
                
    db.commit()
    return {
        "message": "生徒IDのランダム化マイグレーションが完了しました！",
        "updated_count": updated_count
    }