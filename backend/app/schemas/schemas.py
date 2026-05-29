from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from datetime import date
from pydantic import EmailStr

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    role: str = "user"
    school: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        orm_mode = True

# --- Student Schemas ---
class StudentBase(BaseModel):
    name: str
    school: str
    deviation_value: Optional[int] = None
    target_level: Optional[str] = None
    grade: Optional[str] = None
    previous_school: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(StudentBase):
    pass

class Student(StudentBase):
    id: int
    # Instructors can be fetched separately or included if needed
    
    class Config:
        from_attributes = True

# --- StudentInstructor Schemas ---
class StudentInstructorBase(BaseModel):
    student_id: int
    user_id: int
    is_main: int = 0

class StudentInstructorCreate(StudentInstructorBase):
    pass

class StudentInstructor(StudentInstructorBase):
    id: int

    class Config:
        from_attributes = True

# --- MasterTextbook Schemas ---
class MasterTextbookBase(BaseModel):
    level: str
    subject: str
    book_name: str
    duration: Optional[float] = None


class MasterTextbook(MasterTextbookBase):
    id: int

    class Config:
        from_attributes = True

# --- Progress Schemas ---
class ProgressBase(BaseModel):
    student_id: int
    subject: str
    level: str
    book_name: str
    duration: Optional[float] = None
    is_planned: Optional[bool] = None
    is_done: Optional[bool] = None
    completed_units: int = 0
    total_units: int = 1

class ProgressCreate(ProgressBase):
    pass

class ProgressUpdate(BaseModel):
    # For bulk updates, we might need a looser schema
    subject: str
    level: str
    book_name: str
    duration: Optional[float] = None
    is_planned: Optional[bool] = None
    is_done: Optional[bool] = None
    completed_units: Optional[int] = None
    total_units: Optional[int] = None

class Progress(ProgressBase):
    id: int

    class Config:
        orm_mode = True

# --- Bulk Preset Schemas ---
class BulkPresetCreate(BaseModel):
    subject: str
    preset_name: str
    book_names: List[str]


# --- Past Exam Result Schemas ---
class PastExamResultBase(BaseModel):
    student_id: int
    date: str
    university_name: str
    faculty_name: Optional[str] = None
    exam_system: Optional[str] = None
    year: int
    subject: str
    time_required: Optional[int] = None
    total_time_allowed: Optional[int] = None
    correct_answers: Optional[int] = None
    total_questions: Optional[int] = None

class PastExamResultCreate(PastExamResultBase):
    pass

class PastExamResult(PastExamResultBase):
    id: int

    class Config:
        orm_mode = True

# --- University Acceptance Schemas ---
class UniversityAcceptanceBase(BaseModel):
    student_id: int
    university_name: str
    faculty_name: str
    department_name: Optional[str] = None
    exam_system: Optional[str] = None
    result: Optional[str] = None
    application_deadline: Optional[str] = None
    exam_date: Optional[str] = None
    announcement_date: Optional[str] = None
    procedure_deadline: Optional[str] = None

class UniversityAcceptanceCreate(UniversityAcceptanceBase):
    pass

class UniversityAcceptance(UniversityAcceptanceBase):
    id: int

    class Config:
        orm_mode = True

# --- Mock Exam Result Schemas ---
class MockExamResultBase(BaseModel):
    student_id: int
    result_type: str
    mock_exam_name: str
    mock_exam_format: str
    grade: str
    round: str
    exam_date: Optional[date] = None

    subject_kokugo_desc: Optional[int] = None
    subject_math_desc: Optional[int] = None
    subject_english_desc: Optional[int] = None
    subject_rika1_desc: Optional[int] = None
    subject_rika2_desc: Optional[int] = None
    subject_shakai1_desc: Optional[int] = None
    subject_shakai2_desc: Optional[int] = None
    
    subject_kokugo_mark: Optional[int] = None
    subject_math1a_mark: Optional[int] = None
    subject_math2bc_mark: Optional[int] = None
    subject_english_r_mark: Optional[int] = None
    subject_english_l_mark: Optional[int] = None
    subject_rika1_mark: Optional[int] = None
    subject_rika2_mark: Optional[int] = None
    subject_shakai1_mark: Optional[int] = None
    subject_shakai2_mark: Optional[int] = None
    subject_rika_kiso1_mark: Optional[int] = None
    subject_rika_kiso2_mark: Optional[int] = None
    subject_info_mark: Optional[int] = None

