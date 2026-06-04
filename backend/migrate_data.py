import sys
import os
from sqlalchemy.orm import Session

# プロジェクトのルートディレクトリをパスに追加してappモジュールを読み込めるようにする
sys.path.append(os.getcwd())

from app.db.database import SessionLocal
from app.models.models import Tenant, School, User, Student, MasterTextbook, BulkPreset, TeachingMaterial

def run_migration():
    db: Session = SessionLocal()
    try:
        print("--- 既存データの紐付けを開始します ---")
        
        # 1. デフォルトのテナント（組織）を作成
        tenant_name = "武田塾"
        tenant = db.query(Tenant).filter(Tenant.name == tenant_name).first()
        if not tenant:
            tenant = Tenant(name=tenant_name)
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print(f"✅ Tenant '{tenant_name}' を作成/取得しました (ID: {tenant.id})")
        
        # 2. デフォルトの校舎を作成
        school_name = "鷺沼校"
        school = db.query(School).filter(School.name == school_name).first()
        if not school:
            school = School(tenant_id=tenant.id, name=school_name)
            db.add(school)
            db.commit()
            db.refresh(school)
            print(f"✅ School '{school_name}' を作成/取得しました (ID: {school.id})")

        t_id = tenant.id
        s_id = school.id

        # 3. 既存の全データにテナントIDと校舎IDを紐付け
        print("各データを更新中...")
        
        # User の更新
        users = db.query(User).filter((User.tenant_id == None) | (User.school_id == None)).all()
        for u in users:
            u.tenant_id = t_id
            u.school_id = s_id
        print(f"  - User: {len(users)}件更新")
        
        # Student の更新（Studentはschool_idのみ）
        students = db.query(Student).filter(Student.school_id == None).all()
        for st in students:
            st.school_id = s_id
        print(f"  - Student: {len(students)}件更新")

        # MasterTextbook の更新（全校舎共通なので tenant_id のみ紐付け）
        textbooks = db.query(MasterTextbook).filter(MasterTextbook.tenant_id == None).all()
        for tb in textbooks:
            tb.tenant_id = t_id
        print(f"  - MasterTextbook: {len(textbooks)}件更新")

        # BulkPreset の更新（全校舎共通なので tenant_id のみ紐付け）
        presets = db.query(BulkPreset).filter(BulkPreset.tenant_id == None).all()
        for p in presets:
            p.tenant_id = t_id
        print(f"  - BulkPreset: {len(presets)}件更新")

        # TeachingMaterial の更新（全校舎共通なので tenant_id のみ紐付け）
        materials = db.query(TeachingMaterial).filter(TeachingMaterial.tenant_id == None).all()
        for m in materials:
            m.tenant_id = t_id
        print(f"  - TeachingMaterial: {len(materials)}件更新")

        # 変更をDBに一括保存
        db.commit()
        print("🎉 すべての既存データの移行が完了しました！")

    except Exception as e:
        db.rollback()
        print(f"❌ エラーが発生しました: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()