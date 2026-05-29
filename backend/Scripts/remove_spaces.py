# backend/remove_spaces.py

from app.db.database import SessionLocal
from app.models.models import User, Student

def remove_spaces_from_names():
    db = SessionLocal()
    try:
        # 1. 講師（User）の username から半角スペースを削除
        users = db.query(User).all()
        user_update_count = 0
        for user in users:
            if " " in user.username:
                # 半角スペースを削除（空文字に置換）
                new_username = user.username.replace(" ", "")
                print(f"講師名変更: '{user.username}' -> '{new_username}'")
                user.username = new_username
                user_update_count += 1

        # 2. 生徒（Student）の name から半角スペースを削除
        students = db.query(Student).all()
        student_update_count = 0
        for student in students:
            if " " in student.name:
                # 半角スペースを削除（空文字に置換）
                new_name = student.name.replace(" ", "")
                print(f"生徒名変更: '{student.name}' -> '{new_name}'")
                student.name = new_name
                student_update_count += 1

        # 変更をデータベースに保存
        db.commit()
        print("-" * 30)
        print(f"✅ 完了: 講師 {user_update_count}名、生徒 {student_update_count}名の名前からスペースを削除しました。")

    except Exception as e:
        # エラーが起きた場合は変更をロールバック（取り消し）
        db.rollback()
        print(f"❌ エラーが発生しました: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    confirm = input("講師と生徒の名前から半角スペースを一括削除します。よろしいですか？ (y/n): ")
    if confirm.lower() == 'y':
        remove_spaces_from_names()
    else:
        print("キャンセルしました。")