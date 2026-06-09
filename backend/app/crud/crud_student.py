from sqlalchemy.orm import Session, joinedload, selectinload # 🌟 selectinload を追加！
from app.models import models
from app.schemas.schemas import StudentCreate, StudentUpdate
from typing import List
from fastapi import HTTPException
from passlib.context import CryptContext
from app.core.security import get_password_hash

def get_students_for_user(db: Session, user: models.User) -> List[models.Student]:
    # 🌟 爆速化の要：一覧取得時に、関連するデータ（instructorsなど）を一括で持ってくるように指示
    base_query = db.query(models.Student).options(
        selectinload(models.Student.instructors)
        # もし一覧画面で進捗や英検データも表示しているなら、以下のように追加するとさらに速くなります
        # , selectinload(Student.progress)
        # , selectinload(Student.eiken_results)
    )

    if user.role in ['developer', 'super_admin']:
        # Developer は全校舎の全生徒を取得
        return base_query.all()
    elif user.role == 'admin':
        # Admin は自分の所属する校舎の生徒のみを取得
        return base_query.filter(models.Student.school == user.school).all()
    else:
        # 一般 User は自分に割り当てられた生徒のみを取得
        return base_query.join(models.StudentInstructor).filter(models.StudentInstructor.user_id == user.id).all()

# --- これより下の関数（get_student など）はそのまま変更なし ---
def get_student(db: Session, student_id: int):
    return db.query(models.Student).filter(models.Student.id == student_id).first()

def get_student_with_details(db: Session, student_id: int):
    return db.query(models.Student).options(joinedload(models.Student.instructors)).filter(models.Student.id == student_id).first()

def create_student(db: Session, data: dict, current_user: models.User):
    target_school = data.get("school", "未設定")
    if current_user.role == 'admin':
        target_school = current_user.school

    # 1. まず生徒レコードを作成
    new_student = models.Student(
        name=data["name"], 
        school=target_school, grade=data.get("grade"),
        previous_school=data.get("previous_school"), deviation_value=data.get("deviation_value"),
        target_level=data.get("target_level")
    )
    db.add(new_student)
    db.flush() # 生徒IDが確定

    # 2. 自動生成するログインIDと、共通パスワード
    generated_username = f"student_{new_student.id}"
    # 🌟 3. 先ほど直した標準のハッシュ関数を使う！
    hashed_pw = get_password_hash("password123")

    # 4. ログイン用の User レコードを作成
    new_user = models.User(
        username=generated_username,
        password=hashed_pw,
        role="student",
        school=target_school
    )
    db.add(new_user)
    db.flush() # ユーザーIDが確定

    # 5. 生徒データとログイン用アカウントを紐付け
    new_student.user_id = new_user.id
    # 🌟 6. 【超重要】ここで強制的にUPDATEを予約させる！
    db.flush() 

    # 7. 講師設定
    if data.get("main_instructor_id"):
        db.add(models.StudentInstructor(student_id=new_student.id, user_id=data["main_instructor_id"], is_main=1))
    if "sub_instructor_ids" in data and isinstance(data["sub_instructor_ids"], list):
        for sub_id in data["sub_instructor_ids"]:
            if sub_id:
                db.add(models.StudentInstructor(student_id=new_student.id, user_id=sub_id, is_main=0))
    
    db.commit()
    db.refresh(new_student)
    
    return new_student

def update_student(db: Session, student_id: int, data: dict, current_user: models.User):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student: raise HTTPException(404, "Student not found")

    if current_user.role == 'admin' and student.school != current_user.school:
        raise HTTPException(status_code=403, detail="Cannot edit students from other schools")

    fields = ["name", "grade", "school", "previous_school", "deviation_value", "target_level"]
    for f in fields:
        if f in data and hasattr(student, f):
            if f == "school" and current_user.role == 'admin' and data[f] != current_user.school: continue
            setattr(student, f, data[f])

    if "main_instructor_id" in data:
        db.query(models.StudentInstructor).filter(
            models.StudentInstructor.student_id == student_id, models.StudentInstructor.is_main == 1
        ).delete()
        if data["main_instructor_id"]:
            db.add(models.StudentInstructor(student_id=student_id, user_id=data["main_instructor_id"], is_main=1))

    if "sub_instructor_ids" in data and isinstance(data["sub_instructor_ids"], list):
        db.query(models.StudentInstructor).filter(
            models.StudentInstructor.student_id == student_id, models.StudentInstructor.is_main == 0
        ).delete()
        for sub_id in data["sub_instructor_ids"]:
            if sub_id:
                db.add(models.StudentInstructor(student_id=student_id, user_id=sub_id, is_main=0))

    db.commit()
    return student

def delete_student(db: Session, student_id: int, current_user: models.User):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if student and current_user.role == 'admin' and student.school != current_user.school:
        raise HTTPException(status_code=403, detail="Cannot delete students from other schools")

    if student:
        db.delete(student)
        db.commit()
        return True
    return False