import sqlite3
from passlib.context import CryptContext

# パスワードハッシュ化の設定（FastAPI本番と同じbcryptを使用）
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_first_admin():
    # ==========================================
    # ⚠️ もしDBのカラム名が違う場合はここを修正してください
    # ==========================================
    TABLE_NAME = "users"             # そのまま
    USERNAME_COL = "username"        # そのまま
    PASSWORD_COL = "password"        # 👈 'hashed_password' から 'password' に修正！
    ROLE_COL = "role"                # そのまま
    
    # 作成するアカウントの情報
    LOGIN_ID = "デバッグ用"
    PASSWORD = "debug"
    ROLE = "developer"               # 👈 ここが重要です！
    # ==========================================

    print("🔑 パスワードを暗号化中...")
    hashed_pw = pwd_context.hash(PASSWORD)

    print("💾 データベースに接続中...")
    conn = sqlite3.connect("local_dev.db")
    cursor = conn.cursor()

    try:
        # SQLを直接実行してデータをねじ込む
        sql = f"INSERT INTO {TABLE_NAME} ({USERNAME_COL}, {PASSWORD_COL}, {ROLE_COL}) VALUES (?, ?, ?)"
        cursor.execute(sql, (LOGIN_ID, hashed_pw, ROLE))
        conn.commit()
        
        print("\n🎉 大成功！最初の開発者アカウントを作成しました！")
        print("-" * 30)
        print(f"ログインID : {LOGIN_ID}")
        print(f"パスワード : {PASSWORD}")
        print(f"権限       : {ROLE}")
        print("-" * 30)
        print("さっそくReactの画面からログインしてみてください！")

    except sqlite3.OperationalError as e:
        print(f"\n🚨 テーブル名やカラム名が実際のデータベースと異なっているようです。")
        print(f"エラー詳細: {e}")
        print("backend側の Userモデル（models.pyなど）を確認して、スクリプト上部の変数名を修正してください！")
    except sqlite3.IntegrityError as e:
         print(f"\n🚨 データの一貫性エラー（IDが被っている、または必須項目が足りない等）です。")
         print(f"エラー詳細: {e}")
    except Exception as e:
        print(f"\n🚨 予期せぬエラーが発生しました: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    create_first_admin()