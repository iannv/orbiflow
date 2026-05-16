export interface Variante {
  id?: number;
  module?: number;
  name: string;
  type: 'fixed_amount' | 'percentage';
  value: string | number; 
  is_default: boolean;
}

export interface Modulo {
  id?: number;
  name: string;
  description: string;
  applies_to_cap: boolean;
  calculation_type: 'simple' | 'seniority';
  is_exclusive: boolean;
  is_active: boolean;
  variants?: Variante[];
}