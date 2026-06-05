from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import User
# ※ ハッシュ化関数はご自身のプロジェクトの import パスに合わせてください
from app.core.security import get_password_hash 

def setup_common_password():
    db: Session = SessionLocal()
    
    # 🌟 ここで配る共通パスワードを設定
    common_password = "password123" 
    hashed = get_password_hash(common_password)

    try:
        # 生徒ユーザーを全員取得
        students = db.query(User).filter(User.role == "student").all()
        
        count = 0
        for student in students:
            student.hashed_password = hashed
            count += 1
            
        db.commit()
        print(f"🎉 {count}人の生徒に共通パスワード '{common_password}' を一括設定しました！")

    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_common_password()