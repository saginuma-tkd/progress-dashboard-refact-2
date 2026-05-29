import sys
import os
from sqlalchemy import text

# appモジュールを読み込めるようにパスを追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.db.database import engine

def main():
    print("データベースの更新を開始します...")
    
    try:
        # SQLAlchemyのエンジンを使って接続
        with engine.begin() as conn:
            # studentsテーブルにmemoカラム(TEXT型)を追加
            conn.execute(text("ALTER TABLE students ADD COLUMN memo TEXT;"))
            print("✅ studentsテーブルに『memo』カラムを正常に追加しました！")
            
    except Exception as e:
        error_msg = str(e).lower()
        # すでにカラムが存在する場合のエラー（SQLiteやPostgreSQLでの違いを吸収）
        if "duplicate column" in error_msg or "already exists" in error_msg:
            print("⚠️ memoカラムはすでに追加されています。")
        else:
            print(f"❌ エラーが発生しました: {e}")

if __name__ == "__main__":
    main()