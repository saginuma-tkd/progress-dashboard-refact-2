from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import List, cast
from pydantic import BaseModel
from passlib.context import CryptContext
from app.db.database import get_db
from app.routers import deps
from app.schemas import schemas
from app.models import models
from app.crud import crud_master, crud_user, crud_student
from app.routers.audit import log_action
import traceback
from app.routers.deps import get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Dependency to check if user is admin
def get_current_admin(current_user: models.User = Depends(deps.get_current_user)):
    if current_user.role not in ['admin', 'developer']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

# 1. 新規登録
@router.post("/textbooks")
def create_textbook(
    data: schemas.MasterTextbookCreate, 
    session: Session = Depends(get_db)
):
    # 重複チェック
    existing = session.query(models.MasterTextbook).filter(
        models.MasterTextbook.book_name == data.book_name,
        models.MasterTextbook.subject == data.subject
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Textbook already exists")

    new_book = models.MasterTextbook(
        subject=data.subject,
        level=data.level,
        book_name=data.book_name,
        duration=data.duration
    )
    session.add(new_book)
    session.commit()
    session.refresh(new_book)
    return new_book

# 2. 更新
@router.patch("/textbooks/{book_id}")
def update_textbook(
    book_id: int,
    data: schemas.MasterTextbookUpdate,
    session: Session = Depends(get_db)
):
    book = session.query(models.MasterTextbook).filter(models.MasterTextbook.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Textbook not found")
    
    if data.subject is not None:
        book.subject = data.subject
    if data.level is not None:
        book.level = data.level
    if data.book_name is not None:
        book.book_name = data.book_name
    if data.duration is not None:
        book.duration = data.duration

    session.commit()
    session.refresh(book)
    return book

# 3. 削除
@router.delete("/textbooks/{book_id}")
def delete_textbook(book_id: int, session: Session = Depends(get_db)):
    book = session.query(models.MasterTextbook).filter(models.MasterTextbook.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Textbook not found")
    
    session.delete(book)
    session.commit()
    return {"message": "Deleted successfully"}

# --- Preset Management API ---

# 1. プリセット一覧取得
@router.get("/presets")
def get_admin_presets(session: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    presets = deps.get_tenant_query(session, models.BulkPreset, current_user).options(joinedload(models.BulkPreset.books)).all()
    # シンプルな形式で返す
    return [
        {
            "id": p.id,
            "preset_name": p.preset_name,
            "subject": p.subject,
            "books": [b.book_name for b in p.books]
        }
        for p in presets
    ]

# 2. プリセット作成
@router.post("/presets")
def create_preset(
    data: schemas.BulkPresetCreate,
    session: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # 重複チェック
    existing = deps.get_tenant_query(session, models.BulkPreset, current_user).filter(
        models.BulkPreset.subject == data.subject,
        models.BulkPreset.preset_name == data.preset_name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Preset already exists")

    # プリセット親作成
    new_preset = models.BulkPreset(
        subject=data.subject,
        preset_name=data.preset_name,
        tenant_id=current_user.tenant_id
    )
    session.add(new_preset)
    session.flush() # ID生成のため

    # 子（本）作成
    for book_name in data.book_names:
        new_book = models.BulkPresetBook(
            preset_id=new_preset.id,
            book_name=book_name
        )
        session.add(new_book)
    
    session.commit()
    return {"message": "Preset created successfully"}

# 3. プリセット削除
@router.delete("/presets/{preset_id}")
def delete_preset(preset_id: int, session: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    preset = deps.get_tenant_query(session, models.BulkPreset, current_user).filter(models.BulkPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    session.delete(preset)
    session.commit()
    return {"message": "Deleted successfully"}

@router.put("/presets/{preset_id}")
def update_preset(
    preset_id: int,
    data: schemas.BulkPresetUpdate,
    session: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    preset = deps.get_tenant_query(session, models.BulkPreset, current_user).filter(models.BulkPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    if data.preset_name is not None:
        preset.preset_name = data.preset_name
    if data.subject is not None:
        preset.subject = data.subject
    
    if data.book_names is not None:
        # 既存の紐付けを削除して再登録
        session.query(models.BulkPresetBook).filter(models.BulkPresetBook.preset_id == preset.id).delete()
        for book_name in data.book_names:
            new_book = models.BulkPresetBook(
                preset_id=preset.id,
                book_name=book_name
            )
            session.add(new_book)
            
    session.commit()
    return {"message": "Updated successfully"}

@router.get("/schools", response_model=List[str])
def get_schools(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_admin_user)
):
    # ユーザーテーブルに存在する校舎の一覧を重複なしで取得
    schools = db.query(models.User.school).filter(models.User.school != "", models.User.school.isnot(None)).distinct().all()
    return [s[0] for s in schools]

@router.get("/users", response_model=List[schemas.User])
def read_users(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    query = db.query(models.User)
    if admin.role == 'admin':
        query = query.filter(models.User.school == admin.school)
    return query.offset(skip).limit(limit).all()

@router.get("/mock_exams")
def get_all_mock_exams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_admin_user)
):
    try:
        query = db.query(
            models.MockExamResult,
            models.Student.name.label("student_name")
        ).join(models.Student, models.MockExamResult.student_id == models.Student.id)

        # adminの場合は自校舎の生徒の模試結果のみに絞る
        if current_user.role == 'admin':
            query = query.filter(models.Student.school == current_user.school)

        results = db.query(
            models.MockExamResult,
            models.Student.name.label("student_name")
        ).join(models.Student, models.MockExamResult.student_id == models.Student.id)\
         .order_by(models.MockExamResult.exam_date.desc()).all()
        
        final_list = []

        for record, student_name in results:
            # モデル定義（subject_xxx_xxx）に基づいた科目マップ
            # (表示名, 記述式のカラム名, マーク式のカラム名)
            subject_configs = [
                ("英語", "subject_english_desc", "subject_english_r_mark"),
                ("数学", "subject_math_desc", "subject_math1a_mark"),
                ("国語", "subject_kokugo_desc", "subject_kokugo_mark"),
                ("理科1", "subject_rika1_desc", "subject_rika1_mark"),
                ("理科2", "subject_rika2_desc", "subject_rika2_mark"),
                ("社会1", "subject_shakai1_desc", "subject_shakai1_mark"),
                ("社会2", "subject_shakai2_desc", "subject_shakai2_mark"),
                ("理科基礎1", None, "subject_rika_kiso1_mark"),
                ("理科基礎2", None, "subject_rika_kiso2_mark"),
                ("情報", None, "subject_info_mark"),
            ]

            for label, desc_col, mark_col in subject_configs:
                score_desc = getattr(record, desc_col, None) if desc_col else None
                score_mark = getattr(record, mark_col, None) if mark_col else None
                
                # いずれかに値があればデータ行を作成
                if score_desc is not None or score_mark is not None:
                    # 両方ある場合は（英語のR/L合算などの複雑化を避け）優先順位で取得
                    val = score_desc if score_desc is not None else score_mark
                    
                    final_list.append({
                        "id": f"{record.id}_{label}", 
                        "student_name": student_name,
                        "student_grade": record.grade, # MockExamResultのgradeを使用
                        "exam_name": f"{record.mock_exam_name} (第{record.round}回)",
                        "subject": label,
                        "score": val,
                        "deviation": None, # 必要に応じてモデルにdeviationカラムを追加してください
                        "exam_date": record.exam_date.strftime('%Y-%m-%d') if record.exam_date else "不明"
                    })

        return final_list

    except Exception as e:
        print("ERROR in get_all_mock_exams:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

# -------------------------------------------
#  講師 (User) 管理 API
# -------------------------------------------

@router.get("/instructors")
def read_instructors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_admin_user)
):
    return crud_user.get_users(db, current_user)

# ==========================================
# 1. 受け取るデータの「設計図」を作る
# ==========================================
class AdminUserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"  # 指定がなければ一般講師(user)
    school: str = ""    # 指定がなければ空文字

# ==========================================
# 2. API本体 (dictではなく設計図を使う！)
# ==========================================
@router.post("/users")
def create_user(
    user_in: AdminUserCreate, # ← 🌟 ここを変更！
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_admin_user)
):

    # 管理者ユーザーの校舎取得(ユーザーの校舎のみを表示。developerはどの校舎も表示可能)
    if current_user.role == "admin":
        user_in.school = current_user.school or ""

    # ユーザー名重複チェック
    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # パスワードハッシュ化
    hashed_pw = pwd_context.hash(user_in.password)
    
    # データベースに保存
    new_user = models.User(
        username=user_in.username,
        password=hashed_pw,
        role=user_in.role,
        school=user_in.school  # ← user_in.school でアクセスできます！
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 🌟🌟 せっかくなので、ここにも監査ログを仕込みましょう！ 🌟🌟
    # ※ファイル上部で `from app.routers.audit import log_action` している前提です
    try:
        log_action(
            db=db,
            user_id=cast(int, current_user.id),
            action="CREATE_USER",
            branch_id=getattr(current_user, 'branch_id', None),
            details=f"新規ユーザー '{new_user.username}' (校舎: {new_user.school}) を作成しました"
        )
    except Exception as e:
        print(f"監査ログの記録に失敗しましたが、ユーザー作成は継続します: {e}")

    return new_user

@router.patch("/users/{user_id}")
def update_user(
    user_id: int, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_admin_user)
):
    # 🌟 修正ポイント1：まずはデータベースから対象のユーザーを探して `user` 変数に入れる！
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    # 🌟 修正ポイント2：もしユーザーが存在しなかったら404エラーを返す
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # adminは別校舎のユーザーを編集できないように保護
    if current_user.role == 'admin' and user.school != current_user.school:
        raise HTTPException(status_code=403, detail="Cannot edit users from other schools")

    for key, value in data.items():
        if key == "password": 
            str_val = str(value).strip() if value else ""
            if str_val and not str_val.startswith("$2b$") and not str_val.startswith("$2a$") and str_val != "********":
                user.password = pwd_context.hash(str_val)
        elif hasattr(user, key) and key != "id": 
            # adminは他人のroleをdeveloperに引き上げることはできない等の保護（任意）
            if key == "role" and current_user.role == 'admin' and value == 'developer':
                raise HTTPException(status_code=403, detail="Admin cannot create developer")
            setattr(user, key, value)
            
    db.commit()
    db.refresh(user) # 念のため最新のDBの状態を反映させる
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_admin_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
    return {"message": "Deleted"}


# -------------------------------------------
#  生徒 (Student) 管理 API
# -------------------------------------------

@router.get("/students_list")
def read_students_with_details(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_admin_user)
):
    students = crud_student.get_students_for_user(db, current_user)
    results = []
    
    for s in students:
        main_inst = None
        sub_insts = []
        
        # 講師情報の取得
        # models.StudentInstructor の定義に従い、is_main (Integer) を判定
        try:
            if hasattr(s, "instructors"):
                for link in s.instructors:
                    if link.user:
                        info = {"id": link.user.id, "name": link.user.username}
                        # is_main == 1 をメイン講師とする
                        if link.is_main == 1:
                            main_inst = info
                        else:
                            sub_insts.append(info)
        except Exception:
            pass

        results.append({
            "id": s.id,
            "name": s.name,
            "grade": getattr(s, "grade", None),
            "school": getattr(s, "school", ""), # 塾の校舎名
            "previous_school": getattr(s, "previous_school", ""), # 在籍/出身校
            "deviation_value": getattr(s, "deviation_value", None),
            "target_level": getattr(s, "target_level", ""),
            "main_instructor": main_inst,
            "sub_instructors": sub_insts,
            "main_instructor_id": main_inst["id"] if main_inst else 0,
            "sub_instructor_ids": [sub["id"] for sub in sub_insts],
        })
    return results

@router.post("/students")
def create_student(
    data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_admin_user)
):
    # adminが生徒を作成する場合、強制的に自分の校舎を設定
    target_school = data.get("school", "未設定")
    if current_user.role == 'admin':
        target_school = current_user.school

    new_student = models.Student(
        name=data["name"],
        school=target_school,
        grade=data.get("grade"),
        previous_school=data.get("previous_school"), # 在籍/出身校
        deviation_value=data.get("deviation_value"),
        target_level=data.get("target_level")
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # 講師設定 (is_main=1 or 0)
    if data.get("main_instructor_id"):
        db.add(models.StudentInstructor(
            student_id=new_student.id, 
            user_id=data["main_instructor_id"], 
            is_main=1 # Integer
        ))
    
    if "sub_instructor_ids" in data and isinstance(data["sub_instructor_ids"], list):
        for sub_id in data["sub_instructor_ids"]:
            if sub_id:
                db.add(models.StudentInstructor(
                    student_id=new_student.id, 
                    user_id=sub_id, 
                    is_main=0 # Integer
                ))
    
    db.commit()
    return new_student

@router.patch("/students/{student_id}")
def update_student(
    student_id: int, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_admin_user)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student: raise HTTPException(404, "Student not found")

    # adminは別校舎の生徒を編集できない保護
    if current_user.role == 'admin' and student.school != current_user.school:
        raise HTTPException(status_code=403, detail="Cannot edit students from other schools")

    fields = ["name", "grade", "school", "previous_school", "deviation_value", "target_level"]
    for f in fields:
        if f in data and hasattr(student, f):
            # adminは校舎を変更できない保護
            if f == "school" and current_user.role == 'admin' and data[f] != current_user.school:
                continue
            setattr(student, f, data[f])

    # 講師設定の更新
    # 既存の紐付けを一度削除してから再登録する方式で更新
    
    # メイン講師 (is_main=1) の更新
    if "main_instructor_id" in data:
        # 既存のメイン講師を削除
        db.query(models.StudentInstructor).filter(
            models.StudentInstructor.student_id == student_id,
            models.StudentInstructor.is_main == 1
        ).delete()
        
        # 新しいメイン講師を追加
        if data["main_instructor_id"]:
            db.add(models.StudentInstructor(
                student_id=student_id, 
                user_id=data["main_instructor_id"], 
                is_main=1
            ))

    # サブ講師 (is_main=0) の更新
    if "sub_instructor_ids" in data and isinstance(data["sub_instructor_ids"], list):
        # 既存のサブ講師を削除
        db.query(models.StudentInstructor).filter(
            models.StudentInstructor.student_id == student_id,
            models.StudentInstructor.is_main == 0
        ).delete()
        
        # 新しいサブ講師を追加
        for sub_id in data["sub_instructor_ids"]:
            if sub_id:
                db.add(models.StudentInstructor(
                    student_id=student_id, 
                    user_id=sub_id, 
                    is_main=0
                ))

    db.commit()
    return {"status": "updated"}

@router.delete("/students/{student_id}")
def delete_student(
    student_id: int, 
    db: Session = Depends(get_db),
    # 🌟 これを必ず追加して、AdminとDeveloper以外は削除できないようにする！
    current_user: models.User = Depends(deps.get_current_admin_user)
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    
    # adminは別校舎の生徒を削除できないようにする保護（任意）
    if student and current_user.role == 'admin' and student.school != current_user.school:
        raise HTTPException(status_code=403, detail="Cannot delete students from other schools")

    if student:
        db.delete(student)
        db.commit()
    return {"status": "deleted"}

@router.get("/inactive-users")
def get_inactive_users(session: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    1ヶ月間進捗更新をしていない講師（User）を検知するAPI
    """
    # 30日前の日付を計算
    thirty_days_ago = datetime.now() - timedelta(days=30)

    # 開発者アカウントは非表示
    query = session.query(models.User).filter(models.User.role != "developer")

    # 同校舎のユーザーのみ取得
    if current_user.role == "admin":
        query = query.filter(models.User.school == current_user.school)
    
    # 対象となるユーザー（講師）を取得 
    users = session.query(models.User).all() 
    
    inactive_users = []
    
    for u in users:
        # このユーザーが最後に「PROGRESS」系の操作をしたログを探す
        last_log = session.query(models.AuditLog).filter(
            models.AuditLog.user_id == u.id,
            models.AuditLog.action.like("%PROGRESS%")
        ).order_by(desc(models.AuditLog.id)).first() # created_atがあればそれで降順に
        
        # ログが存在し、かつそれが30日以上前の場合
        if last_log:
            last_update_date = getattr(last_log, 'timestamp', None) 
            
            if last_update_date and last_update_date < thirty_days_ago:
                days_inactive = (datetime.now() - last_update_date).days
                inactive_users.append({
                    "user_id": u.id,
                    "name": getattr(u, 'username', getattr(u, 'name', '不明')),
                    "last_update": last_update_date.strftime("%Y-%m-%d"),
                    "days_inactive": days_inactive
                })
        else:
            # そもそも一度も更新していないユーザー（入社直後などを除くロジックが必要かも）
            # 今回はとりあえずリストに入れます
            inactive_users.append({
                "user_id": u.id,
                "name": getattr(u, 'username', getattr(u, 'name', '不明')),
                "last_update": "記録なし",
                "days_inactive": "30+"
            })
            
    return inactive_users