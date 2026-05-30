import { LiquidationItem } from './Liquidation';

export interface Retirement {
  id: number;
  liquidation: number;
  associate: number;
  associate_full_name: string;
  associate_dni: string;
  hours_worked: number;
  base_amount: string;
  additional_amount: string;
  cap_adjustment: string;
  total_amount: string;
  items: LiquidationItem[];
}
