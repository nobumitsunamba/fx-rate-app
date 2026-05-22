export interface WorkRecord {
  id: string;
  work_order_no: string;
  user_id: string;
  username: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  photo_url?: string | null;
}

export type ScanStep = 'scan' | 'start' | 'working' | 'photo' | 'completed';
