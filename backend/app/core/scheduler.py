# backend/app/core/scheduler.py

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.db.database import SessionLocal
from app.models.models import Student
from app.services.attendance_sync import sync_google_sheets_to_db
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def auto_update_grades():
    """学年を自動的に1つ繰り上げる処理"""
    db = SessionLocal()
    try:
        students = db.query(Student).all()
        
        # 学年のスライド定義
        grade_mapping = {
            "中1": "中2",
            "中2": "中3",
            "中3": "高1",
            "高1": "高2",
            "高2": "高3",
            "高3": "既卒"
            # 「既卒」「退塾済」などはそのままにするためマッピングに含めない
        }
        
        updated_count = 0
        for student in students:
            if student.grade in grade_mapping:
                student.grade = grade_mapping[student.grade]
                updated_count += 1
                
        db.commit()
        logger.info(f"✅ 定期実行完了: {updated_count}名の生徒の学年を自動更新しました。")
    except Exception as e:
        logger.error(f"❌ 学年自動更新エラー: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler():
    """スケジューラーの起動"""
    scheduler = BackgroundScheduler()
    
    # 毎年 3月 1日 00:00 に実行するクーロン設定
    scheduler.add_job(
        auto_update_grades,
        CronTrigger(month=3, day=1, hour=0, minute=0),
        id="auto_update_grades_job",
        replace_existing=True
    )
    scheduler.add_job(sync_google_sheets_to_db, 'interval', minutes=5)
    
    scheduler.start()

    try:
        logger.info("🔄 初回のスプレッドシート同期を実行します...")
        sync_google_sheets_to_db()
    except Exception as e:
        logger.error(f"初回の同期に失敗しました: {e}")
    
    logger.info("📅 学年自動更新スケジューラーを起動しました (次回実行: 毎年3月1日 00:00)")
    logger.info("⏰ スケジューラーが起動しました（5分おきのスプシ同期をセット完了）")
