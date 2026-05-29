# backend/seed_data.py

import sys
import os

# backendフォルダのルートパスを通す
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import models
from app.core.security import get_password_hash
from datetime import datetime, date, timezone

def seed_demo_data():
    db = SessionLocal()
    try:
        print("🚀 Starting comprehensive demo data creation...")

        # ==========================================
        # 1. テナント (Tenant) と 校舎 (School) 
        # ==========================================
        print("Creating tenant and school data...")
        tenant_name = "武田塾"
        tenant = db.query(models.Tenant).filter(models.Tenant.name == tenant_name).first()
        if not tenant:
            tenant = models.Tenant(name=tenant_name)
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

        school_names = ["渋谷校", "新宿校"]
        schools = {}
        for s_name in school_names:
            school = db.query(models.School).filter(
                models.School.name == s_name, 
                models.School.tenant_id == tenant.id
            ).first()
            if not school:
                school = models.School(name=s_name, tenant_id=tenant.id)
                db.add(school)
                db.commit()
                db.refresh(school)
            schools[s_name] = school

        shibuya = schools["渋谷校"]
        shinjuku = schools["新宿校"]

        # ==========================================
        # 2. 汎用モック講師（User）
        # ==========================================
        print("Creating instructor data...")
        instructors = [
            {"username": "開発者", "role": "developer", "school_obj": None},
            {"username": "admin_shibuya", "role": "admin", "school_obj": shibuya},
            {"username": "inst_shibuya_1", "role": "user", "school_obj": shibuya},
            {"username": "inst_shinjuku_1", "role": "user", "school_obj": shinjuku},
        ]
        
        created_instructors = []
        for inst_data in instructors:
            inst = db.query(models.User).filter(models.User.username == inst_data["username"]).first()
            if not inst:
                s_obj = inst_data["school_obj"]
                inst = models.User(
                    username=inst_data["username"], 
                    password=get_password_hash("password123"), 
                    role=inst_data["role"], 
                    school=s_obj.name if s_obj else "",
                    tenant_id=tenant.id,
                    school_id=s_obj.id if s_obj else None
                )
                db.add(inst)
                db.flush()
            created_instructors.append(inst)

        # システム管理者
        super_admin_email = "superadmin@example.com"
        if not db.query(models.User).filter(models.User.username == super_admin_email).first():
            db.add(models.User(
                username=super_admin_email,
                password=get_password_hash("superadmin123"),
                role="super_admin"
            ))
        db.commit()

        # ==========================================
        # 3. 生徒 (Student) と 進捗 (Progress)・成績
        # ==========================================
        print("Creating student and progress data...")
        students_data = [
            {"name": "渋谷校生徒1", "school": "渋谷校", "grade": "高3", "dev": 55.0, "target": "MARCH"},
            {"name": "渋谷校生徒2", "school": "渋谷校", "grade": "高2", "dev": 60.0, "target": "早慶"},
            {"name": "新宿校生徒1", "school": "新宿校", "grade": "高3", "dev": 65.0, "target": "国公立"},
        ]

        for idx, s_data in enumerate(students_data):
            student = db.query(models.Student).filter(models.Student.name == s_data["name"]).first()
            school_obj = schools[s_data["school"]]

            if not student:
                # 生徒作成
                student = models.Student(
                    name=s_data["name"], school=s_data["school"], school_id=school_obj.id,
                    grade=s_data["grade"], deviation_value=s_data["dev"], target_level=s_data["target"]
                )
                db.add(student)
                db.flush()
                
                # 担当講師紐付け
                inst_idx = 2 if s_data["school"] == "渋谷校" else 3
                db.add(models.StudentInstructor(student_id=student.id, user_id=created_instructors[inst_idx].id, is_main=1))

                # アカウント作成
                user_student = models.User(
                    username=f"student_{student.id}", password=get_password_hash("password123"),
                    role="student", school=s_data["school"], tenant_id=tenant.id, school_id=school_obj.id
                )
                db.add(user_student)
                db.flush()
                student.user_id = user_student.id

                # --- 拡張: 学習進捗 (Progress) ---
                db.add(models.Progress(student_id=student.id, subject="英語", level="日大", book_name="LEAP", duration=1.5, is_planned=True, is_done=False, completed_units=400, total_units=1400))
                db.add(models.Progress(student_id=student.id, subject="数学", level="基礎", book_name="基礎問題精講", duration=2.0, is_planned=True, is_done=True, completed_units=145, total_units=145))

                # --- 拡張: 模試結果 (MockExamResult) ---
                db.add(models.MockExamResult(
                    student_id=student.id, result_type="共通テスト", mock_exam_name="全統模試", mock_exam_format="マーク",
                    grade=s_data["grade"], round="第1回", exam_date=date(2026, 5, 10),
                    subject_english_r_mark=75, subject_math1a_mark=68, subject_kokugo_mark=120
                ))

                # --- 拡張: 英検 (EikenResult) ---
                db.add(models.EikenResult(student_id=student.id, grade="2級", cse_score=1980, exam_date="2026-01-20", result="合格"))

                # --- 拡張: 過去問 (PastExamResult) ---
                if s_data["grade"] == "高3":
                    db.add(models.PastExamResult(
                        student_id=student.id, date="2026-05-25", university_name="明治大学", faculty_name="商学部",
                        year=2025, subject="英語", correct_answers=35, total_questions=50
                    ))
                    # 合格実績モック
                    db.add(models.UniversityAcceptance(
                        student_id=student.id, university_name="明治大学", faculty_name="商学部", result="合格"
                    ))

                # --- 拡張: 申請データ (Transfer, Absence) ---
                db.add(models.TransferRequest(
                    tenant_id=tenant.id, student_id=student.id, instructor_id=created_instructors[inst_idx].id,
                    original_date="2026-06-01", candidate_dates="2026-06-03", reason="学校行事", status="pending"
                ))
        db.commit()

        # ==========================================
        # 4. 参考書マスタ (MasterTextbook) 
        # ==========================================
        print("Creating master textbooks...")
        textbooks = [
            {"subject": "英語", "level": "基礎", "book_name": "LEAP", "duration": 1.5},
            {"subject": "英語", "level": "日大", "book_name": "Next Stage", "duration": 2.0},
            {"subject": "数学", "level": "基礎", "book_name": "基礎問題精講", "duration": 2.5},
        ]
        for tb in textbooks:
            if not db.query(models.MasterTextbook).filter(models.MasterTextbook.book_name == tb["book_name"]).first():
                db.add(models.MasterTextbook(**tb, tenant_id=tenant.id))
        db.commit()

        # ==========================================
        # 5. プリセット (BulkPreset) ※school_id対応済
        # ==========================================
        print("Creating bulk presets...")
        preset_name = "英語ルート（基礎）"
        if not db.query(models.BulkPreset).filter(models.BulkPreset.preset_name == preset_name).first():
            new_preset = models.BulkPreset(
                preset_name=preset_name, subject="英語",
                tenant_id=tenant.id, school_id=shibuya.id # 渋谷校専用プリセットとして作成
            )
            db.add(new_preset)
            db.flush()
            db.add(models.BulkPresetBook(preset_id=new_preset.id, book_name="LEAP"))
            db.add(models.BulkPresetBook(preset_id=new_preset.id, book_name="Next Stage"))
        db.commit()

        # ==========================================
        # 6. 教材管理 (TeachingMaterials & Tags)
        # ==========================================
        print("Creating teaching materials...")
        tag_english = db.query(models.SubjectTag).filter(models.SubjectTag.name == "英語").first()
        if not tag_english:
            tag_english = models.SubjectTag(name="英語")
            db.add(tag_english)
            db.flush()

        detail_tag = db.query(models.DetailTag).filter(models.DetailTag.name == "文法").first()
        if not detail_tag:
            detail_tag = models.DetailTag(name="文法")
            db.add(detail_tag)
            db.flush()

        if not db.query(models.TeachingMaterial).filter(models.TeachingMaterial.title == "関係代名詞プリント").first():
            material = models.TeachingMaterial(
                title="関係代名詞プリント", s3_key="dummy/path.pdf", category="material", tenant_id=tenant.id
            )
            material.subjects.append(tag_english)
            material.detail_tags.append(detail_tag)
            db.add(material)
        db.commit()

        # ==========================================
        # 7. システム・ログ・通知系
        # ==========================================
        print("Creating system logs and notifications...")
        
        # SystemSettings
        if not db.query(models.SystemSetting).first():
            db.add(models.SystemSetting(announcement_enabled=True, announcement_message="【重要】夏季講習の申し込みが始まりました"))

        # Notification
        if not db.query(models.Notification).first():
            db.add(models.Notification(
                user_id=created_instructors[1].id, # 渋谷校長宛
                title="新規の振替申請", message="渋谷校生徒1さんから振替申請が届きました", is_read=False
            ))

        # AuditLog
        if not db.query(models.AuditLog).first():
            db.add(models.AuditLog(
                user_id=created_instructors[0].id, action="CREATE_PRESET", branch_id=shibuya.id,
                details="英語ルート（基礎）を作成しました"
            ))

        # Changelog & FeatureRequest
        if not db.query(models.Changelog).first():
            db.add(models.Changelog(version="v1.0.0", release_date="2026-05-01", title="初回リリース", description="LearningDBを公開しました"))
            db.add(models.FeatureRequest(reporter_username="inst_shibuya_1", report_date="2026-05-20", title="グラフの目標線表示", description="目標時間が分かるようにしてほしい", status="未対応"))

        db.commit()

        print("🎉 All demo data creation complete!")

    except Exception as e:
        print(f"❌ Error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()