import sys
import os
from sqlalchemy.orm import Session
from sqlalchemy import text

# プロジェクトのルートディレクトリをパスに追加してappモジュールを読み込めるようにする
sys.path.append(os.getcwd())

from app.db.database import SessionLocal
from app.models.models import Tenant, School, User, Student, MasterTextbook, BulkPreset, TeachingMaterial

def run_migration():
    db: Session = SessionLocal()
    
    # === 🚨 緊急手術：足りないカラムを直接DBに生やす ===
    print("--- DBカラムの自動補修を開始します ---")
    
    # 1. tenant_id の追加
    tables_needing_tenant = [
        "users", "master_textbooks", "bulk_presets", 
        "teaching_materials", "transfer_requests", "absence_reports"
    ]
    for table in tables_needing_tenant:
        try:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)"))
            db.commit()
        except Exception:
            db.rollback() # 追加済みの場合はエラーになるのでスルー
            
    # 2. students テーブルに user_id を追加（今回追加！）
    try:
        db.execute(text("ALTER TABLE students ADD COLUMN user_id INTEGER REFERENCES users(id)"))
        db.commit()
        print("🔧 students テーブルに user_id を追加しました！")
    except Exception:
        db.rollback()
            
    # =======================================================
    
    try:
        print("--- 既存データの紐付けを開始します ---")
        
        # 1. デフォルトのテナント（組織）を取得
        tenant_name = "武田塾"
        tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
        
        # 2. デフォルトの校舎を取得
        school_name = "鷺沼校"
        school = db.query(School).filter(School.name == school_name).first()

        t_id = tenant.id
        s_id = school.id

        # 3. 既存の全データにテナントIDと校舎IDを紐付け
        print("各データを更新中...")
        
        # User の更新
        users = db.query(User).filter((User.tenant_id == None) | (User.school_id == None)).all()
        if users:
            for u in users:
                u.tenant_id = t_id
                u.school_id = s_id
            print(f"  - User: {len(users)}件更新")
        
        # Student の更新（Studentはschool_idのみ）
        students = db.query(Student).filter(Student.school_id == None).all()
        if students:
            for st in students:
                st.school_id = s_id
            print(f"  - Student: {len(students)}件更新")

        # MasterTextbook の更新（全校舎共通）
        textbooks = db.query(MasterTextbook).filter(MasterTextbook.tenant_id == None).all()
        if textbooks:
            for tb in textbooks:
                tb.tenant_id = t_id
            print(f"  - MasterTextbook: {len(textbooks)}件更新")

        # BulkPreset の更新（全校舎共通）
        presets = db.query(BulkPreset).filter(BulkPreset.tenant_id == None).all()
        if presets:
            for p in presets:
                p.tenant_id = t_id
            print(f"  - BulkPreset: {len(presets)}件更新")

        # TeachingMaterial の更新（全校舎共通）
        materials = db.query(TeachingMaterial).filter(TeachingMaterial.tenant_id == None).all()
        if materials:
            for m in materials:
                m.tenant_id = t_id
            print(f"  - TeachingMaterial: {len(materials)}件更新")

        db.commit()
        print("🎉 すべての既存データの移行が完了しました！")

    except Exception as e:
        db.rollback()
        print(f"❌ エラーが発生しました: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()