import sys
import os
import random
from datetime import datetime, timedelta

# backendフォルダのルートパスを通す
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models import models
from app.core.security import get_password_hash

def main():
    db = SessionLocal()
    try:
        print("🚀 テスト用ダミーデータを生成します...")

        # 1. 講師の取得（生徒に紐付けるため）
        admin_user = db.query(models.User).filter(models.User.role == 'admin').first()
        normal_user = db.query(models.User).filter(models.User.role == 'user').first()

        if not admin_user:
            print("⚠️ admin権限の講師が見つかりません。先にシステムから講師を1名以上作成してください。")
            return

        # 2. ランダム生成用のデータソース
        schools = ["渋谷校", "新宿校", "横浜校"]
        grades = ["中3", "高1", "高2", "高3", "既卒"]
        last_names = ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤"]
        first_names = ["大翔", "蓮", "結衣", "陽菜", "湊", "咲良", "悠真", "莉子", "樹", "あかり"]

        # リアルな参考書のモックデータ
        books = [
            {"subject": "英語", "name": "システム英単語", "level": "日大", "duration": 1.5, "total": 2000},
            {"subject": "英語", "name": "Next Stage", "level": "日大", "duration": 2.0, "total": 30},
            {"subject": "英語", "name": "英文解釈の技術70", "level": "基礎徹底", "duration": 1.0, "total": 70},
            {"subject": "数学", "name": "基礎問題精講IA", "level": "基礎徹底", "duration": 2.5, "total": 145},
            {"subject": "数学", "name": "青チャートIIB", "level": "MARCH", "duration": 3.0, "total": 300},
            {"subject": "国語", "name": "現代文キーワード読解", "level": "日大", "duration": 1.0, "total": 50},
        ]

        hashed_pw = get_password_hash("password123")
        count = 0

        # 3. 20人分のデータを生成
        for _ in range(20):
            name = f"{random.choice(last_names)} {random.choice(first_names)}"
            school = random.choice(schools)
            
            # 生徒の作成
            new_student = models.Student(
                name=name,
                school=school,
                grade=random.choice(grades),
                previous_school=f"{random.choice(['第一', '第二', '中央', '桜丘'])}高校",
                deviation_value=random.randint(40, 70),
                target_level=random.choice(["MARCH", "早慶", "日大", "国公立"])
            )
            db.add(new_student)
            db.flush()

            # ログインアカウントの作成
            new_user = models.User(
                username=f"student_{new_student.id}",
                password=hashed_pw,
                role="student",
                school=school
            )
            db.add(new_user)
            db.flush()

            # アカウントの紐付け
            new_student.user_id = new_user.id
            db.flush()

            # 担当講師の紐付け（メイン講師は必須、サブ講師はランダム）
            db.add(models.StudentInstructor(student_id=new_student.id, user_id=admin_user.id, is_main=1))
            if normal_user and random.choice([True, False]):
                db.add(models.StudentInstructor(student_id=new_student.id, user_id=normal_user.id, is_main=0))

            # 進捗データの作成 (1人あたり2〜4冊をランダムな進捗度合いで追加)
            assigned_books = random.sample(books, random.randint(2, 4))
            for book in assigned_books:
                # 0% 〜 100% の間でランダムに進捗を設定
                completed = random.randint(0, book["total"])
                
                db.add(models.Progress(
                    student_id=new_student.id,
                    subject=book["subject"],
                    level=book["level"],
                    book_name=book["name"],
                    duration=book["duration"],
                    is_planned=True,
                    is_done=(completed == book["total"]),
                    completed_units=completed,
                    total_units=book["total"]
                ))

            # 英検データの作成 (約30%の生徒に付与)
            if random.random() > 0.7:
                db.add(models.EikenResult(
                    student_id=new_student.id,
                    grade=random.choice(["2級", "準2級", "準1級"]),
                    cse_score=random.randint(1700, 2400),
                    exam_date=(datetime.now() - timedelta(days=random.randint(10, 200))).strftime("%Y-%m-%d")
                ))
            
            count += 1
            print(f"✅ 生成: {name} ({school} / ID: student_{new_student.id}) - 進捗 {len(assigned_books)}件")

        db.commit()
        print(f"\n🎉 合計 {count} 件のダミーデータを投入しました！")

    except Exception as e:
        db.rollback()
        print(f"❌ エラーが発生しました: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()