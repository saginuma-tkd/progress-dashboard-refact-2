from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Date, UniqueConstraint, Text, DateTime, LargeBinary, JSON, Table
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.database import Base
from datetime import date, datetime, timezone
from typing import Optional, Any

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)

class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    
    __table_args__ = (UniqueConstraint('tenant_id', 'name', name='_tenant_school_name_uc'),)

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="user")
    school: Mapped[Optional[str]] = mapped_column(String)
    tenant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tenants.id"), nullable=True) 
    school_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)

    student_instructors = relationship("StudentInstructor", back_populates="user")
    student_profile = relationship("Student", back_populates="user", uselist=False)

class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True) # ログインユーザーとの紐付け
    name: Mapped[str] = mapped_column(String, nullable=False)
    school: Mapped[str] = mapped_column(String, nullable=False)
    school_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)
    deviation_value: Mapped[Optional[float]] = mapped_column(Float)
    target_level: Mapped[Optional[str]] = mapped_column(String)
    grade: Mapped[Optional[str]] = mapped_column(String)
    previous_school: Mapped[Optional[str]] = mapped_column(String)
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shared_memo = Column(String, nullable=True)

    __table_args__ = (UniqueConstraint('school_id', 'name', name='_school_id_name_uc'),)

    user = relationship("User", back_populates="student_profile")
    instructors = relationship("StudentInstructor", back_populates="student", cascade="all, delete-orphan")
    progress = relationship("Progress", back_populates="student", cascade="all, delete-orphan")
    past_exam_results = relationship("PastExamResult", back_populates="student", cascade="all, delete-orphan")
    university_acceptances = relationship("UniversityAcceptance", back_populates="student", cascade="all, delete-orphan")
    mock_exam_results = relationship("MockExamResult", back_populates="student", cascade="all, delete-orphan")
    eiken_results = relationship("EikenResult", back_populates="student", cascade="all, delete-orphan")

class StudentInstructor(Base):
    __tablename__ = "student_instructors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_main: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (UniqueConstraint('student_id', 'user_id', name='_student_user_uc'),)

    student = relationship("Student", back_populates="instructors")
    user = relationship("User", back_populates="student_instructors")

class MasterTextbook(Base):
    __tablename__ = "master_textbooks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    level: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    book_name: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[Optional[float]] = mapped_column(Float)

    # 🌟 追加：テナントと校舎の紐付け（階層管理用）
    tenant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True)
    school_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)

    # 🌟 変更：テナントや校舎が違えば、同じ名前の参考書を登録できるように制約を拡張
    __table_args__ = (UniqueConstraint('subject', 'level', 'book_name', 'tenant_id', 'school_id', name='_subject_level_book_scope_uc'),)

class Progress(Base):
    __tablename__ = "progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[str] = mapped_column(String, nullable=False)
    book_name: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[Optional[float]] = mapped_column(Float)
    is_planned: Mapped[Optional[bool]] = mapped_column(Boolean)
    is_done: Mapped[Optional[bool]] = mapped_column(Boolean)
    completed_units: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_units: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    __table_args__ = (UniqueConstraint('student_id', 'subject', 'level', 'book_name', name='_student_prog_uc'),)

    student = relationship("Student", back_populates="progress")

class BulkPreset(Base):
    __tablename__ = "bulk_presets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    preset_name: Mapped[str] = mapped_column(String, nullable=False)

    # 🌟 文字列の school をやめ、school_id (外部キー) に変更！
    tenant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True)
    school_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)

    # 🌟 ユニーク制約も school_id に変更
    __table_args__ = (UniqueConstraint('subject', 'preset_name', 'tenant_id', 'school_id', name='_subject_preset_scope_uc'),)

    books = relationship("BulkPresetBook", back_populates="preset", cascade="all, delete-orphan")

class BulkPresetBook(Base):
    __tablename__ = "bulk_preset_books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    preset_id: Mapped[int] = mapped_column(Integer, ForeignKey("bulk_presets.id", ondelete="CASCADE"), nullable=False)
    book_name: Mapped[str] = mapped_column(String, nullable=False)

    preset = relationship("BulkPreset", back_populates="books")