class MockExamResultCreate(MockExamResultBase):
    pass

class MockExamResult(MockExamResultBase):
    id: int

    class Config:
        orm_mode = True

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Changelog Schemas ---
class ChangelogCreate(BaseModel):
    version: str
    title: str
    description: Optional[str] = None
    release_date: Optional[str] = None # 未指定ならサーバー側で現在日付

# --- Master Textbook Schemas ---
class MasterTextbookCreate(BaseModel):
    subject: str
    level: str
    book_name: str
    duration: float = 0.0

class MasterTextbookUpdate(BaseModel):
    subject: Optional[str] = None
    level: Optional[str] = None
    book_name: Optional[str] = None
    duration: Optional[float] = None

class BulkPresetUpdate(BaseModel):
    preset_name: Optional[str] = None
    subject: Optional[str] = None
    book_names: Optional[List[str]] = None

class ReportStateBase(BaseModel):
    # 中身の構造はフロントエンドに任せ、バックエンドは柔軟な辞書型として受け取ります
    report_data: Dict[str, Any]

class ReportStateUpdate(ReportStateBase):
    pass

class ReportStateResponse(ReportStateBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True  # ※Pydantic v1 をお使いの場合は orm_mode = True にしてください

# --- Tag Schemas ---
class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: int

    class Config:
        from_attributes = True

class SubjectTagResponse(TagResponse):
    pass

class DetailTagResponse(TagResponse):
    pass


# --- Teaching Material Schemas ---
class TeachingMaterialBase(BaseModel):
    title: str
    internal_memo: Optional[str] = None
    subject_id: Optional[int] = None
    detail_tag_id: Optional[int] = None

class TeachingMaterialCreate(TeachingMaterialBase):
    pass 
    # file_path はAPI側で保存時に生成するため、フロントからのリクエストには含めません

class TeachingMaterialUpdate(BaseModel):
    title: Optional[str] = None
    internal_memo: Optional[str] = None
    subject_id: Optional[int] = None
    detail_tag_id: Optional[int] = None
    # ※PDFファイルの差し替えは、通常FormDataで受け取るため、ここでは定義しません

class TeachingMaterialResponse(BaseModel):
    id: int
    title: str
    file_path: Optional[str] = None      # 旧フィールド（互換性のため残す）
    s3_key: Optional[str] = None
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    internal_memo: Optional[str] = None
    tenant_id: Optional[int] = None
    category: Optional[str] = "material"  # 'material' | 'route_table'
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
    
    subjects: List[SubjectTagResponse] = []
    detail_tags: List[DetailTagResponse] = []

    class Config:
        from_attributes = True

# --- Application (Transfer & Absence) Schemas ---
from datetime import datetime

class TransferRequestBase(BaseModel):
    instructor_id: int
    original_date: str
    candidate_dates: str
    reason: str

class TransferRequestCreate(TransferRequestBase):
    pass
    # tenant_id, student_id are handled by backend

class TransferRequestUpdate(BaseModel):
    status: str
    approved_date: Optional[str] = None      
    instructor_comment: Optional[str] = None  

class TransferRequestResponse(TransferRequestBase):
    id: int
    tenant_id: int
    student_id: int
    student_name: Optional[str] = None
    instructor_name: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    approved_date: Optional[str] = None      
    instructor_comment: Optional[str] = None  

    class Config:
        from_attributes = True

class AbsenceReportBase(BaseModel):
    instructor_id: int
    absence_date: str
    reason: str
    report_info: Optional[str] = ""

class AbsenceReportCreate(AbsenceReportBase):
    pass
    # tenant_id, student_id are handled by backend

class AbsenceReportUpdate(BaseModel):
    status: str

class AbsenceReportResponse(AbsenceReportBase):
    id: int
    tenant_id: int
    student_id: int
    student_name: Optional[str] = None
    instructor_name: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TenantCreateWithAdmin(BaseModel):
    tenant_name: str
    admin_email: EmailStr
    admin_password: str

class TenantOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class ProgressUpdate(BaseModel):
    id: Optional[int] = None
    completed_units: int
    total_units: int

class CustomBookSchema(BaseModel):
    subject: str
    level: str
    book_name: str
    duration: float = 0.0

class ProgressBatchCreate(BaseModel):
    student_id: int
    book_ids: List[int] = [] 
    custom_books: List[CustomBookSchema] = []

class AdminUserCreate(BaseModel):
    username: str
    password: Optional[str]
    role: str = "user"  # 指定がなければ一般講師(user)
    school: str = ""    # 指定がなければ空文字

# --- Attendance & Webhook Schemas ---
class CompleteTransferRequest(BaseModel):
    rowNumber: int
    name: str

class WebhookPayload(BaseModel):
    type: str  # "transfer" (振替) または "absence" (欠席)
    student_name: str
    instructor_name: str
    message: str

# --- Exam & Acceptance Schemas (from exams.py) ---
from typing import Union

class AcceptanceCreate(BaseModel):
    student_id: Optional[int] = None
    university_name: str
    faculty_name: str
    department_name: Optional[str] = None
    exam_system: Optional[str] = None
    result: Optional[str] = "未受験"
    application_deadline: Optional[str] = None
    exam_date: Optional[str] = None
    announcement_date: Optional[str] = None
    procedure_deadline: Optional[str] = None

class AcceptanceUpdate(BaseModel):
    result: str

class PastExamCreate(BaseModel):
    student_id: Optional[int] = None
    date: str
    university_name: str
    faculty_name: Optional[str] = None
    exam_system: Optional[str] = None
    year: int
    subject: str
    time_required: Optional[Union[int,str]] = None
    total_time_allowed: Optional[Union[int,str]] = None
    correct_answers: Optional[Union[int,str]] = None
    total_questions: Optional[Union[int,str]] = None

class MockExamCreate(BaseModel):
    student_id: Optional[int] = None
    result_type: str
    mock_exam_name: str
    mock_exam_format: str
    grade: str
    round: str
    exam_date: Optional[date] = None
    
    # 記述式
    subject_kokugo_desc: Optional[Union[int,str]] = None
    subject_math_desc: Optional[Union[int,str]] = None
    subject_english_desc: Optional[Union[int,str]] = None
    subject_rika1_desc: Optional[Union[int,str]] = None
    subject_rika2_desc: Optional[Union[int,str]] = None
    subject_shakai1_desc: Optional[Union[int,str]] = None
    subject_shakai2_desc: Optional[Union[int,str]] = None
    
    # マーク式
    subject_kokugo_mark: Optional[Union[int,str]] = None
    subject_math1a_mark: Optional[Union[int,str]] = None
    subject_math2bc_mark: Optional[Union[int,str]] = None
    subject_english_r_mark: Optional[Union[int,str]] = None
    subject_english_l_mark: Optional[Union[int,str]] = None
    subject_rika1_mark: Optional[Union[int,str]] = None
    subject_rika2_mark: Optional[Union[int,str]] = None
    subject_shakai1_mark: Optional[Union[int,str]] = None
    subject_shakai2_mark: Optional[Union[int,str]] = None
    subject_rika_kiso1_mark: Optional[Union[int,str]] = None
    subject_rika_kiso2_mark: Optional[Union[int,str]] = None
    subject_info_mark: Optional[Union[int,str]] = None