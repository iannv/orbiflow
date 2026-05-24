export interface LiquidationPeriod {
  id?: number;
  month: number;
  year: number;
  applied_hour_value: string;
  applied_cap_pct: string;
  status: 'open' | 'reviewed' | 'closed';
}

export interface UploadHoursPayload {
  entries: { associate_id: number; hours_worked: number }[];
}

export interface LiquidationTotals {
  base_amount: string;
  additional_amount: string;
  cap_adjustment: string;
  total_amount: string;
}

export interface LiquidationSummary {
  period: LiquidationPeriod;
  retirements_count: number;
  totals: LiquidationTotals;
  retirements: any[]; 
}