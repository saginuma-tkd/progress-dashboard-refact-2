# 01. システム概要

> LearningDB (Progress Dashboard) — Developer Reference v2.0

本システムは、学習塾における生徒の学習進捗・模試成績・教材管理を一元化し、講師間の情報共有をスムーズにするためのWebアプリケーションです。

---

## 技術スタック

| レイヤー | 使用技術 |
|---|---|
| フロントエンド | React 18 (TypeScript) + Vite 5 |
| バックエンド | FastAPI (Python) v2.0.0 |
| ORM | SQLAlchemy |
| DB（開発） | SQLite (`local_dev.db`) |
| DB（本番） | PostgreSQL (Render) |
| 認証 | JWT + bcrypt (passlib) |
| スケジューラ | APScheduler 3.10 |
| ファイルストレージ | AWS S3 (boto3) |
| 外部連携 | Google API, LINE Bot SDK |
| AIチャット | Google Generative AI (Gemini) |

---

## 主要フロントエンドライブラリ

| ライブラリ | 用途 |
|---|---|
| `react-router-dom` v7 | クライアントサイドルーティング |
| `@tanstack/react-query` v5 | サーバー状態管理・キャッシュ |
| `axios` | HTTPクライアント |
| `recharts` / `plotly.js` | グラフ・チャート描画 |
| `@radix-ui/*` | アクセシブルUIコンポーネント |
| `tailwindcss` | ユーティリティCSSフレームワーク |
| `lucide-react` | アイコンライブラリ |
| `sonner` | トースト通知 |
| `date-fns` / `dayjs` | 日付操作 |
| `html2canvas` | 画面キャプチャ |
| `react-markdown` | Markdownレンダリング |