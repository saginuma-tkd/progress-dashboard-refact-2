# 06. データベース設計（Core ER Models）

本システムで最も複雑かつ重要なのが **「テナント→校舎→ユーザー（講師）→生徒」の階層リレーション** です。不用意なテーブル変更はシステム全体に影響するため、以下の構造を把握してください。

---

## 主要テーブル一覧

| テーブル名 | 説明 |
|---|---|
| `tenants` | 塾法人（最上位） |
| `schools` | 校舎（Tenant配下） |
| `users` | 講師・管理者アカウント |
| `students` | 生徒情報 |
| `student_instructors` | 生徒と講師の中間テーブル（多対多） |
| `progress` | 教材別の学習進捗 |
| `mock_exam_results` | 模試成績 |
| `past_exam_results` | 過去問演習結果 |
| `master_textbooks` | 参考書マスタ |
| `bulk_presets` / `bulk_preset_books` | 一括登録プリセット |
| `audit_logs` | 操作ログ（物理削除不可） |
| `eiken_results` | 英検結果 |
| `university_acceptances` | 合格実績 |

---

## 重要なリレーション設計

### Student（生徒）

子テーブルとは `cascade="all, delete-orphan"` で紐付いています。生徒を削除すると関連データも全てクリーンに削除されます。

### StudentInstructor（中間テーブル）

生徒と講師は多対多の関係です。`is_main` フラグ（`1`=メイン, `0`=サブ）で関係性を管理しています。

### AuditLog（監査ログ）⚠️

`user_id` は `ondelete="SET NULL"` に設定されています。講師（User）が退職等で物理削除されても、過去の操作ログはシステムに残ります。これは意図的な設計です。

---

## 主要なユニーク制約

| テーブル | ユニーク制約 |
|---|---|
| `students` | `(school_id, name)` |
| `master_textbooks` | `(subject, level, book_name, tenant_id, school_id)` |
| `student_instructors` | `(student_id, user_id)` |
| `bulk_presets` | `(subject, preset_name, tenant_id, school_id)` |
| `schools` | `(tenant_id, name)` |