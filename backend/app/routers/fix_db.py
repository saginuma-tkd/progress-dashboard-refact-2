from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.models import models
import random
import boto3
from app.core.config import settings

router = APIRouter()

@router.get("/fix-constraint")
def fix_constraint(db: Session = Depends(get_db)):
    try:
        # Check if constraint exists (postgres specific)
        check_sql = text("SELECT conname FROM pg_constraint WHERE conname = '_student_prog_uc'")
        result = db.execute(check_sql).fetchone()
        
        if result:
            return {"message": "Constraint '_student_prog_uc' already exists."}
        
        # Add constraint
        # First, remove duplicates to ensure constraint can be added
        # Keep the one with highest ID
        cleanup_sql = text("""
            DELETE FROM progress a USING (
                SELECT min(id) as id, student_id, subject, level, book_name 
                FROM progress 
                GROUP BY student_id, subject, level, book_name 
                HAVING COUNT(*) > 1
            ) b 
            WHERE a.student_id = b.student_id 
            AND a.subject = b.subject 
            AND a.level = b.level 
            AND a.book_name = b.book_name 
            AND a.id <> b.id
        """)
        db.execute(cleanup_sql)

        alter_sql = text("ALTER TABLE progress ADD CONSTRAINT _student_prog_uc UNIQUE (student_id, subject, level, book_name)")
        db.execute(alter_sql)
        db.commit()
        return {"message": "Successfully added constraint '_student_prog_uc' after cleaning duplicates."}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

@router.post("/migrate-student-usernames")
def migrate_student_usernames(db: Session = Depends(get_db)):
    """
    既存の生徒のユーザー名を student_{id} から student_{6桁ランダム} に移行する1回限りのバッチ処理
    """
    # roleがstudentのユーザーを全取得
    students = db.query(models.User).filter(models.User.role == "student").all()
    updated_count = 0
    
    for user in students:
        # すでに "student_6桁" になっている（長さが 15文字: s-t-u-d-e-n-t-_-1-2-3-4-5-6）ものはスキップ
        if len(user.username) == 15 and user.username.startswith("student_"):
            continue

        # 新しいランダムIDを生成
        while True:
            random_digits = str(random.randint(100000, 999999))
            new_username = f"student_{random_digits}"
            
            # 重複チェック
            exists = db.query(models.User).filter(models.User.username == new_username).first()
            if not exists:
                user.username = new_username
                updated_count += 1
                break
                
    db.commit()
    return {
        "message": "生徒IDのランダム化マイグレーションが完了しました！",
        "updated_count": updated_count
    }

@router.get("/test-s3-access")
def test_s3_access():
    """
    バックエンドの権限で、直接S3からファイルを読めるかテストするエンドポイント
    """
    try:
        # 1. クライアント作成
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # 🌟 2. ここに、エラーになった教材の「S3キー（パス）」を入れてください！
        # 例: "tenants/1/materials/....pdf"
        test_key = "ここにエラーになったS3キーを直接コピペ！"
        
        # 3. バックエンドから直接「ファイル情報」を取得してみる（ダウンロード権限のテスト）
        s3.head_object(Bucket=settings.S3_BUCKET_NAME, Key=test_key)
        
        return {"status": "SUCCESS", "message": "バックエンドは完璧にファイルにアクセスできます！URLの作り方の問題です！"}
        
    except Exception as e:
        return {"status": "FAILED", "error": str(e), "message": "バックエンド自体がAWSに弾かれています！IAMやバケット設定の問題です！"}
    
@router.get("/test-s3-list")
def test_s3_list():
    """
    S3バケットの玄関のドアが開き、中身が見えるかをテストする
    """
    import boto3
    from app.core.config import settings
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # 🌟 指定したバケットの中身を最大5件だけ取得してみる
        response = s3.list_objects_v2(Bucket=settings.S3_BUCKET_NAME, MaxKeys=5)
        
        if 'Contents' in response:
            files = [item['Key'] for item in response['Contents']]
            return {
                "status": "SUCCESS", 
                "message": "大成功！バケットの中身が見えました！", 
                "bucket_name": settings.S3_BUCKET_NAME,
                "found_files": files
            }
        else:
            return {
                "status": "SUCCESS", 
                "message": "バケットにはアクセスできましたが、中は空っぽです！",
                "bucket_name": settings.S3_BUCKET_NAME
            }
            
    except Exception as e:
        return {
            "status": "FAILED", 
            "error": str(e), 
            "bucket_name": getattr(settings, 'S3_BUCKET_NAME', '未設定'),
            "message": "玄関で弾かれました！バケット名が間違っているか、キーの主が違います！"
        }