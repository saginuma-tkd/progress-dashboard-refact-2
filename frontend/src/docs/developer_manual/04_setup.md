# 04. ローカル開発環境のセットアップ

---

## 前提条件

- Node.js 18 以上
- Python 3.10 以上
- pip

---

## ① 依存パッケージのインストール

**フロントエンド：**

```bash
cd frontend
npm install
```

**バックエンド：**

```bash
cd backend
pip install -r requirements.txt
```

---

## ② 環境変数の設定（`.env`）

`backend/` 直下に `.env` ファイルを作成し、以下の内容を記述します。

> ⚠️ **本番環境のデータベースを誤って書き換えないための命綱です。** 必ずローカル用のSQLiteを指定してください。

```env
# backend/.env

SECRET_KEY=local-development-secret-key-12345
DATABASE_URL=sqlite:///./local_dev.db

# 以下は使用する機能があれば設定（任意）
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=
FORM_API_KEY=
LINE_CHANNEL_ACCESS=
LINE_GROUP_ID=
```

---

## ③ デモデータの投入

まっさらな状態から開発を始める場合、以下のコマンドでモックデータを一括生成します。

```bash
cd backend
python seed_data.py
```

生成されるログインアカウント：

| ロール | ユーザー名 | パスワード |
|---|---|---|
| 管理者（admin） | `admin_shibuya` | `password123` |
| 一般講師（user） | `inst_shibuya_1` | `password123` |

---

## ④ サーバーの起動

**バックエンド（FastAPI）：**

```bash
cd backend
uvicorn app.main:app --reload

# Swagger UI（APIドキュメント）
# → http://localhost:8000/api/v1/docs
```

**フロントエンド（React）：**

```bash
cd frontend
npm run dev

# → http://localhost:5173
```