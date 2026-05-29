import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from app.db.database import engine

def main():
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE student_instructors ADD COLUMN memo TEXT;"))
            print("✅ student_instructorsテーブルに『memo』カラムを正常に追加しました！")
    except Exception as e:
        error_msg = str(e).lower()
        if "duplicate column" in error_msg or "already exists" in error_msg:
            print("⚠️ memoカラムはすでに追加されています。")
        else:
            print(f"❌ エラーが発生しました: {e}")

if __name__ == "__main__":
    main()