"""
Scheduler Module
バックグラウンドで定期実行するバッチ処理（クーロン）を管理します。
学年の自動更新や、Googleスプレッドシートとの同期処理を担当します。
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.db.database import SessionLocal
from app.models.models import Student
from app.services.attendance_sync import sync_google_sheets_to_db

# ---------------------------------------------------------
# 📝 ロガー設定
# ---------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# 🔄 学年スライド定義（毎年3/1の更新時に使用）
# ---------------------------------------------------------
# ※「既卒」「退塾済」などはそのままにするためマッピングに含めません
GRADE_MAPPING = {
    "中1": "中2",
    "中2": "中3",
    "中3": "高1",
    "高1": "高2",
    "高2": "高3",
    "高3": "既卒"
}


def auto_update_grades():
    """
    毎年指定のタイミングで、生徒の学年を自動的に1つ繰り上げるバッチ処理。
    """
    db = SessionLocal()
    try:
        students = db.query(Student).all()
        updated_count = 0
        
        for student in students:
            if student.grade in GRADE_MAPPING:
                student.grade = GRADE_MAPPING[student.grade]
                updated_count += 1
                
        db.commit()
        logger.info(f"✅ 定期実行完了: {updated_count}名の生徒の学年を自動更新しました。")
        
    except Exception as e:
        logger.error(f"❌ 学年自動更新エラー: {e}")
        db.rollback()
        
    finally:
        db.close()


def start_scheduler():
    """
    アプリケーション起動時にスケジューラーを初期化し、各ジョブを登録・起動します。
    """
    scheduler = BackgroundScheduler()
    
    # 1. 学年自動更新ジョブ（毎年 3月 1日 00:00 に実行）
    scheduler.add_job(
        auto_update_grades,
        CronTrigger(month=3, day=1, hour=0, minute=0),
        id="auto_update_grades_job",
        replace_existing=True
    )
    
    # 2. Googleスプレッドシート出席データ同期ジョブ（5分おきに実行）
    scheduler.add_job(
        sync_google_sheets_to_db, 
        'interval', 
        minutes=5,
        id="sync_google_sheets_job",
        replace_existing=True
    )
    
    # スケジューラー起動
    scheduler.start()

    # 起動時に初回のスプシ同期を即座に実行する
    try:
        logger.info("🔄 初回のスプレッドシート同期を実行します...")
        sync_google_sheets_to_db()
    except Exception as e:
        logger.error(f"❌ 初回の同期に失敗しました: {e}")
    
    logger.info("📅 学年自動更新スケジューラーを起動しました (次回実行: 毎年3月1日 00:00)")
    logger.info("⏰ 5分おきのスプレッドシート同期スケジューラーをセット完了しました")