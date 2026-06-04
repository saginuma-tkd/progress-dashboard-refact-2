import sys
import os
from sqlalchemy.orm import Session
from passlib.context import CryptContext

# プロジェクトのルートディレクトリをパスに追加
sys.path.append(os.getcwd())

from app.db.database import SessionLocal
from app.models.models import User

# パスワード暗号化の設定（FastAPIの標準的な方式）
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_super_admin():
    db: Session = SessionLocal()
    try:
        # ==========================================
        # 📝 ここにお好きなIDとパスワードを入力してください
        # ==========================================
        ADMIN_USERNAME = "システム管理者"
        ADMIN_PASSWORD = "admin"
        # ==========================================

        # 既に同じ名前のユーザーがいないかチェック
        existing_user = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        if existing_user:
            print(f"⚠️ ユーザー '{ADMIN_USERNAME}' は既に存在します。")
            return

        # パスワードを暗号化
        hashed_password = pwd_context.hash(ADMIN_PASSWORD)
        
        # スーパー管理者の作成
        new_admin = User(
            username=ADMIN_USERNAME,
            password=hashed_password,
            role="super_admin",
            # ※アプリの仕様に合わせて、特定の校舎に所属させるか全体(None)にするか選べます
            # 今回は先ほど作成した「武田塾(1) / 鷺沼校(1)」に一旦所属させておきます
            tenant_id=None, 
            school_id=None 
        )
        
        db.add(new_admin)
        db.commit()
        print("--- 成功 ---")
        print(f"🎉 スーパー管理者 '{ADMIN_USERNAME}' を作成しました！")
        
    except Exception as e:
        db.rollback()
        print(f"❌ エラーが発生しました: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()