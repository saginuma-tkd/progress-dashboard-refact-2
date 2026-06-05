from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import User, Student, School

def fix_migrated_users():
    db: Session = SessionLocal()
    
    try:
        # roleが "student" として作成されたユーザーを全員取得
        student_users = db.query(User).filter(User.role == "student").all()
        
        if not student_users:
            print("修正対象の生徒ユーザーが見つかりませんでした。")
            return

        updated_count = 0

        for user in student_users:
            # 1. ユーザーに紐づいている Student データを取得
            student = db.query(Student).filter(Student.user_id == user.id).first()
            
            if not student:
                continue
                
            # 2. ログインID（username）の修正
            # student_0012 などのゼロ埋めをやめて、シンプルに "student" + ID にする
            new_username = f"student{student.id}"
            user.username = new_username
            
            # 3. tenant_id の補完
            # 生徒の所属する school_id から School テーブルを引き、そこの tenant_id を持ってくる
            if user.school_id:
                school = db.query(School).filter(School.id == user.school_id).first()
                if school:
                    user.tenant_id = school.tenant_id
                    
            updated_count += 1
            
        # 全てまとめてDBに保存
        db.commit()
        
        print(f"🎉 大成功！ {updated_count} 人の生徒データの修正が完了しました。")
        print(f"✅ ログインIDは 'student1' や 'student12' のようなシンプルな形式になりました。")
        print(f"✅ 校舎情報から tenant_id を逆引きして完璧に補完しました。")

    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_migrated_users()