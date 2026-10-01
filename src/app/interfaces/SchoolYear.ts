export interface SchoolYear {
  id?: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: 'PLANNED' | 'ONGOING' | 'FINISHED';
}
