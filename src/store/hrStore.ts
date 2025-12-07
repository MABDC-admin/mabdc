import { create } from 'zustand';
import type { Employee, Contract, LeaveRecord, Attendance, Payroll, EOSRecord, ViewType } from '@/types/hr';

interface HRState {
  employees: Employee[];
  contracts: Contract[];
  leave: LeaveRecord[];
  attendance: Attendance[];
  payroll: Payroll[];
  eos: EOSRecord[];
  currentView: ViewType;
  currentEmployee: Employee | null;
  isLoading: boolean;
  
  setEmployees: (employees: Employee[]) => void;
  setContracts: (contracts: Contract[]) => void;
  setLeave: (leave: LeaveRecord[]) => void;
  setAttendance: (attendance: Attendance[]) => void;
  setPayroll: (payroll: Payroll[]) => void;
  setEOS: (eos: EOSRecord[]) => void;
  setCurrentView: (view: ViewType) => void;
  setCurrentEmployee: (employee: Employee | null) => void;
  setLoading: (loading: boolean) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: string) => void;
}

// Demo data
const demoEmployees: Employee[] = [
  {
    id: '1',
    hrms_no: 'EMP-0001',
    full_name: 'Ahmed Ali Hassan',
    job_position: 'HR Manager',
    department: 'Human Resources',
    joining_date: '2022-09-01',
    work_email: 'ahmed.ali@mabdc.ae',
    work_phone: '+971 50 123 4567',
    nationality: 'UAE',
    basic_salary: 15000,
    allowance: 5000,
    leave_balance: 18,
    status: 'Active',
    visa_no: '9847 2211 0034',
    visa_expiration: '2026-11-12',
    emirates_id: '784-1989-1234567-1',
    emirates_id_expiry: '2026-10-05',
    passport_no: 'A1234567',
    passport_expiry: '2028-03-18',
    contract_type: 'Unlimited',
  },
  {
    id: '2',
    hrms_no: 'EMP-0002',
    full_name: 'Fatima Al Mansouri',
    job_position: 'Finance Director',
    department: 'Finance',
    joining_date: '2021-03-15',
    work_email: 'fatima.mansouri@mabdc.ae',
    work_phone: '+971 50 234 5678',
    nationality: 'UAE',
    basic_salary: 25000,
    allowance: 8000,
    leave_balance: 22,
    status: 'Active',
    visa_no: '9847 3322 0045',
    visa_expiration: '2025-02-20',
    emirates_id: '784-1985-2345678-2',
    emirates_id_expiry: '2025-01-15',
    contract_type: 'Unlimited',
  },
  {
    id: '3',
    hrms_no: 'EMP-0003',
    full_name: 'Mohammed Al Rashid',
    job_position: 'Software Engineer',
    department: 'IT',
    joining_date: '2023-06-01',
    work_email: 'mohammed.rashid@mabdc.ae',
    work_phone: '+971 50 345 6789',
    nationality: 'Jordan',
    basic_salary: 12000,
    allowance: 3000,
    leave_balance: 15,
    status: 'Active',
    visa_no: '9847 4433 0056',
    visa_expiration: '2025-06-01',
    emirates_id: '784-1992-3456789-3',
    contract_type: 'Limited',
  },
  {
    id: '4',
    hrms_no: 'EMP-0004',
    full_name: 'Sara Ahmed Khan',
    job_position: 'Marketing Specialist',
    department: 'Marketing',
    joining_date: '2022-11-10',
    work_email: 'sara.khan@mabdc.ae',
    work_phone: '+971 50 456 7890',
    nationality: 'Pakistan',
    basic_salary: 10000,
    allowance: 2500,
    leave_balance: 12,
    status: 'On Leave',
    visa_no: '9847 5544 0067',
    visa_expiration: '2025-11-10',
    contract_type: 'Limited',
  },
];

const demoContracts: Contract[] = [
  {
    id: '1',
    employee_id: '1',
    mohre_contract_no: 'CNTR-2022-0091',
    contract_type: 'Unlimited',
    status: 'Active',
    start_date: '2022-09-01',
    basic_salary: 15000,
    total_salary: 20000,
    work_location: 'Abu Dhabi',
    working_hours: 48,
    notice_period: 30,
    annual_leave_days: 30,
    probation_period: 6,
    employees: { full_name: 'Ahmed Ali Hassan' },
  },
  {
    id: '2',
    employee_id: '2',
    mohre_contract_no: 'CNTR-2021-0045',
    contract_type: 'Unlimited',
    status: 'Active',
    start_date: '2021-03-15',
    basic_salary: 25000,
    total_salary: 33000,
    work_location: 'Dubai',
    working_hours: 48,
    notice_period: 60,
    annual_leave_days: 30,
    probation_period: 6,
    employees: { full_name: 'Fatima Al Mansouri' },
  },
];

const demoLeave: LeaveRecord[] = [
  {
    id: '1',
    employee_id: '1',
    leave_type: 'Annual',
    start_date: '2024-08-10',
    end_date: '2024-08-20',
    days_count: 10,
    status: 'Approved',
    employees: { full_name: 'Ahmed Ali Hassan' },
  },
  {
    id: '2',
    employee_id: '4',
    leave_type: 'Sick',
    start_date: '2024-12-01',
    end_date: '2024-12-07',
    days_count: 7,
    status: 'Pending',
    reason: 'Medical appointment',
    employees: { full_name: 'Sara Ahmed Khan' },
  },
];

export const useHRStore = create<HRState>((set) => ({
  employees: demoEmployees,
  contracts: demoContracts,
  leave: demoLeave,
  attendance: [],
  payroll: [],
  eos: [],
  currentView: 'dashboard',
  currentEmployee: null,
  isLoading: false,

  setEmployees: (employees) => set({ employees }),
  setContracts: (contracts) => set({ contracts }),
  setLeave: (leave) => set({ leave }),
  setAttendance: (attendance) => set({ attendance }),
  setPayroll: (payroll) => set({ payroll }),
  setEOS: (eos) => set({ eos }),
  setCurrentView: (currentView) => set({ currentView }),
  setCurrentEmployee: (currentEmployee) => set({ currentEmployee }),
  setLoading: (isLoading) => set({ isLoading }),
  addEmployee: (employee) => set((state) => ({ 
    employees: [employee, ...state.employees] 
  })),
  updateEmployee: (employee) => set((state) => ({
    employees: state.employees.map((e) => e.id === employee.id ? employee : e)
  })),
  deleteEmployee: (id) => set((state) => ({
    employees: state.employees.filter((e) => e.id !== id)
  })),
}));
