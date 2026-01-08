export interface Employee {
  id: string;
  hrms_no: string;
  full_name: string;
  job_position: string;
  department: string;
  joining_date: string;
  manager?: string;
  work_email: string;
  work_phone: string;
  nationality?: string;
  basic_salary?: number;
  allowance?: number;
  leave_balance?: number;
  status?: 'Active' | 'On Leave' | 'Terminated';
  visa_no?: string;
  visa_expiration?: string;
  emirates_id?: string;
  emirates_id_expiry?: string;
  passport_no?: string;
  passport_expiry?: string;
  contract_type?: string;
  documents?: EmployeeDocument[];
  photo_url?: string;
  bank_name?: string;
  iban?: string;
  bank_account_no?: string;
  created_at?: string;
  // Private information fields
  gender?: string;
  birthday?: string;
  personal_email?: string;
  personal_phone?: string;
  home_address?: string;
  place_of_birth?: string;
  country_of_birth?: string;
  family_status?: string;
  number_of_children?: number;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  icon: string;
}

export interface Contract {
  id: string;
  employee_id: string;
  mohre_contract_no: string;
  contract_type: 'Unlimited' | 'Limited' | 'Part-time' | 'Temporary';
  status: 'Draft' | 'Submitted' | 'Approved' | 'Active' | 'Expired' | 'Terminated';
  start_date: string;
  end_date?: string;
  basic_salary: number;
  total_salary?: number;
  work_location?: string;
  job_title_arabic?: string;
  working_hours: number;
  notice_period: number;
  annual_leave_days: number;
  probation_period: number;
  employees?: {
    full_name: string;
  };
  created_at?: string;
}

export interface LeaveRecord {
  id: string;
  employee_id: string;
  leave_type: 'Annual' | 'Sick' | 'Maternity' | 'Emergency' | 'Unpaid';
  start_date: string;
  end_date: string;
  days_count: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
  employees?: {
    full_name: string;
  };
  created_at?: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  employees?: {
    full_name: string;
  };
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  wps_processed: boolean;
  employees?: {
    full_name: string;
    hrms_no: string;
  };
}

export interface EOSRecord {
  id: string;
  employee_id: string;
  years_of_service: number;
  basic_salary: number;
  gratuity_amount: number;
  reason?: string;
  paid: boolean;
  employees?: {
    full_name: string;
  };
  created_at?: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  company_name_arabic?: string;
  trade_license_no?: string;
  tax_registration_no?: string;
  establishment_id?: string;
  mol_id?: string;
  address?: string;
  city?: string;
  emirate?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  work_week_start?: string;
  work_week_end?: string;
  work_hours_per_day?: number;
  overtime_rate?: number;
  leave_year_start?: string;
  currency?: string;
  date_format?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'General' | 'Meeting' | 'Training' | 'Holiday' | 'Company';
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  is_all_day: boolean;
  color?: string;
  created_at?: string;
}

export type ViewType = 'dashboard' | 'gamification' | 'employees' | 'time-shift' | 'time-clock' | 'e-portal' | 'contracts' | 'renewal' | 'smart-upload' | 'attendance' | 'employee-attendance' | 'attendance-appeals' | 'leave' | 'payroll' | 'eos' | 'calendar' | 'performance' | 'discipline' | 'orgchart' | 'company-docs' | 'reports' | 'settings';
