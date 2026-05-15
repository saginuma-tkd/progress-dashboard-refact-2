export interface EikenResult {
  id: number;
  student_id: number;
  exam_date: string;
  grade: string;
  score: number;
  result: string;
}

export interface DashboardSummary {
  total_progress: number;
  latest_eiken: {
    grade: string;
    score: number;
    result: string;
  } | null;
}

export interface ProgressItem {
  id: number;
  subject: string;
  reference_book: string;
  completed_units: number;
  total_units: number;
}

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
  // ↓ここを複数形（配列）に変更しました
  subjects?: Tag[];     
  detail_tags?: Tag[];  
  created_at?: string;
  updated_at?: string;
}