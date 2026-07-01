// frontend/src/types.ts

// =======================
// 英検・ダッシュボードサマリー関連の型
// =======================
export interface EikenResult {
  id: number;
  student_id: number;
  exam_date: string;
  grade: string;
  cse_score?: number; // 🌟 修正: バックエンドに合わせて cse_score に変更
  result?: string;
  target_grade?: string; // 🌟 追加: 新しく追加した目標級カラム
}

export interface DashboardSummary {
  total_progress: number;
  latest_eiken: {
    grade: string;
    score: number;
    result: string;
  } | null;
}

// =======================
// 教材・タグ関連の型
// =======================
export interface Tag {
  id: number;
  name: string;
}

export interface TeachingMaterial {
  id: number;
  title: string;
  file_path?: string;
  s3_key?: string;
  original_filename?: string;
  file_size?: number;
  internal_memo?: string;
  category?: 'material' | 'route_table';
  subjects?: Tag[];
  detail_tags?: Tag[];
  created_at?: string;
  updated_at?: string;
}

// =======================
// 進捗・参考書関連の型
// =======================
export interface ProgressItem {
  id: number;
  subject: string;
  book_name: string; // 🌟 修正: reference_bookの古い重複定義を削除し、こちらに統一
  completed_units: number;
  total_units: number;
  level?: string;
}

export interface MasterBook {
  id: number;
  level: string;
  subject: string;
  book_name: string;
  duration: number;
}

export interface PresetBook {
  id: number | null;
  subject: string;
  level: string;
  book_name: string;
  duration: number;
  is_master: boolean;
}

export interface Preset {
  id: number;
  name: string;
  subject: string;
  books: PresetBook[];
}

export interface BookCandidate {
  tempId: string;
  masterId?: number;
  subject: string;
  level: string;
  book_name: string;
  duration: number;
  isCustom: boolean;
}

// =======================
// ダッシュボード・生徒関連の型
// =======================
export interface Student {
  id: number;
  name: string;
  grade?: string;
  username?: string;
}

export interface DashboardData {
  total_study_time: number;
  total_planned_time?: number;
  progress_rate?: number;
  eiken_grade?: string;
  eiken_score?: string;
  eiken_date?: string;
  eiken_target?: string; // 🌟 追加: Dashboard.tsx で受け取る目標級
}

// =======================
// ユーザー・認証関連の型
// =======================
export interface User {
  username: string;
  role: 'developer' | 'admin' | 'user' | 'instructor' | 'student' | 'super_admin';
  school?: string;
}

// =======================
// 過去問・模試関連の型
// =======================
export interface PastResult {
  id: number;
  university_name: string;
  faculty_name: string;
  department_name?: string;
  exam_year: number;
  subject: string;
  correct_answers: number;
  total_questions: number;
  date: string;
  created_at?: string;
}

export interface MockResult {
  id: number;
  mock_name: string;
  exam_date: string;
  subject: string;
  score: number | string;
}

// =======================
// 管理画面・模試一覧関連の型
// =======================
export interface MockExamRecord {
  id: number;
  student_name: string;
  student_grade: string;
  exam_name: string;
  subject: string;
  score: number;
  deviation: number | null;
  exam_date: string;
}

export interface SchoolEvent {
  id: number;
  tenant_id: number;
  school_id?: number | null;
  title: string;
  start_date: string;
  end_date: string;
  category: string;
  description?: string;
}