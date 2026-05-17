from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Date, UniqueConstraint, Text, DateTime, LargeBinary, JSON, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
from datetime import date, datetime

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    school = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)  # ← 追加

    student_instructors = relationship("StudentInstructor", back_populates="user")
    student_profile = relationship("Student", back_populates="user", uselist=False)

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # ログインユーザーとの紐付け
    name = Column(String, nullable=False)
    school = Column(String, nullable=False)
    deviation_value = Column(Float)
    target_level = Column(String)
    grade = Column(String)
    previous_school = Column(String)
    memo = Column(Text, nullable=True)

    __table_args__ = (UniqueConstraint('school', 'name', name='_school_name_uc'),)

    user = relationship("User", back_populates="student_profile")
    instructors = relationship("StudentInstructor", back_populates="student", cascade="all, delete-orphan")
    progress = relationship("Progress", back_populates="student", cascade="all, delete-orphan")
    past_exam_results = relationship("PastExamResult", back_populates="student", cascade="all, delete-orphan")
    university_acceptances = relationship("UniversityAcceptance", back_populates="student", cascade="all, delete-orphan")
    mock_exam_results = relationship("MockExamResult", back_populates="student", cascade="all, delete-orphan")
    eiken_results = relationship("EikenResult", back_populates="student", cascade="all, delete-orphan")

class StudentInstructor(Base):
    __tablename__ = "student_instructors"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_main = Column(Integer, nullable=False, default=0)
    memo = Column(Text, nullable=True)

    __table_args__ = (UniqueConstraint('student_id', 'user_id', name='_student_user_uc'),)

    student = relationship("Student", back_populates="instructors")
    user = relationship("User", back_populates="student_instructors")

class MasterTextbook(Base):
    __tablename__ = "master_textbooks"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    book_name = Column(String, nullable=False)
    duration = Column(Float)

    __table_args__ = (UniqueConstraint('subject', 'level', 'book_name', name='_subject_level_book_uc'),)

class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String, nullable=False)
    level = Column(String, nullable=False)
    book_name = Column(String, nullable=False)
    duration = Column(Float)
    is_planned = Column(Boolean)
    is_done = Column(Boolean)
    completed_units = Column(Integer, nullable=False, default=0)
    total_units = Column(Integer, nullable=False, default=1)

    __table_args__ = (UniqueConstraint('student_id', 'subject', 'level', 'book_name', name='_student_prog_uc'),)

    student = relationship("Student", back_populates="progress")



class BulkPreset(Base):
    __tablename__ = "bulk_presets"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    preset_name = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint('subject', 'preset_name', name='_subject_preset_uc'),)

    books = relationship("BulkPresetBook", back_populates="preset", cascade="all, delete-orphan")

class BulkPresetBook(Base):
    __tablename__ = "bulk_preset_books"

    id = Column(Integer, primary_key=True, index=True)
    preset_id = Column(Integer, ForeignKey("bulk_presets.id", ondelete="CASCADE"), nullable=False)
    book_name = Column(String, nullable=False)

    preset = relationship("BulkPreset", back_populates="books")

class PastExamResult(Base):
    __tablename__ = "past_exam_results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date = Column(String, nullable=False) # Existing is TEXT
    university_name = Column(String, nullable=False)
    faculty_name = Column(String)
    exam_system = Column(String)
    year = Column(Integer, nullable=False)
    subject = Column(String, nullable=False)
    time_required = Column(Integer)
    total_time_allowed = Column(Integer)
    correct_answers = Column(Integer)
    total_questions = Column(Integer)

    student = relationship("Student", back_populates="past_exam_results")

class UniversityAcceptance(Base):
    __tablename__ = "university_acceptance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    university_name = Column(String, nullable=False)
    faculty_name = Column(String, nullable=False)
    department_name = Column(String)
    exam_system = Column(String)
    result = Column(String) # '合格', '不合格', NULL
    application_deadline = Column(String)
    exam_date = Column(String)
    announcement_date = Column(String)
    procedure_deadline = Column(String)

    student = relationship("Student", back_populates="university_acceptances")

class FeatureRequest(Base):
    __tablename__ = "feature_requests"

    id = Column(Integer, primary_key=True, index=True)
    reporter_username = Column(String, nullable=False)
    report_date = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, nullable=False, default='未対応')
    resolution_message = Column(Text)

class BugReport(Base):
    __tablename__ = "bug_reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_username = Column(String, nullable=False)
    report_date = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, nullable=False, default='未対応')
    resolution_message = Column(Text)

class Changelog(Base):
    __tablename__ = "changelog"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, nullable=False)
    release_date = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)

