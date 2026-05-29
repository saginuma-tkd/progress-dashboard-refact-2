# backend/set_developer.py

from app.db.database import SessionLocal
from app.models.models import User
import sys

def set_developer_role(username: str):
    # DBセッションを作成
    db = SessionLocal()
    try:
        # 指定されたユーザー名のユーザーを検索
        user = db.query(User).filter(User.username == username).first()
        
        if user:
            user.role = "developer"
            db.commit()
            print(f"✅ 成功: ユーザー '{username}' のロールを 'developer' に変更しました！")
        else:
            print(f"❌ エラー: ユーザー '{username}' が見つかりません。名前が正しいか確認してください。")
    except Exception as e:
        print(f"エラーが発生しました: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使い方: python set_developer.py <変更したいユーザー名>")
    else:
        target_username = sys.argv[1]
        set_developer_role(target_username)