import { PaginationMeta } from '../response-type/Type';
import { Role } from './Role';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone_one: string | null;
  phone_two: string | null;
  username: string | null;
  address: string | null;
  status: boolean;
  role_id: number;
  role: Role;
}

export interface UserResponse {
  data: User[];
  meta: PaginationMeta;
}
