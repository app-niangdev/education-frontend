import { User } from './User';

export interface ActivityLog {
  id: number;
  user_id: number;
  user?: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'>;
  action: string;
  module: string;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}
