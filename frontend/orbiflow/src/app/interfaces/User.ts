export interface User {
    id: number;
    password: string;
    last_login: Date;
    is_superuser: boolean;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_active: boolean;
    date_joined: Date;
    role: string;
    email: string;
    is_deleted: boolean;
}