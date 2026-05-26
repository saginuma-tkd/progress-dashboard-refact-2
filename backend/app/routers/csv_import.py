from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import csv
import io
import logging

from app.db.database import get_db
from app.models.models import MasterTextbook, Student, User
from app.routers.deps import get_current_developer_user
from app.core.security import get_password_hash

router = APIRouter()
logger = logging.getLogger(__name__)

# ==========================================
# 各データごとの「正しいフォーマット（ヘッダー）」を定義
# ==========================================
EXPECTED_HEADERS = {
    "textbook": ["subject", "level", "book_name", "duration"],
    "student":  ["name", "grade", "school", "deviation_value"],
    "user":     ["username", "password", "role", "school"],
}


@router.post("/upload")
async def import_csv(
    import_type: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_db),
    current_user: User = Depends(get_current_developer_user),  # 🔒 権限チェック追加
):
    if import_type not in EXPECTED_HEADERS:
        raise HTTPException(status_code=400, detail="無効なデータ種別です")

    # ① ファイル読み込み（UTF-8 / Shift-JIS 両対応）
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded = contents.decode("cp932")
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="文字コードが不明です。UTF-8で保存してください。",
            )

    # ② CSVパース（ヘッダー空白除去）
    f = io.StringIO(decoded)
    reader = csv.DictReader(f, skipinitialspace=True)
    if reader.fieldnames:
        reader.fieldnames = [name.strip() for name in reader.fieldnames]

    actual_cols = reader.fieldnames
    if not actual_cols:
        raise HTTPException(status_code=400, detail="CSVが空です")

    expected_cols = EXPECTED_HEADERS[import_type]
    missing = [c for c in expected_cols if c not in actual_cols]
    if missing:
        raise HTTPException(
            status_code=400, detail=f"列が足りません: {', '.join(missing)}"
        )

    success_count = 0
    update_count = 0

    # ③ 保存処理
    try:
        for row in reader:
            # 空行スキップ
            if not any(v.strip() for v in row.values() if v):
                continue

            # --------------------------------------------------
            # textbook: subject + level + book_name で重複チェック
            # (DBのユニーク制約: subject, level, book_name, tenant_id, school_id)
            # CSVインポートはグローバルスコープ（tenant_id/school_id=NULL）として登録
            # --------------------------------------------------
            if import_type == "textbook":
                try:
                    dur = float(row["duration"]) if row.get("duration", "").strip() else 0.0
                except (ValueError, TypeError):
                    dur = 0.0

                existing = session.query(MasterTextbook).filter(
                    MasterTextbook.subject   == row["subject"].strip(),
                    MasterTextbook.level     == row["level"].strip(),
                    MasterTextbook.book_name == row["book_name"].strip(),
                    MasterTextbook.tenant_id.is_(None),
                    MasterTextbook.school_id.is_(None),
                ).first()

                if existing:
                    existing.duration = dur
                    update_count += 1
                else:
                    session.add(MasterTextbook(
                        subject=row["subject"].strip(),
                        level=row["level"].strip(),
                        book_name=row["book_name"].strip(),
                        duration=dur,
                        tenant_id=None,
                        school_id=None,
                    ))
                    success_count += 1

            # --------------------------------------------------
            # student: name + school（文字列）で重複チェック
            # school_id はオプション項目のため、文字列フィールドで照合
            # --------------------------------------------------
            elif import_type == "student":
                try:
                    dev = float(row["deviation_value"]) if row.get("deviation_value", "").strip() else None
                except (ValueError, TypeError):
                    dev = None

                existing = session.query(Student).filter(
                    Student.name   == row["name"].strip(),
                    Student.school == row["school"].strip(),
                ).first()

                if existing:
                    existing.grade           = row["grade"].strip()
                    existing.deviation_value = dev
                    update_count += 1
                else:
                    session.add(Student(
                        name=row["name"].strip(),
                        grade=row["grade"].strip(),
                        school=row["school"].strip(),
                        deviation_value=dev,
                    ))
                    success_count += 1

            # --------------------------------------------------
            # user: username で重複チェック
            # password は必ずハッシュ化して保存
            # --------------------------------------------------
            elif import_type == "user":
                username = row["username"].strip()
                password = row["password"].strip()
                role     = row["role"].strip()
                school   = row.get("school", "").strip()

                if not username or not password:
                    logger.warning(f"username/password が空のためスキップ: {row}")
                    continue

                # role のバリデーション
                allowed_roles = {"user", "admin"}
                if role not in allowed_roles:
                    raise HTTPException(
                        status_code=400,
                        detail=f"無効なロール '{role}' です。使用可能: {', '.join(sorted(allowed_roles))}",
                    )

                existing = session.query(User).filter(
                    User.username == username
                ).first()

                hashed_pw = get_password_hash(password)

                if existing:
                    existing.role   = role
                    existing.school = school
                    # パスワードは明示的に平文が渡された場合のみ更新
                    if not password.startswith("$2b$") and not password.startswith("$2a$"):
                        existing.password = hashed_pw
                    update_count += 1
                else:
                    session.add(User(
                        username=username,
                        password=hashed_pw,
                        role=role,
                        school=school,
                    ))
                    success_count += 1

        session.commit()
        return {
            "message": f"インポート完了！\n新規: {success_count}件\n更新: {update_count}件"
        }

    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Import Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"保存失敗: {str(e)}")