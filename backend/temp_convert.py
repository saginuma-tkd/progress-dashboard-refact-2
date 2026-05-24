import os

base_dir = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(base_dir, "app", "models", "models.py")

print(f"Target file: {file_path}")

if not os.path.exists(file_path):
    print("Error: Target file does not exist!")
    exit(1)

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. ORMモデル定義の ` = Column(` を ` = mapped_column(` に置換
content = content.replace(" = Column(", " = mapped_column(")

# 2. インポート文の修正
content = content.replace(
    "from sqlalchemy.orm import relationship, Mapped",
    "from sqlalchemy.orm import relationship, Mapped, mapped_column"
)

# 3. 先頭の `# pyright: reportAssignmentType=false` を削除（もはや不要なため）
content = content.replace("# pyright: reportAssignmentType=false\n", "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Conversion complete!")
