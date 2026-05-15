from fastapi import APIRouter, Depends
from sqlmodel import Session, select
import pandas as pd
from typing import List, Any

from backend.database import get_session
from backend.models import PastExamResult, MockExamResult

router = APIRouter()

@router.get("/results/past-exams/{student_id}")
def get_past_exam_results(student_id: int, session: Session = Depends(get_session)):
    """
    過去問演習データを全件取得 (そのままリストで返す)
    修正: created_at ではなく date (受験日) で降順ソート
    """
    statement = select(PastExamResult).where(PastExamResult.student_id == student_id).order_by(PastExamResult.date.desc())
    results = session.exec(statement).all()
    return results

@router.get("/results/mock-exams/{student_id}")
def get_mock_exam_results(student_id: int, session: Session = Depends(get_session)):
    """
    模試データを取得し、Pandasで「縦持ち」に変換して返す
    例: {英語:80, 数学:70} -> [{科目:英語, 点数:80}, {科目:数学, 点数:70}]
    """
    statement = select(MockExamResult).where(MockExamResult.student_id == student_id).order_by(MockExamResult.exam_date.desc())
    results = session.exec(statement).all()

    if not results:
        return []

    # 1. DataFrame化
    data = [r.model_dump() for r in results]
    df = pd.DataFrame(data)

    # 2. 識別用カラム（id_vars）と値カラム（value_vars）の選定
    # メタデータとして残すカラム
    id_vars = ['id', 'mock_name', 'exam_date']
    
    # 識別用に存在しないカラムを除外（念のため）
    existing_id_vars = [col for col in id_vars if col in df.columns]
    
    # これら以外を「科目カラム」とみなして縦持ち変換する
    # (student_idなど不要なものは事前に落とすか、melt後に整理)
    value_vars = [c for c in df.columns if c not in existing_id_vars and c != 'student_id']

    # 3. pd.melt で縦持ち変換
    melted = pd.melt(
        df, 
        id_vars=existing_id_vars, 
        value_vars=value_vars,
        var_name='subject_raw', 
        value_name='score'
    )

    # 4. 点数がない(None/NaN)行は削除
    melted = melted.dropna(subset=['score'])

    # 5. 科目名のクリーニング関数
    def clean_subject_name(name):
        # "subject_" や "_score" などの接頭辞・接尾辞があれば削除
        name = name.replace('subject_', '').replace('_score', '').replace('_mark', '')
        # 必要であればここで英語→日本語変換dictを噛ませることも可能
        return name

    melted['subject'] = melted['subject_raw'].apply(clean_subject_name)

    # 不要な生カラムを削除
    melted = melted.drop(columns=['subject_raw'])

    # 6. JSON変換 (orient='records'でリスト形式に)
    return melted.to_dict(orient='records')
    