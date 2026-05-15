# backend/app/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os

# ルーターの定義
router = APIRouter()

# ==========================================
# 🤖 Gemini AIの設定
# ==========================================
# ★ 取得したAPIキーをここに貼り付けます
# （※本番環境では os.environ.get("GEMINI_API_KEY") などを推奨します）
GEMINI_API_KEY = "AIzaSyCPWOyOq4gyUjfHVdZQKzIkQY1OsGtx7rw"

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

class ChatMessage(BaseModel):
    message: str

# ==========================================
# APIエンドポイント
# ==========================================
@router.post("/support")
def support_chat(data: ChatMessage):
    """AIサポートチャット用のエンドポイント"""
    
    # AIへの指示書（カンペ）
    system_prompt = """
    あなたは学習塾の業務管理システムの「社内向けAIサポートデスク」です。
    ユーザーは当塾で働く講師や教室長です。以下のルールに厳密に従って回答してください。

    【基本ルール】
    1. 丁寧かつ簡潔なビジネスマナーで回答すること。
    2. 結論から先に述べ、無駄な長文は避けること。
    3. 以下の【FAQ】に該当する質問には、指定された回答をそのまま案内すること。
    4. 【FAQ】に記載のないシステムの仕様や、生徒の個人情報に関する質問には絶対に推測で答えないこと。
       その場合は「申し訳ありませんが、その質問にはお答えできません。直接管理者にお問い合わせください。」とだけ返答すること。

    【FAQ（よくある質問と回答）】
    Q: パスワードを忘れた / ログインできない
    A: セキュリティ上、システムからのパスワード再発行はできません。管理者に連絡し、アカウント管理画面から新しいパスワードを再設定してもらってください。

    Q: 新しい生徒を登録したい
    A: 「管理者コンソール」を開き、「生徒管理」メニューから新規登録を行ってください。

    Q: 講師の進捗入力サボりを見つけたい
    A: 管理者コンソールを開くと、30日間進捗更新をしていない講師がいる場合、自動でポップアップアラートが表示されます。また、管理者コンソール内の「予定・実績チェック」から学習時間の乖離を確認できます。

    Q: 一定の参考書をまとめて登録したい
    A: 「管理者コンソール」の「参考書プリセット管理」からプリセットを作成し、生徒の進捗画面からそのプリセットを一括登録できます。
    """
    
    try:
        # AIに指示書と質問を結合して渡す
        prompt = f"{system_prompt}\n\nユーザーの質問: {data.message}"
        response = model.generate_content(prompt)
        
        return {"reply": response.text}
        
    except Exception as e:
        print(f"AI Chat Error: {e}")
        return {"reply": "現在AIサポートに接続できません。直接管理者にお問い合わせください。"}