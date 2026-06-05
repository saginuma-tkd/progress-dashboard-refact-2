from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional, cast
import uuid
from datetime import datetime

from app.db.database import get_db
from app.models.models import TeachingMaterial, SubjectTag, DetailTag, User
from app.routers import deps
from app.routers.deps import get_tenant_id_for_user
from app.services import s3_client  # 🌟 これが S3 操作の鍵！

router = APIRouter()

# ==================================
# 1. 一覧取得API
# ==================================
@router.get("/list")
def get_route_list(
    session: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    routes = session.query(TeachingMaterial).filter(
        TeachingMaterial.tenant_id == current_user.tenant_id,
        TeachingMaterial.category == "route_table"
    ).order_by(TeachingMaterial.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "filename": r.original_filename,
            "academic_year": r.academic_year,
            "title": r.title,
            "internal_memo": r.internal_memo,
            "school_id": r.school_id,
            "uploaded_at": r.created_at,
            "subjects": r.subjects,
            "detail_tags": r.detail_tags
        }
        for r in routes
    ]

# ==================================
# 2. ダウンロードAPI (S3の署名付きURLへリダイレクト)
# ==================================
@router.get("/download/{file_id}")
def download_route_file(file_id: int, session: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    file_record = session.query(TeachingMaterial).filter(
        TeachingMaterial.id == file_id,
        TeachingMaterial.category == "route_table"
    ).first()
    
    if not file_record or not file_record.s3_key:
        raise HTTPException(status_code=404, detail="File not found")
    
    # 🌟 S3のダウンロード用ワンタイムURLを発行し、そこへ直接リダイレクトさせる
    presigned_url = s3_client.generate_presigned_url(cast(str, file_record.s3_key))
    return RedirectResponse(url=presigned_url)

# ==================================
# 3. アップロードAPI (S3へアップロード)
# ==================================
@router.post("/upload")
def upload_route_table(
    academic_year: int = Form(...),
    subject_ids: List[int] = Form(default=[]),
    detail_tag_ids: List[int] = Form(default=[]),
    file: UploadFile = File(...),
    session: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if not file.filename or not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFファイルのみアップロード可能です")

    try:
        # 🌟 S3用のキー（保存パス）を生成
        file_uuid = str(uuid.uuid4())
        tenant_id = get_tenant_id_for_user(session, current_user)
        tenant_prefix = str(tenant_id) if tenant_id else "shared"
        # パスはスラッシュで統一
        s3_key = f"tenants/{tenant_prefix}/routes/{file_uuid}_{file.filename}"
        
        # 🌟 S3へアップロード実行！
        s3_client.upload_file(file.file, s3_key, file.content_type or "application/pdf")
        file_size = file.size if hasattr(file, 'size') and file.size else 0

        # DBへ保存
        new_route = TeachingMaterial(
            title=file.filename,
            s3_key=s3_key,
            original_filename=file.filename,
            file_size=file_size,
            academic_year=academic_year,
            category="route_table",
            tenant_id=tenant_id
        )
        
        # 1. フロントから送られてきたタグの紐付け
        if subject_ids:
            subjects = session.query(SubjectTag).filter(SubjectTag.id.in_(subject_ids)).all()
            new_route.subjects.extend(subjects)
        if detail_tag_ids:
            details = session.query(DetailTag).filter(DetailTag.id.in_(detail_tag_ids)).all()
            new_route.detail_tags.extend(details)

        # 🌟 2. 「ルート表」タグの自動付与
        route_tag = session.query(DetailTag).filter(DetailTag.name == "ルート表").first()
        if not route_tag:
            route_tag = DetailTag(name="ルート表")
            session.add(route_tag)
        if route_tag not in new_route.detail_tags:
            new_route.detail_tags.append(route_tag)

        # 🌟 3. 「〇〇年度」タグの自動付与
        year_tag_name = f"{academic_year}年度"
        year_tag = session.query(DetailTag).filter(DetailTag.name == year_tag_name).first()
        if not year_tag:
            year_tag = DetailTag(name=year_tag_name)
            session.add(year_tag)
        if year_tag not in new_route.detail_tags:
            new_route.detail_tags.append(year_tag)

        session.add(new_route)
        session.commit()
        
        return {"message": "Uploaded successfully"}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

# ==================================
# 4. 更新API (PATCH)
# ==================================
@router.patch("/{route_id}")
def update_route(
    route_id: int, 
    academic_year: Optional[int] = Form(None),
    subject_ids: List[int] = Form(default=[]),
    detail_tag_ids: List[int] = Form(default=[]),
    file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    item = session.query(TeachingMaterial).filter(
        TeachingMaterial.id == route_id,
        TeachingMaterial.category == "route_table"
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if academic_year is not None:
        item.academic_year = academic_year
        
    # 新しいファイルがアップロードされた場合
    if file:
        if not file.filename or not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="PDFファイルのみアップロード可能です")
            
        # 🌟 S3から古いファイルを削除
        if item.s3_key:
            try:
                s3_client.delete_file(cast(str, item.s3_key))
            except Exception as e:
                print(f"Failed to delete old file: {e}")
                
        # 🌟 S3へ新しいファイルをアップロード
        file_uuid = str(uuid.uuid4())
        tenant_id = get_tenant_id_for_user(session, current_user)
        tenant_prefix = str(tenant_id) if tenant_id else "shared"
        s3_key = f"tenants/{tenant_prefix}/routes/{file_uuid}_{file.filename}"
        
        s3_client.upload_file(file.file, s3_key, file.content_type or "application/pdf")
        
        item.s3_key = s3_key
        item.original_filename = file.filename
        item.title = file.filename
        item.file_size = file.size if hasattr(file, 'size') and file.size else 0
        
    # タグの更新
    item.subjects.clear()
    item.detail_tags.clear()
    
    if subject_ids:
        subjects = session.query(SubjectTag).filter(SubjectTag.id.in_(subject_ids)).all()
        item.subjects.extend(subjects)
    if detail_tag_ids:
        details = session.query(DetailTag).filter(DetailTag.id.in_(detail_tag_ids)).all()
        item.detail_tags.extend(details)
        
    session.commit()
    return {"message": "Updated successfully"}

# ==================================
# 5. 削除API
# ==================================
@router.delete("/{file_id}")
def delete_route_table(
    file_id: int, 
    session: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    item = session.query(TeachingMaterial).filter(
        TeachingMaterial.id == file_id,
        TeachingMaterial.category == "route_table"
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    
    # 🌟 S3 からファイルを削除
    if item.s3_key:
        try:
            s3_client.delete_file(cast(str, item.s3_key))
        except Exception as e:
            print(f"Failed to delete file from S3: {e}")
            
    session.delete(item)
    session.commit()
    return {"message": "Deleted successfully"}