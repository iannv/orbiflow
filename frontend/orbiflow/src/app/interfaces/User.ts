import { RolEnum } from '../enums/rolEnum';

export interface User {
  id?: number;
  password: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: RolEnum;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
  is_deleted?: boolean;
  date_joined: string;
  last_login?: Date;

  chipName?: string;
  chipColorName?: string;
  chipBackgroundColor?: string;
}
