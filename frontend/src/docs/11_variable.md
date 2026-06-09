# 11. 設定リファレンス

---

## 環境変数一覧

| 変数名 | 説明 | デフォルト値 |
|---|---|---|
| `SECRET_KEY` | JWT署名キー（本番は必ず変更） | `your-secret-key-change-this-in-production` |
| `DATABASE_URL` | DB接続URL | `postgresql://user:password@localhost:5432/mydatabase` |
| `AWS_ACCESS_KEY_ID` | AWS S3アクセスキー | `""` |
| `AWS_SECRET_ACCESS_KEY` | AWS S3シークレットキー | `""` |
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |
| `S3_BUCKET_NAME` | S3バケット名 | `my-s3-bucket` |
| `FORM_API_KEY` | フォーム外部APIキー | `YOUR_SECRET_API_KEY` |
| `BACKEND_CORS_ORIGINS` | CORS許可オリジン（JSON配列） | `["http://localhost:5173", ...]` |
| `LINE_CHANNEL_ACCESS` | LINE Botチャンネルアクセストークン | `""` |
| `LINE_GROUP_ID` | LINE グループID | `""` |

---

## JWTトークン設定

- **有効期限：** 60分 × 24時間 × 8日 = **8日間**
- **アルゴリズム：** HS256（python-jose）
- **パスワードハッシュ：** bcrypt（`bcrypt==3.2.2` 固定）

---

## CORS設定

デフォルトで以下のオリジンが許可されています：

- `http://localhost:5173`（Vite開発サーバー）
- `http://localhost:3000`
- `https://progress-dashboard-frontend.onrender.com`

本番追加時は環境変数 `BACKEND_CORS_ORIGINS` にJSON配列形式で設定します。