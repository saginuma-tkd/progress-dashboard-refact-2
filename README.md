# LearningDB (Progress Dashboard) 開発者用マニュアル

## 1. システム概要
本システムは、学習塾における生徒の学習進捗、模試成績、教材管理を一元化し、講師間の情報共有をスムーズにするためのWebアプリケーションです。

### 🛠 技術スタック
* **フロントエンド**: React (TypeScript) + Vite
* **バックエンド**: FastAPI (Python)
* **データベース（ORM）**: SQLAlchemy
    * ローカル開発環境: SQLite (`local_dev.db`)
    * 本番環境 (Render): PostgreSQL
* **認証**: JWT (JSON Web Token) + bcrypt パスワードハッシュ

---

## 2. システムアーキテクチャと設計思想 (Architecture)
本プロジェクト「LearningDB」は、フロントエンドとバックエンドを完全に分離したモダンなSPA（Single Page Application）構成を採用しています。別の開発者が参画する際は、以下の基本思想を理解してください。


* **関心の分離 (Separation of Concerns):**
    * フロントエンド (React/TypeScript) は「UIの描画」と「状態管理」のみを担当します。ビジネスロジックは持ちません。
    * バックエンド (FastAPI) は「データの検証」「DB操作」「権限管理」を担当します。
* **認証基盤 (Authentication):**
    * ステートレスな **JWT (JSON Web Token)** を採用しています。サーバー側でセッション状態を持たないため、スケールアウトが容易です。
    * トークンには `sub` (username), `role`, `school` が含まれており、フロントエンドはこの情報を元にUIの出し分け（Adminメニューの表示など）を行っています。

---

## 3. ディレクトリ構成
```text
project-root/
 ├─ frontend/                # Reactフロントエンド
 │   ├─ src/
 │   │   ├─ components/      # UIコンポーネント
 │   │   └─ pages/           # 各画面（Dashboard, StudentManagement等）
 │   └─ package.json
 │
 └─ backend/                 # FastAPIバックエンド
     ├─ .env                 # ⚠️ 開発用環境変数（Gitには含めない）
     ├─ seed_data.py         # 開発用デモデータ生成スクリプト
     └─ app/
         ├─ main.py          # FastAPI起動の起点
         ├─ core/
         │   ├─ config.py    # 環境変数の読み込み設定
         │   └─ security.py  # JWTトークン生成・パスワードハッシュ
         ├─ db/
         │   └─ database.py  # DB接続設定
         ├─ models/
         │   └─ models.py    # SQLAlchemyのテーブル定義（超重要！）
         └─ routers/         # APIのエンドポイント（auth, admin, deps等）
```

---

## 4. ローカル開発環境のセットアップ

### ① 環境変数の設定 (`.env`)
バックエンドの `backend/` 直下に `.env` ファイルを作成し、以下の内容を記述します。
**(※本番環境のデータベースを誤って書き換えないための命綱です)**

```text
SECRET_KEY=local-development-secret-key-12345
DATABASE_URL=sqlite:///./local_dev.db
```

### ② デモデータの投入
まっさらな状態から開発を始める場合、以下のコマンドでテスト用のモックデータを一括生成します。

```text
cd backend
python seed_data.py
```

ログイン用アカウント:

管理者: admin_shibuya (pass: password123)

一般講師: inst_shibuya_1 (pass: password123)

### ③ アプリケーションの起動

**バックエンド (FastAPI)**

```text
cd backend
uvicorn app.main:app --reload
```

※ APIドキュメント（Swagger UI）は http://localhost:8000/docs で確認可能。

**フロントエンド (React)**

```text
cd frontend
npm run dev
```

※ ブラウザで http://localhost:5173 にアクセス。

---

## 5. 新規参画者向け オンボーディング・タスク
新しくプロジェクトに参加した開発者は、以下の手順で環境を構築し、システムへの理解を深めてください。

