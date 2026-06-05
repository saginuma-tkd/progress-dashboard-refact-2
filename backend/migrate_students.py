from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import User, Student
from app.core.security import get_password_hash # ハッシュ化関数

def migrate_students_to_users():
    db: Session = SessionLocal()
    
    # 全員共通の初期パスワード
    common_password = "password123" 
    hashed_password = get_password_hash(common_password)

    try:
        # 🌟 まだ User アカウントと紐づいていない生徒だけを取得
        old_students = db.query(Student).filter(Student.user_id == None).all()
        
        if not old_students:
            print("移行が必要な生徒（User未紐付け）は見つかりませんでした。")
            return

        migrated_count = 0
        skipped_count = 0

        for student in old_students:
            # 1. ログイン用のユーザー名（username）を自動生成
            # 例: idが 12 の生徒なら "student_0012" になる
            new_username = f"student_{student.id:04d}"

            # 既に同じ username が存在しないか念のためチェック
            existing_user = db.query(User).filter(User.username == new_username).first()
            if existing_user:
                print(f"スキップ: {new_username} は既にUserテーブルに存在します。")
                skipped_count += 1
                continue

            # 2. User テーブル用の新しいデータを作成
            new_user = User(
                username=new_username,      # 生成したログインID
                password=hashed_password,   # 共通パスワードをハッシュ化して保存
                role="student",             # 権限を「生徒」に設定
                school=student.school,      # 校舎名を引き継ぎ
                school_id=student.school_id # 校舎IDを引き継ぎ
            )
            
            db.add(new_user)
            db.flush() # 🌟 ここで一旦DBに流し込み、new_user.id を確定させる（commitはまだ）

            # 3. Student 側に、作成した User の ID を紐付ける！
            student.user_id = new_user.id
            
            migrated_count += 1
            
        # 4. 全てまとめてDBに保存
        db.commit()
        
        print(f"🎉 移行完了！ {migrated_count} 人の生徒アカウントを作成し、紐付けました。")
        print(f"【重要】生徒のログインIDは 'student_0001' のような形式（student_ + 生徒ID4桁）です。")
        print(f"初期パスワードは全員 '{common_password}' です。")

    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_students_to_users()