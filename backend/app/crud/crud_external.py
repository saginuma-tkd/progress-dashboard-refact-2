from sqlalchemy.orm import Session
from app.models.models import PastExamResult, UniversityAcceptance, MockExamResult, Student
from app.schemas.schemas import PastExamResultCreate, UniversityAcceptanceCreate, MockExamResultCreate

def create_past_exam_result(db: Session, result: PastExamResultCreate):
    db_result = PastExamResult(**result.dict())
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result

def create_university_acceptance(db: Session, acceptance: UniversityAcceptanceCreate):
    db_acceptance = UniversityAcceptance(**acceptance.dict())
    db.add(db_acceptance)
    db.commit()
    db.refresh(db_acceptance)
    return db_acceptance

def create_mock_exam_result(db: Session, result: MockExamResultCreate):
    # Pydantic schema handles date conversion, but we need to ensure correct mapping
    db_result = MockExamResult(**result.dict())
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result

def get_student_id_by_name(db: Session, school: str, name: str):
    student = db.query(Student).filter(Student.school == school, Student.name == name).first()
    return student.id if student else None