* [ ] リポジトリを clone 後、`frontend` と `backend` それぞれで依存パッケージ (`npm install` / `pip install -r requirements.txt`) をインストールする。
* [ ] `backend/.env` を作成し、ローカル用の設定を行う（上記参照）。
* [ ] `python seed_data.py` を実行し、ローカルDBにモックデータを投入する。
* [ ] サーバーを立ち上げ、ブラウザからログインできるか確認する。
* [ ] （推奨タスク）生徒一覧画面から適当な生徒の「進捗」を1件更新し、DB（`progress` テーブル）に正しくデータが反映されるか、処理の流れ (`frontend/API` -> `backend/router` -> `crud` -> `DB`) をトレースして構造を理解する。

---

## 6. データベース設計のコア (Core ER Models)
本システムで最も複雑かつ重要なのが、**「ユーザー(講師)」「生徒」「権限」のリレーション**です。不用意なテーブル変更はシステム全体に影響するため、以下の構造を把握してください。

1. **`User` (講師/管理者):**
    * `role` カラムによって権限 (`developer`, `admin`, `user`) が決定されます。
    * `school` カラムで所属校舎を管理し、`admin` は自校舎のデータのみ操作可能な設計です。
2. **`Student` (生徒):**
    * 進捗 (`Progress`) や模試成績 (`MockExamResult`) など、多数の子テーブルと `cascade="all, delete-orphan"` で紐付いています。生徒を削除すると関連データも全てクリーンに削除されます。
3. **`StudentInstructor` (中間テーブル):**
    * 生徒と講師は「多対多」の関係です。中間テーブルの `is_main` フラグ（1=メイン, 0=サブ）で関係性を管理しています。
4. **🚨 `AuditLog` (監査ログ) の注意点:**
    * このテーブルの `user_id` は `ondelete="SET NULL"` に設定されています。講師（User）が退職等で物理削除されても、過去の操作ログはシステムに残る（孤立させない）ための重要な設計です。

---

## 7. 権限（Role）システムについて
本システムには3つの強力な権限レベルが存在します。

1. **`developer` (開発者)**: システムの全権限を持つ。メンテナンスモードの切り替えが可能。他校舎のデータも全て閲覧・編集可能。
2. **`admin` (管理者)**: 自校舎（例：渋谷校）の全生徒・講師の管理が可能。システム設定は触れない。
3. **`user` (一般講師)**: 自分に紐づいている生徒の進捗更新や閲覧のみ可能。マスタデータの編集は不可。

---

## 8. 開発における暗黙のルール (Coding Guidelines)
新しい機能を追加・修正する際は、以下のルールを厳守してください。

* **パスワードの直接操作禁止:**
    DBにパスワードを保存する際は、必ず `app/core/security.py` の `get_password_hash()` を通して暗号化（bcrypt）してください。平文での保存は厳禁です。
* **権限チェック (Dependency Injection) の徹底:**
    APIエンドポイント（`routers/xxx.py`）を作成する際は、引数に必ず `Depends(get_current_user)` または `Depends(get_current_admin_user)` を含め、エンドポイントレベルでアクセス制御を行ってください。
* **`SECRET_KEY` の取り扱い:**
    ローカル開発時は `.env` で固定キーを使用しますが、本番環境（Render等）のキーは絶対にコードベース（Git）にコミットしないでください。

---

## 9. 新しいAPI・機能の追加方法 (Step-by-Step)
バックエンドに新しい機能を追加する際の黄金ルールです。必ず以下の順番で実装します。

### Step 1: データベースモデルの定義 (`app/models/models.py`)
まずはデータを保存するテーブルを作ります。
```python
class ParentMeeting(Base):
    __tablename__ = "parent_meetings"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    meeting_date = Column(Date, nullable=False)
    # Studentテーブル側にも relationship を追記すること
```

### Step 2: データの設計図・バリデーション (`app/schemas/schemas.py`)
Pydanticで型を定義します。
```python
from pydantic import BaseModel
from datetime import date

class ParentMeetingCreate(BaseModel):
    student_id: int
    meeting_date: date

class ParentMeetingResponse(ParentMeetingCreate):
    id: int
    class Config:
        orm_mode = True
```

