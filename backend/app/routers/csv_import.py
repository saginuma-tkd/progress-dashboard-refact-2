from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import csv
import io
import logging

from app.db.database import get_db
from app.models.models import MasterTextbook, Student, User, AuditLog
# ※ get_current_user があればインポートして、誰がインポートしたかログに残せます

router = APIRouter()
logger = logging.getLogger(__name__)

# ==========================================
# 1. 各データごとの「正しいフォーマット（ヘッダー）」を定義
# ==========================================
EXPECTED_HEADERS = {
    "textbook": ["subject", "level", "book_name", "duration"],
    "student": ["name", "grade", "school", "deviation_value"], # branch_id から school へ変更
    "user": ["username", "role", "school"]
}

@router.post("/upload")
async def import_csv(
    import_type: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_db)
):
    if import_type not in EXPECTED_HEADERS:
        raise HTTPException(status_code=400, detail="無効なデータ種別です")

    # ① ファイル読み込み
    contents = await file.read()
    try:
        decoded = contents.decode('utf-8-sig')
    except UnicodeDecodeError:
        try:
            decoded = contents.decode('cp932')
        except:
            raise HTTPException(status_code=400, detail="文字コードが不明です。UTF-8で保存してください。")

    # ② ★ここで確実に 'reader' を定義する！
    f = io.StringIO(decoded)
    reader = csv.DictReader(f, skipinitialspace=True) # <--- ここに引数を追加！
    
    # さらに念押しで、ヘッダー名の前後の空白を完全に除去する処理を入れると最強です
    if reader.fieldnames:
        reader.fieldnames = [name.strip() for name in reader.fieldnames]

    actual_cols = reader.fieldnames
    if not actual_cols:
        raise HTTPException(status_code=400, detail="CSVが空です")

    # ヘッダーチェック
    expected_cols = EXPECTED_HEADERS[import_type]
    missing = [c for c in expected_cols if c not in actual_cols]
    if missing:
        raise HTTPException(status_code=400, detail=f"列が足りません: {', '.join(missing)}")

    success_count = 0
    update_count = 0

    # ③ 保存処理
    try:
        for row in reader:
            if import_type == "textbook":
                # 数値変換の安全策
                try:
                    dur = float(row["duration"]) if row.get("duration") else 0.0
                except: dur = 0.0

                existing = session.query(MasterTextbook).filter(
                    MasterTextbook.subject == row["subject"],
                    MasterTextbook.book_name == row["book_name"]
                ).first()
                if existing:
                    existing.level = row["level"]
                    existing.duration = dur
                    update_count += 1
                else:
                    session.add(MasterTextbook(
                        subject=row["subject"], level=row["level"],
                        book_name=row["book_name"], duration=dur
                    ))
                    success_count += 1

            elif import_type == "student":
                try:
                    dev = float(row["deviation_value"]) if row.get("deviation_value") else None
                except: dev = None

                existing = session.query(Student).filter(
                    Student.name == row["name"], Student.school == row["school"]
                ).first()
                if existing:
                    existing.grade = row["grade"]
                    existing.deviation_value = dev
                    update_count += 1
                else:
                    session.add(Student(
                        name=row["name"], grade=row["grade"],
                        school=row["school"], deviation_value=dev
                    ))
                    success_count += 1

        session.commit()
        return {"message": f"インポート完了！\n新規: {success_count}件\n更新: {update_count}件"}

    except Exception as e:
        session.rollback()
        logger.error(f"Import Error: {e}")
        raise HTTPException(status_code=500, detail=f"保存失敗: {str(e)}")