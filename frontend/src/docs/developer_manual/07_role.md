# 07. 権限（Role）システム

本システムには5つの権限レベルが存在します。`routers/deps.py` で各ロールの Dependency 関数が定義されています。

---

## ロール一覧

| ロール | 対象者 | できること |
|---|---|---|
| `super_admin` | システム全体の管理者 | 全テナント横断でのシステム管理。テナントの作成・削除など最上位の操作が可能 |
| `developer` | 開発者 | 全権限。メンテナンスモードの切り替え・全テナント・全校舎のデータ閲覧・編集が可能 |
| `admin` | 管理者（校長等） | 自校舎の全生徒・講師の管理が可能。システム設定・他校舎データは操作不可 |
| `user` | 一般講師 | 自分に紐づく生徒の進捗更新・閲覧のみ可能。マスタデータの編集は不可 |
| `student` | 生徒本人 | 自分自身の進捗・成績データの閲覧のみ可能 |

---

## Dependency 関数の対応表

| Dependency 関数 | 許可されるロール |
|---|---|
| `get_current_user` | 全ロール（認証済みユーザー） |
| `get_current_active_user` | 全ロール（アクティブユーザー） |
| `get_current_admin_user` | `admin`, `developer` |
| `get_current_developer_user` | `developer` のみ |
| `get_current_super_admin_user` / `get_current_super_admin` | `super_admin` のみ |

---

## 使用例

```python
from app.routers import deps

# 認証済みユーザーならアクセス可
@router.get("/me")
def get_me(current_user = Depends(deps.get_current_user)):
    ...

# admin または developer のみ
@router.delete("/students/{id}")
def delete_student(current_user = Depends(deps.get_current_admin_user)):
    ...

# developer のみ
@router.post("/maintenance")
def toggle_maintenance(current_user = Depends(deps.get_current_developer_user)):
    ...

# super_admin のみ
@router.post("/tenants")
def create_tenant(current_user = Depends(deps.get_current_super_admin_user)):
    ...
```

> ⚠️ **権限チェックはAPIエンドポイントレベルで必ず実施してください。フロントエンドのみでの権限制御は禁止です。**