export interface AssociateVariant {
  id: number;
  associate: number;
  variant: number;
  variant_name: string;
  variant_value: number;
  module_name: string;
  activation_date: string;
  variant_type: 'percentage' | 'fixed_amount';
}

export interface Associate {
  id: number;
  user: number;
  dni: string;
  cbu: string;
  entry_date: string;
  base_hours: number;
  work_email: string;
  personal_email: string;
  phone_number: string;
  address: string;
  emergency_contact: Record<string, unknown> | null; // JSONField en el backend
  first_name: string;
  last_name: string;
  full_name: string;
  years_in_coop: number; // entero calculado en el backend (días / 365)
  is_deleted: boolean;
  is_active: boolean;
  variants: AssociateVariant[];
}

export interface CreateAssociatePayload {
  user: number;
  dni: string;
  cbu: string;
  entry_date: string;
  base_hours: number;
  personal_email: string;
  phone_number: string;
  address: string;
  emergency_contact?: Record<string, unknown> | null;
}