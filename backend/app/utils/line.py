# backend/app/utils/line.py
import os
import logging
from linebot import LineBotApi
from linebot.models import TextSendMessage

# 🌟 Pydanticの設定管理クラス（settings）をインポートする
from app.core.config import settings

logger = logging.getLogger(__name__)

# 🌟 os.getenv ではなく、settings から安全に値を確実に引っ張ってくる！
LINE_CHANNEL_ACCESS = settings.LINE_CHANNEL_ACCESS
LINE_GROUP_ID = settings.LINE_GROUP_ID

# LINE API のクライアントを初期化
line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS)

def send_line_message(text: str) -> bool:
    """
    指定されたグループLINEにテキストメッセージを送信する共通関数
    """
    # 🌟 ここも変数名を統一してチェック
    if not LINE_CHANNEL_ACCESS or not LINE_GROUP_ID:
        logger.warning("LINE_CHANNEL_ACCESS または LINE_GROUP_ID が設定されていないため、送信をスキップしました。")
        return False
        
    try:
        line_bot_api.push_message(LINE_GROUP_ID, TextSendMessage(text=text))
        logger.info("LINE通知の送信に成功しました。")
        return True
    except Exception as e:
        logger.error(f"LINE通知の送信中にエラーが発生しました: {e}")
        return False