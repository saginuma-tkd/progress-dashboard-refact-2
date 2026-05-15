# backend/app/routers/reports.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime
import traceback

from app.db.database import get_db
from app.models.models import (
    User, Progress, EikenResult, Student,
    PastExamResult, MockExamResult, UniversityAcceptance
)
from app.utils.pdf_generator import create_pdf_from_template

router = APIRouter()

# --- Pydantic Schema ---
class ReportRequest(BaseModel):
    chart_image: Optional[str] = None
class IntegratedReportRequest(BaseModel):
    sections: List[str]  # ["dashboard", "calendar", "mock_exams", "past_exams"]
    chart_images: Dict[str, Optional[str]] = {} # {"dashboard": "base64...", "past_exams": "base64..."}
    teacher_comment: Optional[str] = None
    next_action: Optional[str] = None

# --- Endpoints ---

# 1. 学習ダッシュボード レポート
@router.post("/dashboard/{student_id}")
def generate_dashboard_report(
    student_id: int, 
    request: ReportRequest, 
    session: Session = Depends(get_db)
):
    student = session.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    progress_items = session.query(Progress).filter(Progress.student_id == student_id).all()
    
    total_study_time = 0.0
    total_progress_pct = 0.0
    formatted_items = []
    
    if progress_items:
        valid_items = [p for p in progress_items if p.total_units > 0]
        if valid_items:
            ratios = [min(1.0, p.completed_units / p.total_units) for p in valid_items]
            total_progress_pct = (sum(ratios) / len(ratios)) * 100
        
        for item in progress_items:
            pct = 0
            if item.total_units > 0:
                pct = round((item.completed_units / item.total_units) * 100)
                if item.duration and item.duration > 0:
                     ratio = min(1.0, item.completed_units / item.total_units)
                     total_study_time += ratio * item.duration
            
            formatted_items.append({
                "subject": item.subject or "-",
                "book_name": item.book_name,
                "completed_units": item.completed_units,
                "total_units": item.total_units,
                "pct": pct
            })

    latest_eiken = session.query(EikenResult).filter(EikenResult.student_id == student_id).order_by(desc(EikenResult.exam_date)).first()
    eiken_str = "未登録"
    if latest_eiken:
        eiken_str = latest_eiken.grade
        if latest_eiken.cse_score:
            eiken_str += f" / CSE {latest_eiken.cse_score}"

    context = {
        "student_name": student.username,
        "date_str": datetime.now().strftime("%Y年%m月%d日"),
        "total_study_time": round(total_study_time, 1),
        "total_progress_pct": round(total_progress_pct, 1),
        "eiken_str": eiken_str,
        "items": formatted_items,
        "chart_image": request.chart_image
    }

    pdf_buffer = create_pdf_from_template("report_template.html", context)
    filename = f"dashboard_{student_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

# 2. 過去問演習 レポート
@router.post("/past-exams/{student_id}")
def generate_past_exam_report(
    student_id: int,
    request: ReportRequest,
    session: Session = Depends(get_db)
):
    student = session.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = session.query(PastExamResult).filter(PastExamResult.student_id == student_id).all()
    
    formatted_items = []
    for r in results:
        formatted_items.append({
            "date": r.date,
            "university": r.university_name,
            "faculty": r.faculty_name,
            "year": r.year,
            "subject": r.subject,
            "correct_answers": r.correct_answers or 0,
            "total_questions": r.total_questions or 0
        })

    context = {
        "student_name": student.username,
        "date_str": datetime.now().strftime("%Y年%m月%d日"),
        "items": formatted_items,
        "chart_image": request.chart_image,
        "teacher_comment": req.teacher_comment,
        "next_action": req.next_action
    }

    pdf_buffer = create_pdf_from_template("past_exam_report.html", context)
    filename = f"past_exam_{student_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

# 3. 模試成績 レポート
@router.post("/mock-exams/{student_id}")
def generate_mock_exam_report(
    student_id: int,
    request: ReportRequest,
    session: Session = Depends(get_db)
):
    student = session.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = session.query(MockExamResult).filter(MockExamResult.student_id == student_id).all()

    formatted_items = []
    for r in results:
        score_summary = f"{r.mock_exam_format}" # 簡易表示
        formatted_items.append({
            "name": r.mock_exam_name,
            "type": r.result_type,
            "grade": r.grade,
            "score_summary": score_summary
        })

    context = {
        "student_name": student.username,
        "date_str": datetime.now().strftime("%Y年%m月%d日"),
        "items": formatted_items,
        "chart_image": request.chart_image
    }

    pdf_buffer = create_pdf_from_template("mock_exam_report.html", context)
    filename = f"mock_exam_{student_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