class MockExamResult(Base):
    __tablename__ = "mock_exam_results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    result_type = Column(String, nullable=False)
    mock_exam_name = Column(String, nullable=False)
    mock_exam_format = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    round = Column(String, nullable=False)
    exam_date = Column(Date)
    
    subject_kokugo_desc = Column(Integer)
    subject_math_desc = Column(Integer)
    subject_english_desc = Column(Integer)
    subject_rika1_desc = Column(Integer)
    subject_rika2_desc = Column(Integer)
    subject_shakai1_desc = Column(Integer)
    subject_shakai2_desc = Column(Integer)
    
    subject_kokugo_mark = Column(Integer)
    subject_math1a_mark = Column(Integer)
    subject_math2bc_mark = Column(Integer)
    subject_english_r_mark = Column(Integer)
    subject_english_l_mark = Column(Integer)
    subject_rika1_mark = Column(Integer)
    subject_rika2_mark = Column(Integer)
    subject_shakai1_mark = Column(Integer)
    subject_shakai2_mark = Column(Integer)
    subject_rika_kiso1_mark = Column(Integer)
    subject_rika_kiso2_mark = Column(Integer)
    subject_info_mark = Column(Integer)

    student = relationship("Student", back_populates="mock_exam_results")

class EikenResult(Base):
    __tablename__ = "eiken_results" # add_eiken_table.py のテーブル名に合わせる

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    grade = Column(String, nullable=False)
    cse_score = Column(Integer)  # add_eiken_table.py の定義に合わせて 'score' ではなく 'cse_score' に
    exam_date = Column(String, nullable=True)
    result = Column(String)

    student = relationship("Student", back_populates="eiken_results")

class RootTable(Base):
    __tablename__ = "root_tables"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    s3_key = Column(String, nullable=False)
    file_size = Column(Integer)
    original_filename = Column(String)
    subject = Column(String)
    level = Column(String)
    academic_year = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    maintenance_mode = Column(Boolean, default=False)
    announcement_enabled = Column(Boolean, default=False)
    announcement_message = Column(String, default="")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # 「誰が」操作したか
    action = Column(String, index=True)                # 「何を」したか (例: "CREATE_USER", "UPDATE_ROLE", "LOGIN")
    branch_id = Column(Integer, index=True)            # 「どの校舎の」データか（Adminの絞り込み用！）
    details = Column(String)                           # 「詳細」 (例: "user_id 5 の権限を admin に変更")
    timestamp = Column(DateTime, default=datetime.utcnow) # 「いつ」操作したか

class StudentReportState(Base):
    __tablename__ = "student_report_states"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), unique=True, index=True)
    
    # フロントエンドの JSON データをそのまま保存
    report_data = Column(JSON, default=dict) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# --- 教材管理用モデル（多対多対応版） ---

# 中間テーブル（教材と科目タグ）
material_subject_association = Table(
    'material_subject_association', Base.metadata,
    Column('material_id', Integer, ForeignKey('teaching_materials.id', ondelete="CASCADE")),
    Column('subject_id', Integer, ForeignKey('subject_tags.id', ondelete="CASCADE"))
)

# 中間テーブル（教材と詳細タグ）
material_detail_association = Table(
    'material_detail_association', Base.metadata,
    Column('material_id', Integer, ForeignKey('teaching_materials.id', ondelete="CASCADE")),
    Column('detail_id', Integer, ForeignKey('detail_tags.id', ondelete="CASCADE"))
)

class SubjectTag(Base):
    __tablename__ = "subject_tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    # リレーション変更
    materials = relationship("TeachingMaterial", secondary=material_subject_association, back_populates="subjects")

class DetailTag(Base):
    __tablename__ = "detail_tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    # リレーション変更
    materials = relationship("TeachingMaterial", secondary=material_detail_association, back_populates="detail_tags")

class TeachingMaterial(Base):
    __tablename__ = "teaching_materials"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    s3_key = Column(String, nullable=False)
    file_size = Column(Integer)
    original_filename = Column(String)
    internal_memo = Column(Text, nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)  # ← 追加済み
    # カテゴリ: 'material'（教材）| 'route_table'（ルート表）
    category = Column(String, nullable=False, server_default="material")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション変更（複数形になっています）
    subjects = relationship("SubjectTag", secondary=material_subject_association, back_populates="materials")
    detail_tags = relationship("DetailTag", secondary=material_detail_association, back_populates="materials")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # 誰宛の通知か
    title = Column(String, nullable=False) # 例: "新規の振替申請"
    message = Column(String, nullable=False) # 例: "佐藤先生、鈴木さんの振替申請が届きました"
    is_read = Column(Boolean, default=False) # 既読フラグ（ここがFalseならポップアップを出す）
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション（Userテーブルから notifications でアクセスできるようにするなら）
    user = relationship("User", backref="notifications")

class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    instructor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    original_date = Column(String)
    candidate_dates = Column(Text)
    reason = Column(Text)
    
    status = Column(String, nullable=False, default="pending") # pending, approved, rejected
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student", backref="transfer_requests")
    instructor = relationship("User", foreign_keys=[instructor_id])

class AbsenceReport(Base):
    __tablename__ = "absence_reports"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    instructor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    absence_date = Column(String)
    reason = Column(Text)
    report_info = Column(Text)
    
    status = Column(String, nullable=False, default="acknowledged")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student", backref="absence_reports")
    instructor = relationship("User", foreign_keys=[instructor_id])