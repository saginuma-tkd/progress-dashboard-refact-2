from app.db.database import engine, Base
import app.models  # モデルを読み込ませる

# データベースに現在のテーブルをすべて作成する
Base.metadata.create_all(bind=engine)
print("ローカルDBの初期化が完了しました！")