# backend/seed_data.py

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import models
from app.core.security import get_password_hash

def seed_demo_data():
    db = SessionLocal()
    try:
        # 1. データの作成開始
        print("Starting demo data creation...")

        # ==========================================
        # 1.5. テナント (Tenant) を作成
        # ==========================================
        print("Creating tenant data...")
        tenant_names = ["渋谷校", "新宿校", "開発本部"]
        for t_name in tenant_names:
            if not db.query(models.Tenant).filter(models.Tenant.name == t_name).first():
                db.add(models.Tenant(name=t_name))
        db.commit()

        # ==========================================
        # 2. 汎用モック講師（User）を作成
        # ==========================================
        print("Creating instructor data...")
        instructors = [
            {"username": "開発者", "role": "developer", "school": "開発本部"},
            {"username": "admin_shibuya", "role": "admin", "school": "渋谷校"},
            {"username": "inst_shibuya_1", "role": "user", "school": "渋谷校"},
            {"username": "inst_shinjuku_1", "role": "user", "school": "新宿校"},
        ]
        
        created_instructors = []
        for inst_data in instructors:
            inst = db.query(models.User).filter(models.User.username == inst_data["username"]).first()
            if not inst:
                inst = models.User(
                    username=inst_data["username"], 
                    password=get_password_hash("password123"), 
                    role=inst_data["role"], 
                    school=inst_data["school"]
                )
                db.add(inst)
                db.flush()
            created_instructors.append(inst)
        super_admin_email = "superadmin@example.com"
        existing_super_admin = db.query(models.User).filter(models.User.username == super_admin_email).first()
        if not existing_super_admin:
            super_admin = models.User(
                username=super_admin_email,                   # 👈 email ではなく username
                password=get_password_hash("superadmin123"),  # 👈 hashed_password ではなく password
                role="super_admin",
                tenant_id=None
            )
            db.add(super_admin)
        db.commit()

        # ==========================================
        # 3. 汎用モック生徒（Student）を作成
        # ==========================================
        print("Creating student data...")
        students_data = [
            {"name": "渋谷校生徒1", "school": "渋谷校", "grade": "高3", "deviation_value": 55.0, "target_level": "志望校A", "previous_school": "出身校A"},
            {"name": "渋谷校生徒2", "school": "渋谷校", "grade": "高2", "deviation_value": 60.0, "target_level": "志望校B", "previous_school": "出身校B"},
            {"name": "渋谷校生徒3", "school": "渋谷校", "grade": "高1", "deviation_value": 50.0, "target_level": "志望校C", "previous_school": "出身校C"},
            {"name": "新宿校生徒1", "school": "新宿校", "grade": "高3", "deviation_value": 65.0, "target_level": "志望校A", "previous_school": "出身校D"},
            {"name": "新宿校生徒2", "school": "新宿校", "grade": "既卒", "deviation_value": 58.0, "target_level": "志望校B", "previous_school": "出身校E"},
        ]

        for s_data in students_data:
            student = db.query(models.Student).filter(models.Student.name == s_data["name"]).first()
            if not student:
                student = models.Student(**s_data)
                db.add(student)
                db.flush() # ID取得のため
                
                # 講師の紐づけ (渋谷校なら inst_shibuya_1, 新宿校なら inst_shinjuku_1)
                main_inst_idx = 1 if student.school == "渋谷校" else 2
                db.add(models.StudentInstructor(
                    student_id=student.id,
                    user_id=created_instructors[main_inst_idx].id,
                    is_main=1
                ))

            # ログイン用のアカウント (Role='student') を作成
            user_student = db.query(models.User).filter(models.User.username == s_data["name"]).first()
            if not user_student:
                user_student = models.User(
                    username=s_data["name"],
                    password=get_password_hash("password123"),
                    role="student",
                    school=s_data["school"]
                )
                db.add(user_student)
                db.flush()
            
            # 生徒データにUser IDを紐付け
            student.user_id = user_student.id

            # テナントIDの取得
            tenant = db.query(models.Tenant).filter(models.Tenant.name == s_data["school"]).first()
            tenant_id = tenant.id if tenant else 1

            # ダミーの振替申請データ (pending)
            existing_transfer = db.query(models.TransferRequest).filter(models.TransferRequest.student_id == student.id).first()
            if not existing_transfer:
                db.add(models.TransferRequest(
                    tenant_id=tenant_id,
                    student_id=student.id,
                    instructor_id=created_instructors[main_inst_idx].id, # 👈 追加
                    original_date="2026-06-01",
                    candidate_dates="2026-06-03, 2026-06-04",
                    reason="学校の行事のため",
                    status="pending"
                ))

            # ダミーの欠席報告データ (pending)
            existing_absence = db.query(models.AbsenceReport).filter(models.AbsenceReport.student_id == student.id).first()
            if not existing_absence:
                db.add(models.AbsenceReport(
                    tenant_id=tenant_id,
                    student_id=student.id,
                    instructor_id=created_instructors[main_inst_idx].id, # 👈 追加
                    absence_date="2026-06-05",                           # 👈 day_of_week を absence_date に変更
                    reason="体調不良のため",
                    report_info="次回補講を希望します",
                    status="pending"
                ))

        db.commit()

        # ==========================================
        # 4. 汎用モック参考書マスタ (MasterTextbook) を作成
        # ==========================================
        print("Creating master textbook data...")
        
        # ⚠️ "1ヶ月" などの文字列を 1.0 などの数字(Float)に変更！
        textbooks_data = [
            {"subject": "英語", "level": "基礎", "book_name": "英語参考書1", "duration": 100},
            {"subject": "英語", "level": "標準", "book_name": "英語参考書2", "duration": 200},
            {"subject": "英語", "level": "発展", "book_name": "英語参考書3", "duration": 300},
            {"subject": "数学", "level": "基礎", "book_name": "数学参考書1", "duration": 200},
            {"subject": "数学", "level": "標準", "book_name": "数学参考書2", "duration": 300},
            {"subject": "国語", "level": "基礎", "book_name": "国語参考書1", "duration": 100},
            {"subject": "国語", "level": "標準", "book_name": "国語参考書2", "duration": 200},
        ]

        for tb_data in textbooks_data:
            if not db.query(models.MasterTextbook).filter(models.MasterTextbook.book_name == tb_data["book_name"]).first():
                db.add(models.MasterTextbook(**tb_data))
        db.commit()

        # ==========================================
        # 5. 汎用モックプリセット (BulkPreset & BulkPresetBook) を作成
        # ==========================================
        print("Creating preset data...")
        presets_data = [
            {
                "preset_name": "英語ルート1（基礎）",
                "subject": "英語",
                "books": ["英語参考書1", "英語参考書2"]
            },
            {
                "preset_name": "英語ルート2（発展）",
                "subject": "英語",
                "books": ["英語参考書2", "英語参考書3"]
            },
            {
                "preset_name": "数学ルート1",
                "subject": "数学",
                "books": ["数学参考書1", "数学参考書2"]
            }
        ]

        for p_data in presets_data:
            existing_preset = db.query(models.BulkPreset).filter(
                models.BulkPreset.preset_name == p_data["preset_name"],
                models.BulkPreset.subject == p_data["subject"]
            ).first()
            
            if not existing_preset:
                new_preset = models.BulkPreset(
                    preset_name=p_data["preset_name"],
                    subject=p_data["subject"]
                )
                db.add(new_preset)
                db.flush() # IDを取得するためにflush

                for book_name in p_data["books"]:
                    db.add(models.BulkPresetBook(
                        preset_id=new_preset.id,
                        book_name=book_name
                    ))
        db.commit()

        print("Demo data creation complete!")

    except Exception as e:
        print(f"Error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()