# 4. 入試カレンダー レポート
@router.post("/calendar/{student_id}")
def generate_calendar_report(
    student_id: int,
    request: ReportRequest,
    session: Session = Depends(get_db)
):
    student = session.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    acceptances = session.query(UniversityAcceptance).filter(UniversityAcceptance.student_id == student_id).all()

    formatted_items = []
    for a in acceptances:
        formatted_items.append({
            "univ": a.university_name,
            "faculty": a.faculty_name,
            "exam_date": a.exam_date or "-",
            "announce_date": a.announcement_date or "-"
        })

    context = {
        "student_name": student.username,
        "date_str": datetime.now().strftime("%Y年%m月%d日"),
        "items": formatted_items,
        "chart_image": request.chart_image
    }

    pdf_buffer = create_pdf_from_template("calendar_report.html", context)
    filename = f"calendar_{student_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

@router.post("/integrated/{student_id}")
def generate_integrated_report(
    student_id: int, 
    request: IntegratedReportRequest, 
    session: Session = Depends(get_db)
):
    try:
        # ★修正: Userテーブルではなく、Studentテーブルから検索する
        student = session.query(Student).filter(Student.id == student_id).first()
        if not student:
            # IDが合わない場合、念のためUserテーブルも探す（旧仕様との互換性）
            student_fallback = session.query(User).filter(User.id == student_id).first()
            if student_fallback:
                student = student_fallback
            else:
                raise HTTPException(status_code=404, detail="Student not found")

        # 名前フィールドの取得 (Studentモデルはname, Userモデルはusername)
        student_name = getattr(student, "name", getattr(student, "username", "不明"))

        # 2. 基本コンテキスト
        context = {
            "student_name": student_name, # ★正しい名前が入る
            "date_str": datetime.now().strftime("%Y年%m月%d日"),
            "sections": request.sections,
            "images": request.chart_images, # フロントから送られた画像データ
            "dashboard": None,
            "past_exams": [],
            "mock_exams": [],
            "calendar": [],
            "eiken_str": "未登録"
        }

        # 3. データ取得ロジック
        if "dashboard" in request.sections:
            progress_items = session.query(Progress).filter(Progress.student_id == student_id).all()
            formatted_items = []
            total_study_time = 0.0
            total_progress_pct = 0.0
            
            if progress_items:
                valid_items = [p for p in progress_items if (p.total_units or 0) > 0]
                if valid_items:
                    ratios = [min(1.0, (p.completed_units or 0) / p.total_units) for p in valid_items]
                    total_progress_pct = (sum(ratios) / len(ratios)) * 100
                
                for item in progress_items:
                    pct = 0
                    total = item.total_units or 0
                    completed = item.completed_units or 0
                    if total > 0:
                        pct = round((completed / total) * 100)
                        if (item.duration or 0) > 0:
                             ratio = min(1.0, completed / total)
                             total_study_time += ratio * item.duration
                    
                    formatted_items.append({
                        "subject": item.subject or "-",
                        "book_name": item.book_name,
                        "pct": pct
                    })

            # 英検
            latest_eiken = session.query(EikenResult).filter(EikenResult.student_id == student_id).order_by(desc(EikenResult.exam_date)).first()
            if latest_eiken:
                eiken_str = latest_eiken.grade
                if latest_eiken.cse_score:
                    eiken_str += f" / CSE {latest_eiken.cse_score}"
                context["eiken_str"] = eiken_str

            context["dashboard"] = {
                "total_study_time": round(total_study_time, 1),
                "total_progress_pct": round(total_progress_pct, 1),
                # ★修正: キー名を 'items' から 'progress_list' に変更（衝突回避）
                "progress_list": formatted_items 
            }

        if "past_exams" in request.sections:
            results = session.query(PastExamResult).filter(PastExamResult.student_id == student_id).all()
            formatted_past = []
            for r in results:
                formatted_past.append({
                    "date": r.date,
                    "university": r.university_name,
                    "faculty": r.faculty_name,
                    "year": r.year,
                    "subject": r.subject,
                    "correct_answers": r.correct_answers or 0,
                    "total_questions": r.total_questions or 0
                })
            context["past_exams"] = formatted_past

        if "mock_exams" in request.sections:
            results = session.query(MockExamResult).filter(MockExamResult.student_id == student_id).all()
            formatted_mock = []
            for r in results:
                formatted_mock.append({
                    "name": r.mock_exam_name,
                    "type": r.result_type,
                    "grade": r.grade,
                    "score_summary": f"{r.mock_exam_format}" if hasattr(r, 'mock_exam_format') else "-"
                })
            context["mock_exams"] = formatted_mock

        if "calendar" in request.sections:
            acceptances = session.query(UniversityAcceptance).filter(UniversityAcceptance.student_id == student_id).all()
            formatted_cal = []
            for a in acceptances:
                formatted_cal.append({
                    "univ": a.university_name,
                    "faculty": a.faculty_name,
                    "exam_date": a.exam_date or "-",
                    "announce_date": a.announcement_date or "-"
                })
            context["calendar"] = formatted_cal

        # 4. PDF生成
        pdf_buffer = create_pdf_from_template("integrated_report_template.html", context)
        
        filename = f"report_{student_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )

    except Exception as e:
        print("PDF Generation Error:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# backend/app/routers/reports.py の一番下に追加

@router.get("/data/{student_id}")
def get_report_data_json(
    student_id: int, 
    session: Session = Depends(get_db)
):
    """
    フロントエンドでのPDFレンダリング用に、生徒の全レポートデータをJSONで返すAPI
    """
    try:
        # 1. 生徒情報の取得
        student = session.query(Student).filter(Student.id == student_id).first()
        if not student:
            student_fallback = session.query(User).filter(User.id == student_id).first()
            if student_fallback:
                student = student_fallback
            else:
                raise HTTPException(status_code=404, detail="Student not found")

        student_name = getattr(student, "name", getattr(student, "username", "不明"))
        
        # ※もしStudentモデルに第一志望のフィールドがあれば取得する（なければ None）
        target_university = getattr(student, "target_university", None)

        # 2. ダッシュボード（進捗・学習時間）の取得
        progress_items = session.query(Progress).filter(Progress.student_id == student_id).all()
        formatted_items = []
        total_study_time = 0.0
        total_progress_pct = 0.0
        
        if progress_items:
            valid_items = [p for p in progress_items if (p.total_units or 0) > 0]
            if valid_items:
                ratios = [min(1.0, (p.completed_units or 0) / p.total_units) for p in valid_items]
                total_progress_pct = (sum(ratios) / len(ratios)) * 100
            
            for item in progress_items:
                pct = 0
                total = item.total_units or 0
                completed = item.completed_units or 0
                if total > 0:
                    pct = round((completed / total) * 100)
                    if (item.duration or 0) > 0:
                         ratio = min(1.0, completed / total)
                         total_study_time += ratio * item.duration
                
                formatted_items.append({
                    "subject": item.subject or "-",
                    "book_name": item.book_name,
                    "pct": pct
                })

        # 3. 英検ステータスの取得
        latest_eiken = session.query(EikenResult).filter(EikenResult.student_id == student_id).order_by(desc(EikenResult.exam_date)).first()
        eiken_str = "未登録"
        if latest_eiken:
            eiken_str = latest_eiken.grade
            if latest_eiken.cse_score:
                eiken_str += f" / CSE {latest_eiken.cse_score}"

        # 4. 過去問演習記録の取得
        past_results = session.query(PastExamResult).filter(PastExamResult.student_id == student_id).order_by(desc(PastExamResult.date)).all()
        formatted_past = []
        for r in past_results:
            formatted_past.append({
                "date": r.date,
                "university": r.university_name,
                "faculty": r.faculty_name,
                "year": r.year,
                "subject": r.subject,
                "correct_answers": r.correct_answers or 0,
                "total_questions": r.total_questions or 0
            })

        # 5. 模試成績の取得
        mock_results = session.query(MockExamResult).filter(MockExamResult.student_id == student_id).all()
        formatted_mock = []
        for r in mock_results:
            formatted_mock.append({
                "name": r.mock_exam_name,
                "type": r.result_type,
                "grade": r.grade,
                "score_summary": f"{r.mock_exam_format}" if hasattr(r, 'mock_exam_format') else "-"
            })

        # 6. JSONとしてレスポンスを返す
        return {
            "student": {
                "name": student_name,
                "target_university": target_university
            },
            "dashboard": {
                "total_study_time": round(total_study_time, 1),
                "total_progress_pct": round(total_progress_pct, 1),
                "progress_list": formatted_items 
            },
            "eiken_str": eiken_str,
            "past_exams": formatted_past,
            "mock_exams": formatted_mock
        }

    except Exception as e:
        print("Report Data Fetch Error:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")