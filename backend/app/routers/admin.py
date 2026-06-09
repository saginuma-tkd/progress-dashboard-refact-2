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
from app.routers.deps import get_current_user, get_current_admin_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 1. 新規登録
@router.post("/textbooks")
def create_textbook(
    data: schemas.MasterTextbookCreate, 
    session: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)  # 🌟 追加: 誰が登録したかを受け取る
):
    # 🌟 権限から所属を決定
    school_id = None if current_user.role in ["developer", "super_admin"] else current_user.school_id

    # 🌟 重複チェックを「同じ校舎内」に限定する
    existing = session.query(models.MasterTextbook).filter(
        models.MasterTextbook.book_name == data.book_name,
        models.MasterTextbook.subject == data.subject,
        models.MasterTextbook.level == data.level,
        models.MasterTextbook.tenant_id == current_user.tenant_id,
        models.MasterTextbook.school_id == school_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="この参考書はすでに登録されています")

    # 🌟 自分の校舎IDをセットして保存
    new_book = models.MasterTextbook(
        subject=data.subject,
        level=data.level,
        book_name=data.book_name,
        duration=data.duration,
        tenant_id=current_user.tenant_id,
        school_id=school_id
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
    session: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user) # 🌟 追加
):
    book = session.query(models.MasterTextbook).filter(models.MasterTextbook.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Textbook not found")
    
    # 🌟 権限チェック（他校舎のデータを勝手に編集させない）
    if current_user.role not in ["developer", "super_admin"]:
        if book.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="他校舎の参考書は編集できません")
    
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
def delete_textbook(
    book_id: int, 
    session: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user) # 🌟 追加
):
    book = session.query(models.MasterTextbook).filter(models.MasterTextbook.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Textbook not found")
    
    # 🌟 権限チェック（他校舎のデータを勝手に削除させない）
    if current_user.role not in ["developer", "super_admin"]:
        if book.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="他校舎の参考書は削除できません")
    
    session.delete(book)
    session.commit()
    return {"message": "Deleted successfully"}

# --- Preset Management API ---

# 1. プリセット一覧取得 (全員見れるが、developer以外は自校舎のみ)
@router.get("/presets")
def get_admin_presets(session: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    query = deps.get_tenant_query(session, models.BulkPreset, current_user).options(joinedload(models.BulkPreset.books))
    
    # 開発者以外は、自分の校舎のプリセットしか「見えない」
    if current_user.role != "developer":
        query = query.filter(models.BulkPreset.school_id == current_user.school_id)
        
    presets = query.all()
    return [
        {
            "id": p.id,
            "preset_name": p.preset_name,
            "subject": p.subject,
            "books": [b.book_name for b in p.books]
        }
        for p in presets
    ]

# 2. プリセット作成 (admin と developer のみ)
@router.post("/presets")
def create_preset(
    data: schemas.BulkPresetCreate,
    session: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # 🌟 権限チェック: 一般講師(user)や生徒(student)は作成不可
    if current_user.role not in ["developer", "admin"]:
        raise HTTPException(status_code=403, detail="プリセットを作成する権限がありません")

    query = deps.get_tenant_query(session, models.BulkPreset, current_user).filter(
        models.BulkPreset.subject == data.subject,
        models.BulkPreset.preset_name == data.preset_name
    )
    if current_user.role != "developer":
        query = query.filter(models.BulkPreset.school_id == current_user.school_id)
        
    if query.first():
        raise HTTPException(status_code=400, detail="このプリセット名は既に存在します")

    new_preset = models.BulkPreset(
        subject=data.subject,
        preset_name=data.preset_name,
        tenant_id=current_user.tenant_id,
        school_id=current_user.school_id
    )
    session.add(new_preset)
    session.flush()

    for book_name in data.book_names:
        new_book = models.BulkPresetBook(
            preset_id=new_preset.id,
            book_name=book_name
        )
        session.add(new_book)
    
    session.commit()
    return {"message": "Preset created successfully"}

# 3. プリセット削除 (admin と developer のみ)
@router.delete("/presets/{preset_id}")
def delete_preset(preset_id: int, session: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    # 🌟 権限チェック: 一般講師(user)や生徒(student)は削除不可
    if current_user.role not in ["developer", "admin"]:
        raise HTTPException(status_code=403, detail="プリセットを削除する権限がありません")

    query = deps.get_tenant_query(session, models.BulkPreset, current_user).filter(models.BulkPreset.id == preset_id)
    if current_user.role != "developer":
        query = query.filter(models.BulkPreset.school_id == current_user.school_id)
        
    preset = query.first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    session.delete(preset)
    session.commit()
    return {"message": "Deleted successfully"}

# 4. プリセット更新 (admin と developer のみ)
@router.put("/presets/{preset_id}")
def update_preset(
    preset_id: int,
    data: schemas.BulkPresetUpdate,
    session: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # 🌟 権限チェック: 一般講師(user)や生徒(student)は編集不可
    if current_user.role not in ["developer", "admin"]:
        raise HTTPException(status_code=403, detail="プリセットを編集する権限がありません")

    query = deps.get_tenant_query(session, models.BulkPreset, current_user).filter(models.BulkPreset.id == preset_id)
    if current_user.role != "developer":
        query = query.filter(models.BulkPreset.school_id == current_user.school_id)
        
    preset = query.first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    if data.preset_name is not None:
        preset.preset_name = data.preset_name
    if data.subject is not None:
        preset.subject = data.subject
    
    if data.book_names is not None:
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
    admin: models.User = Depends(get_current_admin_user)
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
# 2. API本体 (dictではなく設計図を使う！)
# ==========================================
@router.post("/users")
def create_user(
    user_in: schemas.AdminUserCreate,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_admin_user)
):
    return crud_user.create_user(db, user_in, current_user)

@router.patch("/users/{user_id}")
def update_user(
    user_id: int, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_admin_user)
):
    return crud_user.update_user(db, user_id, data, current_user)

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_admin_user)
):
    crud_user.delete_user(db, user_id)
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
    return crud_student.create_student(db, data, current_user)

@router.patch("/students/{student_id}")
def update_student(
    student_id: int, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_admin_user)
):
    crud_student.update_student(db, student_id, data, current_user)
    return {"status": "updated"}

@router.delete("/students/{student_id}")
def delete_student(
    student_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_admin_user)
):
    crud_student.delete_student(db, student_id, current_user)
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