### Step 3: APIエンドポイントの作成 (`app/routers/xxx.py`)
**必ず権限チェック（Dependency）**を挟みます。
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.routers import deps
from app.models import models
from app.schemas import schemas

router = APIRouter()

@router.post("/meetings", response_model=schemas.ParentMeetingResponse)
def create_meeting(
    data: schemas.ParentMeetingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user) # 🚨 権限チェック
):
    # DB保存処理...
```

### Step 4: main.py への登録
ルーターファイルを作成した場合は、最後に `app/main.py` に登録します。
```python
app.include_router(meetings.router, prefix="/api/v1/meetings", tags=["Meetings"])
```

---

## 10. 本番環境（Render）への完全デプロイ手順

ローカル開発環境（SQLite）から、本番環境（Render上のPostgreSQL）へシステムを移行・公開するための具体的なステップです。

### ① データベース (PostgreSQL) の作成
まずはデータ保存用のデータベースをRender上に構築します。

1. Renderのダッシュボード右上の「New」>「**PostgreSQL**」を選択。
2. 任意の名前（例：`learningdb-postgres`）をつけて「Create Database」をクリック。
3. 作成完了後、画面に表示される **Internal Database URL** をコピーして控えておきます。
   *(※例: `postgres://user:password@hostname/dbname`)*
4. **【🚨超重要】** SQLAlchemyの仕様上、URLの先頭を `postgres://` から **`postgresql://`** に必ず書き換えてください（`ql` を足す）。

### ② バックエンド (FastAPI) のデプロイ
次にAPIサーバーを立ち上げます。

1. Renderの「New」>「**Web Service**」を選択し、GitHubリポジトリを連携。
2. 以下の設定を入力します：
   * **Name**: 任意の名前（例：`learningdb-backend`）
   * **Root Directory**: `backend`
   * **Environment**: `Python`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. 画面を下へスクロールし、「**Environment Variables**（環境変数）」に以下を追加します：
   * `DATABASE_URL` = 【①で作成したURL（先頭を `postgresql://` に変更済みのもの）】
   * `SECRET_KEY` = 【推測不可能な長いランダム文字列（例: `x8f9d2...`）】
   * `BACKEND_CORS_ORIGINS` = `["https://your-frontend.onrender.com"]` *(※後で作成するフロントエンドのURLが確定したら設定)*
4. 「Create Web Service」をクリックしてデプロイ開始。

### ③ フロントエンド (React) のデプロイ
最後にユーザーがアクセスする画面を立ち上げます。

1. Renderの「New」>「**Static Site**」を選択し、同じリポジトリを連携。
2. 以下の設定を入力します：
   * **Name**: 任意の名前（例：`learningdb-frontend`）
   * **Root Directory**: `frontend`
   * **Build Command**: `npm install && npm run build`
   * **Publish Directory**: `dist` *(※ `frontend/dist` ではないので注意)*
3. 「**Environment Variables**」に以下を追加：
   * `VITE_API_URL` = 【②で作成したバックエンドのURL + `/api/v1`】 *(例: `https://learningdb-backend.onrender.com/api/v1`)*
4. 「Create Static Site」をクリック。

### ④ 【🚨初見殺し】SPA用のルーティング設定 (Rewrite)
React Router等のフロントエンド内ルーティングをRender上で正常に動作させるため（直リンクやリロード時に404エラーになるのを防ぐため）の必須設定です。

1. フロントエンド（Static Site）のRender管理画面メニューから「**Redirects/Rewrites**」を開く。
2. 以下のルールを追加して保存します：
   * **Source**: `/*`
   * **Destination**: `/index.html`
   * **Action**: `Rewrite`

---
**💡 デプロイ後の初期設定**
本番環境のデータベースは最初は空っぽです。デプロイ完了後、バックエンドの「Shell」タブ（Render上のターミナル）を開き、`python seed_data.py` を1度だけ実行して、初期の管理者アカウント（Developer等）を作成してください。
