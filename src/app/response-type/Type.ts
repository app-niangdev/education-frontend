export interface LaravelApiResponse<T = unknown> {
  status: number;
  message: string;
  payload: T;
  errors?: Record<string, string[]>;
  meta: PaginationMeta;
}

export type MessageType = 'error-snackbar' | 'success-snackbar';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export type GenderOption = {
  value: Gender;
  label: string;
};

export type ResponseMessage = {
  status: boolean;
  message: string;
  error: boolean;
};

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  pageSizeOptions?: number[];
}

export const initialPaginationMeta: PaginationMeta = {
  current_page: 1,
  per_page: 10,
  total: 0,
  last_page: 1,
  pageSizeOptions: [5, 10, 25, 50, 100]
};

export interface MailSidenavLink {
  label: string;
  route: string[];
  icon: string;
  routerLinkActiveOptions?: { exact: boolean };
}