class PastExamResult(Base):
    __tablename__ = "past_exam_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[str] = mapped_column(String, nullable=False) # Existing is TEXT
    university_name: Mapped[str] = mapped_column(String, nullable=False)
    faculty_name: Mapped[Optional[str]] = mapped_column(String)
    exam_system: Mapped[Optional[str]] = mapped_column(String)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    time_required: Mapped[Optional[int]] = mapped_column(Integer)
    total_time_allowed: Mapped[Optional[int]] = mapped_column(Integer)
    correct_answers: Mapped[Optional[int]] = mapped_column(Integer)
    total_questions: Mapped[Optional[int]] = mapped_column(Integer)

    student = relationship("Student", back_populates="past_exam_results")

class UniversityAcceptance(Base):
    __tablename__ = "university_acceptance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    university_name: Mapped[str] = mapped_column(String, nullable=False)
    faculty_name: Mapped[str] = mapped_column(String, nullable=False)
    department_name: Mapped[Optional[str]] = mapped_column(String)
    exam_system: Mapped[Optional[str]] = mapped_column(String)
    result: Mapped[Optional[str]] = mapped_column(String) # '合格', '不合格', NULL
    application_deadline: Mapped[Optional[str]] = mapped_column(String)
    exam_date: Mapped[Optional[str]] = mapped_column(String)
    announcement_date: Mapped[Optional[str]] = mapped_column(String)
    procedure_deadline: Mapped[Optional[str]] = mapped_column(String)

    student = relationship("Student", back_populates="university_acceptances")

class FeatureRequest(Base):
    __tablename__ = "feature_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reporter_username: Mapped[str] = mapped_column(String, nullable=False)
    report_date: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default='未対応')
    resolution_message: Mapped[Optional[str]] = mapped_column(Text)

class BugReport(Base):
    __tablename__ = "bug_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reporter_username: Mapped[str] = mapped_column(String, nullable=False)
    report_date: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default='未対応')
    resolution_message: Mapped[Optional[str]] = mapped_column(Text)

class Changelog(Base):
    __tablename__ = "changelog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    version: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)

class MockExamResult(Base):
    __tablename__ = "mock_exam_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    result_type: Mapped[str] = mapped_column(String, nullable=False)
    mock_exam_name: Mapped[str] = mapped_column(String, nullable=False)
    mock_exam_format: Mapped[str] = mapped_column(String, nullable=False)
    grade: Mapped[str] = mapped_column(String, nullable=False)
    round: Mapped[str] = mapped_column(String, nullable=False)
    exam_date: Mapped[Optional[date]] = mapped_column(Date)
    
    subject_kokugo_desc: Mapped[Optional[int]] = mapped_column(Integer)
    subject_math_desc: Mapped[Optional[int]] = mapped_column(Integer)
    subject_english_desc: Mapped[Optional[int]] = mapped_column(Integer)
    subject_rika1_desc: Mapped[Optional[int]] = mapped_column(Integer)
    subject_rika2_desc: Mapped[Optional[int]] = mapped_column(Integer)
    subject_shakai1_desc: Mapped[Optional[int]] = mapped_column(Integer)
    subject_shakai2_desc: Mapped[Optional[int]] = mapped_column(Integer)
    
    subject_kokugo_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_math1a_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_math2bc_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_english_r_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_english_l_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_rika1_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_rika2_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_shakai1_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_shakai2_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_rika_kiso1_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_rika_kiso2_mark: Mapped[Optional[int]] = mapped_column(Integer)
    subject_info_mark: Mapped[Optional[int]] = mapped_column(Integer)

    student = relationship("Student", back_populates="mock_exam_results")

class EikenResult(Base):
    __tablename__ = "eiken_results" # add_eiken_table.py のテーブル名に合わせる

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    grade: Mapped[str] = mapped_column(String, nullable=False)
    cse_score: Mapped[Optional[int]] = mapped_column(Integer)  # add_eiken_table.py の定義に合わせて 'score' ではなく 'cse_score' に
    exam_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    result: Mapped[Optional[str]] = mapped_column(String)

    student = relationship("Student", back_populates="eiken_results")

