# 05. APIエンドポイント一覧

すべてのエンドポイントはプレフィックス `/api/v1` の下に配置されています。

| プレフィックス | ルーターファイル | 主な機能 |
|---|---|---|
| `/api/v1/auth` | `routers/auth.py` | ログイン・トークン発行 |
| `/api/v1/students` | `routers/students.py` | 生徒管理（CRUD） |
| `/api/v1/admin` | `routers/admin.py` | 管理者操作 |
| `/api/v1/dashboard` | `routers/dashboard.py` | ダッシュボードデータ |
| `/api/v1/exams` | `routers/exams.py` | 模試成績管理 |
| `/api/v1/charts` | `routers/charts.py` | グラフ用データ |
| `/api/v1/reports` | `routers/reports.py` | PDF・レポート生成 |
| `/api/v1/materials` | `routers/materials.py` | 教材管理 |
| `/api/v1/attendance` | `routers/attendance.py` | 出席管理 |
| `/api/v1/chat` | `routers/chat.py` | AIチャット（Gemini） |
| `/api/v1/audit` | `routers/audit.py` | 監査ログ閲覧 |
| `/api/v1/backup` | `routers/backup.py` | バックアップ（S3） |
| `/api/v1/csv_import` | `routers/csv_import.py` | CSVインポート |
| `/api/v1/schools` | `routers/schools.py` | 校舎管理 |
| `/api/v1/system` | `routers/system.py` | システム設定 |
| `/api/v1/system_status` | `routers/system_status.py` | システム状態確認 |
| `/api/v1/developer` | `routers/developer.py` | 開発者専用機能 |
| `/api/v1/routes` | `routers/routes.py` | ルート情報 |
| `/api/v1/student_report` | `routers/student_report.py` | 生徒レポート |
| `/api/v1/applications` | `routers/applications.py` | 出願管理 |
| `/api/v1/common` | `routers/common.py` | 共通マスタデータ |
| `/api` | `routers/external.py` | 外部連携（互換性維持） |