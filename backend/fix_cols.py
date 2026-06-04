import sys
import os
from sqlalchemy import text

# プロジェクトのルートディレクトリをパスに追加
sys.path.append(os.getcwd())

from app.db.database import SessionLocal

def fix_columns():
    db = SessionLocal()
    
    # 追加し忘れていた日時カラムのSQL文
    queries = [
        "ALTER TABLE absence_reports ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE absence_reports ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE transfer_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE transfer_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
    ]
    
    print("--- 不足している日時カラムの追加を開始します ---")
    for q in queries:
        try:
            db.execute(text(q))
            db.commit()
            print(f"✅ 成功: カラムを追加しました")
        except Exception as e:
            db.rollback()
            print(f"⚠️ スキップ (既に追加されているかエラー): {e}")
            
    db.close()
    print("🎉 完了しました！")

if __name__ == "__main__":
    fix_columns()