class RootTable(Base):
    __tablename__ = "root_tables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    s3_key: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    original_filename: Mapped[Optional[str]] = mapped_column(String)
    subject: Mapped[Optional[str]] = mapped_column(String)
    level: Mapped[Optional[str]] = mapped_column(String)
    academic_year: Mapped[Optional[int]] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    maintenance_mode: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    announcement_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    announcement_message: Mapped[Optional[str]] = mapped_column(String, default="")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))  # 「誰が」操作したか
    action: Mapped[Optional[str]] = mapped_column(String, index=True)                # 「何を」したか (例: "CREATE_USER", "UPDATE_ROLE", "LOGIN")
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, index=True)            # 「どの校舎の」データか（Adminの絞り込み用！）
    details: Mapped[Optional[str]] = mapped_column(String)                           # 「詳細」 (例: "user_id 5 の権限を admin に変更")
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)) # 「いつ」操作したか

class StudentReportState(Base):
    __tablename__ = "student_report_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), unique=True, index=True)
    
    # フロントエンドの JSON データをそのまま保存
    report_data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict) 
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

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
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    # リレーション変更
    materials = relationship("TeachingMaterial", secondary=material_subject_association, back_populates="subjects")

class DetailTag(Base):
    __tablename__ = "detail_tags"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    # リレーション変更
    materials = relationship("TeachingMaterial", secondary=material_detail_association, back_populates="detail_tags")

class TeachingMaterial(Base):
    __tablename__ = "teaching_materials"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True, nullable=False)
    s3_key: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    original_filename: Mapped[Optional[str]] = mapped_column(String)
    internal_memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    tenant_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tenants.id"), nullable=True)  # ← 既存
    # 🌟 追加：校舎ごとの専用教材にするための紐付け
    school_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    
    category: Mapped[str] = mapped_column(String, nullable=False, server_default="material")
    academic_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
    subjects = relationship("SubjectTag", secondary=material_subject_association, back_populates="materials")
    detail_tags = relationship("DetailTag", secondary=material_detail_association, back_populates="materials")

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # 誰宛の通知か
    title: Mapped[str] = mapped_column(String, nullable=False) # 例: "新規の振替申請"
    message: Mapped[str] = mapped_column(String, nullable=False) # 例: "佐藤先生、鈴木さんの振替申請が届きました"
    is_read: Mapped[Optional[bool]] = mapped_column(Boolean, default=False) # 既読フラグ（ここがFalseならポップアップを出す）
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # リレーション（Userテーブルから notifications でアクセスできるようにするなら）
    user = relationship("User", backref="notifications")

class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    instructor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    original_date: Mapped[Optional[str]] = mapped_column(String)
    candidate_dates: Mapped[Optional[str]] = mapped_column(Text)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending") # pending, approved, rejected

    approved_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)        # 決定した振替日
    instructor_comment: Mapped[Optional[str]] = mapped_column(String, nullable=True)   # 先生からのメッセージ（備考）
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student", backref="transfer_requests")
    instructor = relationship("User", foreign_keys=[instructor_id])

    @property
    def student_name(self) -> str:
        """リレーションを経由して生徒のユーザー名を自動で返すプロパティ"""
        if self.student and self.student.user:
            return self.student.user.username
        return f"生徒ID: {self.student_id}"

    @property
    def instructor_name(self) -> str:
        """リレーションを経由して担当講師のユーザー名を自動で返すプロパティ"""
        if self.instructor:
            return self.instructor.username
        return "未指定"

class AbsenceReport(Base):
    __tablename__ = "absence_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(Integer, ForeignKey("tenants.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    instructor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    absence_date: Mapped[Optional[str]] = mapped_column(String)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    report_info: Mapped[Optional[str]] = mapped_column(Text)
    
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student", backref="absence_reports")
    instructor = relationship("User", foreign_keys=[instructor_id])

    @property
    def student_name(self) -> str:
        if self.student and self.student.user:
            return self.student.user.username
        return f"生徒ID: {self.student_id}"

    @property
    def instructor_name(self) -> str:
        if self.instructor:
            return self.instructor.username
        return "未指定"