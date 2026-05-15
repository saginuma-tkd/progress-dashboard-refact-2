import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.crud import crud_materials
from app.schemas import schemas
from app.services import s3_client
from app.models.models import User
from app.routers import deps
from app.routers.deps import get_tenant_id_for_user

router = APIRouter()

# --- タグ関連エンドポイント ---
@router.get("/tags/subjects", response_model=List[schemas.SubjectTagResponse])
def read_subject_tags(db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_materials.get_all_subject_tags(db)

@router.get("/tags/details", response_model=List[schemas.DetailTagResponse])
def read_detail_tags(db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_materials.get_all_detail_tags(db)

@router.post("/tags/subjects", response_model=schemas.SubjectTagResponse)
def create_subject_tag(tag: schemas.TagCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_materials.get_or_create_subject_tag(db, tag.name)

@router.post("/tags/details", response_model=schemas.DetailTagResponse)
def create_detail_tag(tag: schemas.TagCreate, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    return crud_materials.get_or_create_detail_tag(db, tag.name)

@router.delete("/tags/subjects/{tag_id}")
def delete_subject_tag(tag_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    crud_materials.delete_subject_tag(db, tag_id)
    return {"detail": "Tag deleted"}

@router.delete("/tags/details/{tag_id}")
def delete_detail_tag(tag_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    crud_materials.delete_detail_tag(db, tag_id)
    return {"detail": "Tag deleted"}

# --- 教材関連エンドポイント ---
@router.post("/", response_model=schemas.TeachingMaterialResponse)
def upload_material(
    title: str = Form(...),
    internal_memo: Optional[str] = Form(""),
    subject_ids: List[int] = Form([]),
    detail_tag_ids: List[int] = Form([]),
    category: str = Form("material"),  # 'material' or 'route_table'
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFファイルのみアップロード可能です")

    file_uuid = str(uuid.uuid4())
    tenant_id = get_tenant_id_for_user(db, current_user)
    tenant_prefix = str(tenant_id) if tenant_id else "shared"
    s3_key = f"tenants/{tenant_prefix}/materials/{file_uuid}_{file.filename}"
    
    # Upload to S3
    s3_client.upload_file(file.file, s3_key, file.content_type)
    file_size = file.size if hasattr(file, 'size') and file.size else 0

    return crud_materials.create_material(
        db=db,
        title=title,
        s3_key=s3_key,
        file_size=file_size,
        original_filename=file.filename,
        current_user=current_user,
        internal_memo=internal_memo,
        subject_ids=subject_ids,
        detail_tag_ids=detail_tag_ids,
        category=category
    )

@router.put("/{material_id}", response_model=schemas.TeachingMaterialResponse)
def update_material(
    material_id: int,
    title: str = Form(...),
    internal_memo: Optional[str] = Form(""),
    subject_ids: List[int] = Form([]),
    detail_tag_ids: List[int] = Form([]),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    existing_material = crud_materials.get_material(db, material_id, current_user)
    if not existing_material:
        raise HTTPException(status_code=404, detail="Material not found")

    s3_key = None
    file_size = None
    original_filename = None

    if file and file.filename:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="PDFファイルのみアップロード可能です")
        
        # Delete old file from S3
        if existing_material.s3_key:
            try:
                s3_client.delete_file(existing_material.s3_key)
            except Exception as e:
                print(f"Failed to delete old file: {e}")
            
        file_uuid = str(uuid.uuid4())
        tenant_id = get_tenant_id_for_user(db, current_user)
        tenant_prefix = str(tenant_id) if tenant_id else "shared"
        s3_key = f"tenants/{tenant_prefix}/materials/{file_uuid}_{file.filename}"
        s3_client.upload_file(file.file, s3_key, file.content_type)
        file_size = file.size if hasattr(file, 'size') and file.size else 0
        original_filename = file.filename

    updated_material = crud_materials.update_material(
        db=db, 
        material_id=material_id, 
        title=title, 
        current_user=current_user,
        s3_key=s3_key, 
        file_size=file_size, 
        original_filename=original_filename,
        internal_memo=internal_memo, 
        subject_ids=subject_ids, 
        detail_tag_ids=detail_tag_ids
    )
    return updated_material


@router.get("/", response_model=List[schemas.TeachingMaterialResponse])
def read_materials(
    subject_id: Optional[int] = None,
    detail_tag_id: Optional[int] = None,
    search_query: Optional[str] = None,
    category: Optional[str] = None,   # 'material' | 'route_table' | None(全件)
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return crud_materials.get_materials(db, current_user, subject_id, detail_tag_id, search_query, category)

@router.get("/{material_id}/pdf")
def download_material_pdf(material_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    material = crud_materials.get_material(db, material_id, current_user)
    if not material or not material.s3_key:
        raise HTTPException(status_code=404, detail="File not found")
    
    presigned_url = s3_client.generate_presigned_url(material.s3_key)
    # ★ RedirectResponse を廃止し、URL を JSON で返す
    # → フロントが window.open() で直接開くことで S3 への CORS リクエストを回避
    return {"url": presigned_url}

@router.delete("/{material_id}")
def delete_material(material_id: int, db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    material = crud_materials.get_material(db, material_id, current_user)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
        
    if material.s3_key:
        try:
            s3_client.delete_file(material.s3_key)
        except Exception as e:
            print(f"Failed to delete file from S3: {e}")
            
    crud_materials.delete_material(db, material_id, current_user)
    return {"detail": "Material deleted"}