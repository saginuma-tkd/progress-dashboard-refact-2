from sqlalchemy import text
from app.db.database import engine

def alter_column():
    with engine.connect() as conn:
        try:
            # PostgreSQLの場合: TYPEをVARCHARに変更
            conn.execute(text("ALTER TABLE eiken_results ALTER COLUMN exam_date TYPE VARCHAR;"))
            conn.commit()
            print("Successfully changed 'exam_date' column type to VARCHAR.")
        except Exception as e:
            print(f"Error: {e}")
            # SQLiteの場合 (ALTER COLUMNが使えないため、エラーが出たらこちらを試行)
            # SQLiteではDate型も実質文字列なのでそのままでも動くことが多いですが、
            # 厳密にはテーブル再作成が必要です。
            # 今回はPostgreSQL(Render)想定で上記のコマンドを優先します。

if __name__ == "__main__":
    alter_column()
