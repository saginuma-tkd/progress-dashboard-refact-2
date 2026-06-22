import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
from app.core.config import settings

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        config=Config(signature_version='s3v4')
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
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.S3_BUCKET_NAME, 'Key': s3_key},
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
        s3_client.delete_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key
        )
        return True
    except ClientError as e:
        print(f"Error deleting file from S3: {e}")
        raise e
