# 02. アーキテクチャと設計思想

本プロジェクトはフロントエンドとバックエンドを完全に分離したモダンなSPA（Single Page Application）構成を採用しています。新規参画者は以下の基本思想を理解してください。

---

## 関心の分離（Separation of Concerns）

- **フロントエンド（React/TypeScript）**：UIの描画と状態管理のみを担当。ビジネスロジックは持ちません。
- **バックエンド（FastAPI）**：データの検証・DB操作・権限管理を担当します。

---

## 認証基盤（JWT）

ステートレスな **JWT（JSON Web Token）** を採用しています。サーバー側でセッション状態を持たないため、スケールアウトが容易です。

JWTペイロードに含まれる情報：

- `sub` — ユーザー名（username）
- `role` — 権限レベル
- `school` — 所属校舎名

フロントエンドはこの情報を元にUIの出し分け（Adminメニューの表示など）を行っています。

---

## マルチテナント設計

データは `Tenant → School → User / Student` という階層構造で管理されます。

```
Tenant（塾法人単位）
  └─ School（校舎単位）
       ├─ User（講師・管理者）
       └─ Student（生徒）
```

`get_tenant_id_for_user()` がユーザーの `tenant_id` を解決し、`get_tenant_query()` でテナント単位のクエリフィルタを適用します。`developer` ロールはフィルタなしで全件アクセス可能です。