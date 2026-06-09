# 03. ディレクトリ構成

```
project-root/
├─ frontend/                # React フロントエンド
│   ├─ src/
│   │   ├─ components/      # 再利用UIコンポーネント
│   │   └─ pages/           # 各画面（Dashboard, StudentManagement 等）
│   ├─ package.json
│   └─ vite.config.ts
│
└─ backend/                 # FastAPI バックエンド
    ├─ .env                 # ⚠️ 開発用環境変数（Gitに含めない）
    ├─ requirements.txt     # Pythonパッケージ一覧
    ├─ seed_data.py         # 開発用デモデータ生成スクリプト
    └─ app/
        ├─ main.py          # FastAPI起動の起点
        ├─ core/
        │   ├─ config.py    # 環境変数の読み込み設定（pydantic-settings）
        │   ├─ security.py  # JWT生成・パスワードハッシュ（bcrypt）
        │   └─ scheduler.py # APSchedulerジョブ定義
        ├─ db/
        │   └─ database.py  # DB接続・セッション設定
        ├─ models/
        │   └─ models.py    # SQLAlchemyテーブル定義 ← 超重要
        ├─ schemas/         # Pydanticスキーマ（バリデーション）
        ├─ crud/            # DB操作ロジック
        └─ routers/         # APIエンドポイント群
            ├─ deps.py      # 認証・権限チェック（Dependency）
            ├─ auth.py      # 認証
            ├─ students.py  # 生徒管理
            ├─ admin.py     # 管理者機能
            ├─ dashboard.py # ダッシュボード
            ├─ exams.py     # 模試成績
            ├─ reports.py   # PDF・レポート生成
            ├─ chat.py      # AIチャット（Gemini）
            ├─ attendance.py # 出席管理
            ├─ materials.py  # 教材管理
            ├─ audit.py      # 監査ログ
            ├─ backup.py     # バックアップ（S3）
            ├─ csv_import.py # CSVインポート
            ├─ schools.py    # 校舎管理
            ├─ system.py     # システム設定
            ├─ developer.py  # 開発者専用機能
            └─ ... （その他多数）
```