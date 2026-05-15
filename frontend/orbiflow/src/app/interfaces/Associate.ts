export interface AssociateVariant {
  id: number;
  associate: number;
  variant: number;
  variant_name: string;
  module_name: string;
  activation_date: string;
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
  emergency_contact: string;
  first_name: string;
  last_name: string;
  full_name: string;
  years_in_coop: string;
  is_deleted: boolean;
  variants: AssociateVariant[];
}
