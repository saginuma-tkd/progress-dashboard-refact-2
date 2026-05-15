# backend/app/services/attendance_sync.py （新規作成）
import httpx
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import models

# 🚨 先ほどまで使っていたGASのURL
GAS_URL = "https://script.google.com/macros/s/AKfycbxKlWTOAaTJtmOflZsEVjLssdyQ2haOWwD686Omq-13M5SRSszkvyRtGiTuLhG2Fzd-/exec"

def sync_google_sheets_to_db():
    """5分おきに動き、GASの最新データをDBに丸写しする関数"""
    db: Session = SessionLocal()
    try:
        # 1. GASから最新データを取得
        with httpx.Client() as client:
            response = client.get(GAS_URL, timeout=15.0, follow_redirects=True)
            response.raise_for_status()
            data = response.json()
            
        transfers_data = data.get("transfers", [])
        absences_data = data.get("absences", [])
        
        # 2. DBの古いデータを一旦すべて消去（洗い替え）
        # ※5分おきの完全同期なので、複雑な差分更新よりも「全消去＆全追加」が最もバグが出ず安全です
        db.query(models.TransferRequest).delete()
        db.query(models.AbsenceReport).delete()
        
        # 3. 振替データをDBに流し込む
        for row in transfers_data:
            is_completed = row.get("isCompleted") in [True, "TRUE", "true", "True"]
            new_transfer = models.TransferRequest(
                row_number=row.get("rowNumber"),
                timestamp=row.get("timestamp"),
                name=row.get("name"),
                instructor=row.get("instructor"),
                original_date=row.get("originalDate"),
                candidate_dates=row.get("candidateDates"),
                reason=row.get("reason"),
                is_completed=is_completed
            )
            db.add(new_transfer)
            
        # 4. 欠席データをDBに流し込む
        for row in absences_data:
            new_absence = models.AbsenceReport(
                row_number=row.get("rowNumber"),
                timestamp=row.get("timestamp"),
                name=row.get("name"),
                instructor=row.get("instructor"),
                day_of_week=row.get("dayOfWeek"),
                reason=row.get("reason"),
                report_info=row.get("reportInfo")
            )
            db.add(new_absence)
            
        # 5. 最後にまとめて保存！
        db.commit()
        print("✅ [Sync Success] スプレッドシートからDBへの同期が完了しました！")
        
    except Exception as e:
        db.rollback() # エラーが起きたら途中の操作を取り消す
        print(f"❌ [Sync Error] 同期に失敗しました: {e}")
    finally:
        db.close() # データベースの接続を必ず閉じる