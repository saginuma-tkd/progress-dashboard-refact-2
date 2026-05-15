from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.routers import deps
from app.crud import crud_student, crud_progress
from app.schemas import schemas
from app.models.models import User, Student, StudentInstructor
from app.models.models import EikenResult
from sqlalchemy import desc
from datetime import datetime
from pydantic import BaseModel
from app.routers.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.Student])
def read_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    students = crud_student.get_students_for_user(db, user=current_user)
    return students

@router.get("/me", response_model=schemas.Student)
def read_my_student_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """studentロールのユーザーが自分自身の生徒プロフィールを取得するエンドポイント"""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="このエンドポイントは生徒専用です")
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="あなたの生徒プロフィールが見つかりません。管理者にお問い合わせください。")
    return student

@router.get("/{student_id}", response_model=schemas.Student)
def read_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    student = crud_student.get_student(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    # Authorization check: is this student assigned to the user?
    # (Simplified for now, assuming if they can see the list, they can see details, 
    # but strictly we should check association again if ID is guessed)
    return student

@router.get("/{student_id}/progress", response_model=List[schemas.Progress])
def read_student_progress(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Logic to adjust duration based on deviation would happen here in a Service, 
    # then mapped to Schema.
    # For now, we return raw progress.
    raw_results = crud_progress.get_student_progress(db, student_id)
    
    # Map (Progress, MasterTextbook) tuple to Schema or Dict
    # Schema 'Progress' matches the model fields.
    # We might need to inject the 'duration' if it was None in Progress but present in MasterTextbook.
    
    results = []
    for p, m in raw_results:
        # Clone p to avoiding mutating DB object directly if session is active
        # or just use Pydantic from_orm?
        # But we need to handle the coalesce logic for duration.
        
        duration = p.duration
        if duration is None and m:
            duration = m.duration
            
        # Create a dict overlay
        p_dict = {
            "id": p.id,
            "student_id": p.student_id,
            "subject": p.subject,
            "level": p.level,
            "book_name": p.book_name,
            "duration": duration,
            "is_planned": p.is_planned,
            "is_done": p.is_done,
            "completed_units": p.completed_units,
            "total_units": p.total_units
        }
        results.append(p_dict)
        
    return results

@router.post("/{student_id}/progress")
def update_student_progress(
    student_id: int,
    progress: List[schemas.ProgressUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    count = crud_progress.update_student_progress(db, student_id, progress)
    return {"message": f"Updated {count} records"}

class EikenUpdate(BaseModel):
    score: str # 連結文字列を受け取る

@router.patch("/{student_id}/eiken")
def update_student_eiken(
    student_id: int,
    eiken_data: EikenUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # 最新の英検結果を取得、なければ作成
    eiken_result = (
        deps.get_tenant_query(db, EikenResult, current_user)
        .filter(EikenResult.student_id == student_id)
        .order_by(desc(EikenResult.exam_date))
        .first()
    )

    if not eiken_result:
        eiken_result = EikenResult(student_id=student_id, tenant_id=current_user.tenant_id)
        db.add(eiken_result)

    # 連結文字列 "準2級 合格 / CSE 1950 / 2025-06-01" を分解
    parts = eiken_data.score.split(' / ')
    
    # 1. Grade (必須扱い)
    eiken_result.grade = parts[0] if len(parts) > 0 else "未登録"

    # 2. CSE Score
    if len(parts) > 1 and parts[1].replace('CSE ', '').isdigit():
        eiken_result.cse_score = int(parts[1].replace('CSE ', ''))
    else:
        eiken_result.cse_score = None

    # 3. Date
    if len(parts) > 2:
        eiken_result.exam_date = parts[2]

    db.commit()
    return {"message": "Eiken info updated"}

# Pydanticスキーマの定義
class MemoUpdate(BaseModel):
    memo: str

@router.get("/{student_id}/memo")
async def get_student_memo(
    student_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ★ログインユーザーを取得
):
    """ログイン中講師の自分専用生徒メモを取得"""
    # StudentInstructor テーブルから「この生徒」かつ「自分」のレコードを探す
    student_link = db.query(StudentInstructor).filter(
        StudentInstructor.student_id == student_id,
        StudentInstructor.user_id == current_user.id
    ).first()
    
    if not student_link:
        return {"memo": ""} # 担当外などの場合はとりあえず空で返す
        
    return {"memo": student_link.memo or ""}

@router.patch("/{student_id}/memo")
async def update_student_memo(
    student_id: int, 
    req: MemoUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ログイン中講師の自分専用生徒メモを更新"""
    student_link = db.query(StudentInstructor).filter(
        StudentInstructor.student_id == student_id,
        StudentInstructor.user_id == current_user.id
    ).first()
    
    # 担当登録がない場合の処理
    if not student_link:
        # ★修正: developer の場合のみ、自動的に紐付けレコードを作成する
        if current_user.role == "developer":
            student_link = StudentInstructor(
                student_id=student_id,
                user_id=current_user.id,
                is_main=0,  # 開発者なのでメイン担当ではない設定
                memo=req.memo
            )
            db.add(student_link)
        else:
            # developer以外で担当登録がない場合はエラーにする
            raise HTTPException(status_code=403, detail="この生徒の担当に登録されていません")
    else:
        # 既にレコードがある場合はメモを更新
        student_link.memo = req.memo
    
    db.commit()
    return {"message": "Memo updated successfully", "memo": student_link.memo}