# backend/reset_db.py
from app.db.database import engine
from app.models import models

print("Deleting all tables...")
# 全てのテーブルを削除
models.Base.metadata.drop_all(bind=engine)
print("Deletion complete!")

print("Rebuilding tables with the latest model definitions...")
# 最新のモデル定義で作り直し
models.Base.metadata.create_all(bind=engine)
print("Rebuild complete!")