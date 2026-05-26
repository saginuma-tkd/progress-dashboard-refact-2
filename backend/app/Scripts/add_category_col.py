import sqlite3
db_path = r'C:\Users\takum\Desktop\Python\progress-dashboard-refact-2\backend\local_dev.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE teaching_materials ADD COLUMN category TEXT NOT NULL DEFAULT 'material'")
    print('teaching_materials.category: added')
except Exception as e:
    print(f'teaching_materials.category: {e}')
conn.commit()
conn.close()
print('Done.')
