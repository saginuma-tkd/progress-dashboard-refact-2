# 08. 新機能追加の手順（Step-by-Step）

バックエンドに新しい機能を追加する際は、**必ず以下の順番**で実装します。

---

## Step 1: データベースモデルの定義（`app/models/models.py`）

まずデータを保存するテーブルを定義します。

```python
class ParentMeeting(Base):
    __tablename__ = "parent_meetings"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    meeting_date = Column(Date, nullable=False)
    # ⚠️ Studentテーブル側にも relationship を追記すること
```

---

## Step 2: Pydanticスキーマの定義（`app/schemas/schemas.py`）

入出力の型とバリデーションを定義します。

```python
from pydantic import BaseModel
from datetime import date

class ParentMeetingCreate(BaseModel):
    student_id: int
    meeting_date: date

class ParentMeetingResponse(ParentMeetingCreate):
    id: int
    class Config:
        orm_mode = True
```

---

## Step 3: APIエンドポイントの作成（`app/routers/xxx.py`）

エンドポイントを実装します。**必ず権限チェック（Dependency）を挟みます。**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.routers import deps
from app.models import models
from app.schemas import schemas

router = APIRouter()

@router.post("/meetings", response_model=schemas.ParentMeetingResponse)
def create_meeting(
    data: schemas.ParentMeetingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),  # 🚨 必須
):
    # DB保存処理...
```

---

## Step 4: `main.py` への登録

ルーターファイルを作成した場合は、最後に `app/main.py` に登録します。

```python
# app/main.py
from app.routers import meetings  # 追加

app.include_router(
    meetings.router,
    prefix="/api/v1/meetings",
    tags=["Meetings"]
)
```