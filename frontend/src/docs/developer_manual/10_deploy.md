# 10. 本番環境（Render）へのデプロイ手順

ローカル開発環境（SQLite）から本番環境（Render上のPostgreSQL）へシステムを公開するための手順です。

---

## Step 1: PostgreSQLデータベースの作成

1. Renderのダッシュボード右上の「New」>「**PostgreSQL**」を選択。
2. 任意の名前（例：`learningdb-postgres`）をつけて「Create Database」をクリック。
3. 作成完了後、表示される **Internal Database URL** をコピーして控えておく。
4. **【重要】** URLの先頭を `postgres://` から **`postgresql://`** に書き換える（`ql` を足す）。

> ⚠️ SQLAlchemyの仕様上、URLの先頭は必ず `postgresql://` である必要があります。`postgres://` では接続エラーになります。

---

## Step 2: バックエンド（FastAPI）のデプロイ

1. Renderの「New」>「**Web Service**」を選択し、GitHubリポジトリを連携。
2. 以下の設定を入力する：

| 設定項目 | 値 |
|---|---|
| Name | `learningdb-backend`（任意） |
| Root Directory | `backend` |
| Environment | `Python` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

3. 「**Environment Variables**」に以下を追加：

| 環境変数名 | 値 |
|---|---|
| `DATABASE_URL` | Step 1で取得したURL（`postgresql://...`） |
| `SECRET_KEY` | 推測不可能な長いランダム文字列 |
| `BACKEND_CORS_ORIGINS` | `["https://your-frontend.onrender.com"]`（後で設定） |

---

## Step 3: フロントエンド（React）のデプロイ

1. Renderの「New」>「**Static Site**」を選択し、同じリポジトリを連携。
2. 以下の設定を入力する：

| 設定項目 | 値 |
|---|---|
| Name | `learningdb-frontend`（任意） |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist`（`frontend/dist` ではないので注意） |

3. 「**Environment Variables**」に以下を追加：

| 環境変数名 | 値 |
|---|---|
| `VITE_API_URL` | `https://learningdb-backend.onrender.com/api/v1` |

---

## Step 4: SPA用ルーティング設定（必須）

React RouterによるSPAルーティングをRender上で正常動作させるための必須設定です。この設定がないと直リンクやリロード時に404エラーになります。

1. フロントエンドのRender管理画面から「**Redirects/Rewrites**」を開く。
2. 以下のルールを追加して保存：

| 項目 | 値 |
|---|---|
| Source | `/*` |
| Destination | `/index.html` |
| Action | `Rewrite` |

---

## デプロイ後の初期設定

本番環境のDBは最初は空です。バックエンドのRender管理画面の「Shell」タブを開き、以下を **1度だけ** 実行してください。

```bash
python seed_data.py
# 初期の管理者アカウント（Developerロール等）が作成されます
```