from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from urllib.parse import quote  # ★追加: URLエンコード用
from app.db.database import get_db
from app.models.models import RootTable

router = APIRouter()

# レスポンス用モデル
class RootTableMeta(BaseModel):
    id: int
    filename: str
    subject: Optional[str]
    level: Optional[str]
    academic_year: Optional[int]
    uploaded_at: Optional[datetime]

    class Config:
        orm_mode = True

# 1. 一覧取得API
@router.get("/list", response_model=List[RootTableMeta])
def get_route_list(session: Session = Depends(get_db)):
    return session.query(
        RootTable.id,
        RootTable.filename,
        RootTable.subject,
        RootTable.level,
        RootTable.academic_year,
        RootTable.uploaded_at
    ).order_by(RootTable.uploaded_at.desc()).all()

# 2. ダウンロードAPI
@router.get("/download/{file_id}")
def download_route_file(file_id: int, session: Session = Depends(get_db)):
    file_record = session.query(RootTable).filter(RootTable.id == file_id).first()
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # ★修正: 日本語ファイル名対応
    # ファイル名をURLエンコードする
    encoded_filename = quote(file_record.filename)
    
    return Response(
        content=file_record.file_content,
        media_type="application/pdf",
        headers={
            # RFC 5987形式で指定することで、日本語ファイル名が文字化けせずにダウンロードされます
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )

# ★追加: 3. アップロードAPI
@router.post("/upload")
async def upload_route_table(
    file: UploadFile = File(...),
    subject: str = Form(...),
    level: str = Form(...),
    academic_year: int = Form(...),
    session: Session = Depends(get_db)
):
    try:
        content = await file.read()
        new_table = RootTable(
            filename=file.filename,
            file_content=content,
            subject=subject,
            level=level,
            academic_year=academic_year
        )
        session.add(new_table)
        session.commit()
        return {"message": "Uploaded successfully", "filename": file.filename}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

# ★追加: 4. 削除API
@router.delete("/{file_id}")
def delete_route_table(file_id: int, session: Session = Depends(get_db)):
    item = session.query(RootTable).filter(RootTable.id == file_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    
    session.delete(item)
    session.commit()
    return {"message": "Deleted successfully"}

# ==================================
# 🚨 追加: ルート表の編集 (PATCH)
# ==================================
@router.patch("/{route_id}")
def update_route(
    route_id: int, 
    # JSONの代わりに Form(...) で個別に受け取る
    subject: Optional[str] = Form(None),
    level: Optional[str] = Form(None),
    academic_year: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None), # 新しいファイルが選択された時用
    session: Session = Depends(get_db)
):
    from app.models.models import RootTable # ※実際のモデル名に合わせてください
    
    item = session.query(RootTable).filter(RootTable.id == route_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # 届いたテキストデータを更新
    if subject is not None:
        item.subject = subject
    if level is not None:
        item.level = level
    if academic_year is not None:
        item.academic_year = academic_year
        
    # もし「新しいファイル」も一緒にアップロードされていたら、ファイルを保存し直す
    if file:
        # ※アップロード先のフォルダ名は、新規アップロード(POST)の時と同じに合わせてください
        upload_dir = "uploads/routes" 
        os.makedirs(upload_dir, exist_ok=True)
        
        # 安全なファイル名を生成して保存
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # データベースのファイル名とパスも上書き
        item.filename = file.filename
        if hasattr(item, 'filepath'):
            item.filepath = file_path
        
    session.commit()
    session.refresh(item)
    return {
        "id": item.id,
        "filename": getattr(item, 'filename', None),
        "subject": getattr(item, 'subject', None),
        "level": getattr(item, 'level', None),
        "academic_year": getattr(item, 'academic_year', None)
    }