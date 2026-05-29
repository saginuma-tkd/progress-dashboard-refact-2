# backend/bulk_password_reset.py

from app.db.database import SessionLocal
from app.models.models import User
from app.core.security import get_password_hash
import sys

def bulk_reset_passwords(new_password: str):
    db = SessionLocal()
    try:
        # developer 以外のユーザー (admin と user) をすべて取得
        users = db.query(User).filter(User.role != 'developer').all()
        
        if not users:
            print("変更対象のユーザーが見つかりません。")
            return

        # パスワードをハッシュ化
        hashed_pw = get_password_hash(new_password)
        count = 0
        
        for user in users:
            user.password = hashed_pw
            count += 1
            
        db.commit()
        print(f"✅ 成功: {count}人の講師（admin/user）のパスワードを一括で '{new_password}' に変更しました！")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使い方: python bulk_password_reset.py <新しい共通パスワード>")
        print("例: python bulk_password_reset.py ChangeMe2026!")
    else:
        new_pass = sys.argv[1]
        confirm = input(f"developer以外の全ユーザーのパスワードを '{new_pass}' に変更します。本当によろしいですか？ (y/n): ")
        if confirm.lower() == 'y':
            bulk_reset_passwords(new_pass)
        else:
            print("キャンセルしました。")