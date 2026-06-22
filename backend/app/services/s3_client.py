import boto3
import urllib.parse  # 🌟 1. これを追加！
from botocore.exceptions import ClientError
from botocore.client import Config
from app.core.config import settings

def get_s3_client():
    # ここの設定は完璧です！
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        config=Config(signature_version='s3v4',s3={'addressing_style': 'path'})
    )

def upload_file(file_obj, s3_key: str, content_type: str = "application/pdf"):
    """
    S3へファイルをアップロードする関数
    """
    s3_client = get_s3_client()
    try:
        s3_client.upload_fileobj(
            file_obj,
            settings.S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={'ContentType': content_type}
        )
        return True
    except ClientError as e:
        print(f"Error uploading file to S3: {e}")
        raise e

def generate_presigned_url(s3_key: str, expiration=3600):
    """
    一時的なダウンロード用署名付きURLを発行する関数
    """
    s3_client = get_s3_client()
    try:
        # 🌟 2. 魔法の1行：もし s3_key がエンコードされていても、ここで強制的に生の日本語に戻す！
        raw_key = urllib.parse.unquote(s3_key)

        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.S3_BUCKET_NAME, 'Key': raw_key},  # 🌟 3. raw_key を渡す
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        raise e

def delete_file(s3_key: str):
    """
    S3からファイルを削除する関数
    """
    s3_client = get_s3_client()
    try:
        # 🌟 念のため削除時にも適用しておくと安全です
        raw_key = urllib.parse.unquote(s3_key)
        
        s3_client.delete_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=raw_key
        )
        return True
    except ClientError as e:
        print(f"Error deleting file from S3: {e}")
        raise e