"""
Student CRUD Module
生徒の作成、取得、更新、削除および担当講師の紐付け管理を行います。
"""
from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import models
from app.core.security import get_password_hash


def get_students_for_user(db: Session, user: models.User) -> List[models.Student]:
    """
    権限に応じて生徒一覧を取得します。
    selectinloadを使用して、関連する講師データ（instructors）を事前に一括取得しN+1問題を回避します。
    """
    base_query = db.query(models.Student).options(
        selectinload(models.Student.instructors)
    )

    if user.role in ['developer', 'super_admin']:
        return base_query.all()
        
    if user.role == 'admin':
        return base_query.filter(models.Student.school == user.school).all()
        
    return base_query.join(models.StudentInstructor).filter(
        models.StudentInstructor.user_id == user.id
    ).all()


def get_student(db: Session, student_id: int) -> models.Student:
    return db.query(models.Student).filter(models.Student.id == student_id).first()


def get_student_with_details(db: Session, student_id: int) -> models.Student:
    """講師情報などのリレーションを含めて生徒単体を取得する"""
    return db.query(models.Student).options(
        joinedload(models.Student.instructors)
    ).filter(models.Student.id == student_id).first()


def create_student(db: Session, data: dict, current_user: models.User) -> models.Student:
    """
    新規生徒の作成。
    生徒レコードを作成後、ログイン用のUserレコードを自動生成し、紐付けを行います。
    """
    target_school = current_user.school if current_user.role == 'admin' else data.get("school", "未設定")

    # 1. 生徒レコードの作成
    new_student = models.Student(
        name=data["name"], 
        school=target_school, 
        grade=data.get("grade"),
        previous_school=data.get("previous_school"), 
        deviation_value=data.get("deviation_value"),
        target_level=data.get("target_level")
    )
    db.add(new_student)
    db.flush()  # DBへ送信し、new_student.id を確定させる

    # 2. 生徒ログイン用アカウントの自動生成
    generated_username = f"student_{new_student.id}"
    hashed_pw = get_password_hash("password123")

    new_user = models.User(
        username=generated_username,
        password=hashed_pw,
        role="student",
        school=target_school
    )
    db.add(new_user)
    db.flush()  # new_user.id を確定させる

    # 3. 生徒とログインアカウントの紐付け
    new_student.user_id = new_user.id
    db.flush() 

    # 4. 担当講師（メイン・サブ）の紐付け設定
    if data.get("main_instructor_id"):
        db.add(models.StudentInstructor(
            student_id=new_student.id, 
            user_id=data["main_instructor_id"], 
            is_main=1
        ))
        
    if "sub_instructor_ids" in data and isinstance(data["sub_instructor_ids"], list):
        for sub_id in filter(None, data["sub_instructor_ids"]):
            db.add(models.StudentInstructor(
                student_id=new_student.id, 
                user_id=sub_id, 
                is_main=0
            ))
    
    db.commit()
    db.refresh(new_student)
    return new_student


def update_student(db: Session, student_id: int, data: dict, current_user: models.User) -> models.Student:
    """生徒情報の更新と、担当講師の再設定を行う"""
    student = get_student(db, student_id)
    if not student: 
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == 'admin' and student.school != current_user.school:
        raise HTTPException(status_code=403, detail="Cannot edit students from other schools")

    # 基本情報の更新
    updatable_fields = ["name", "grade", "school", "previous_school", "deviation_value", "target_level"]
    for field in updatable_fields:
        if field in data and hasattr(student, field):
            # Adminは別校舎への変更不可
            if field == "school" and current_user.role == 'admin' and data[field] != current_user.school: 
                continue
            setattr(student, field, data[field])

    # メイン講師の更新（既存のメインを削除して再登録）
    if "main_instructor_id" in data:
        db.query(models.StudentInstructor).filter(
            models.StudentInstructor.student_id == student_id, 
            models.StudentInstructor.is_main == 1
        ).delete()
        
        if data["main_instructor_id"]:
            db.add(models.StudentInstructor(
                student_id=student_id, 
                user_id=data["main_instructor_id"], 
                is_main=1
            ))

    # サブ講師の更新（既存のサブを全削除して再登録）
    if "sub_instructor_ids" in data and isinstance(data["sub_instructor_ids"], list):
        db.query(models.StudentInstructor).filter(
            models.StudentInstructor.student_id == student_id, 
            models.StudentInstructor.is_main == 0
        ).delete()
        
        for sub_id in filter(None, data["sub_instructor_ids"]):
            db.add(models.StudentInstructor(
                student_id=student_id, 
                user_id=sub_id, 
                is_main=0
            ))

    db.commit()
    return student


def delete_student(db: Session, student_id: int, current_user: models.User) -> bool:
    student = get_student(db, student_id)
    
    if student and current_user.role == 'admin' and student.school != current_user.school:
        raise HTTPException(status_code=403, detail="Cannot delete students from other schools")

    if student:
        db.delete(student)
        db.commit()
        return True
    return False