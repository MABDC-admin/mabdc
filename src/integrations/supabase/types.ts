export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          status: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          status?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          company_name_arabic: string | null
          country: string | null
          created_at: string
          currency: string | null
          date_format: string | null
          email: string | null
          emirate: string | null
          establishment_id: string | null
          id: string
          leave_year_start: string | null
          logo_url: string | null
          mol_id: string | null
          overtime_rate: number | null
          phone: string | null
          tax_registration_no: string | null
          trade_license_no: string | null
          updated_at: string
          website: string | null
          work_hours_per_day: number | null
          work_week_end: string | null
          work_week_start: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string
          company_name_arabic?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          date_format?: string | null
          email?: string | null
          emirate?: string | null
          establishment_id?: string | null
          id?: string
          leave_year_start?: string | null
          logo_url?: string | null
          mol_id?: string | null
          overtime_rate?: number | null
          phone?: string | null
          tax_registration_no?: string | null
          trade_license_no?: string | null
          updated_at?: string
          website?: string | null
          work_hours_per_day?: number | null
          work_week_end?: string | null
          work_week_start?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          company_name_arabic?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          date_format?: string | null
          email?: string | null
          emirate?: string | null
          establishment_id?: string | null
          id?: string
          leave_year_start?: string | null
          logo_url?: string | null
          mol_id?: string | null
          overtime_rate?: number | null
          phone?: string | null
          tax_registration_no?: string | null
          trade_license_no?: string | null
          updated_at?: string
          website?: string | null
          work_hours_per_day?: number | null
          work_week_end?: string | null
          work_week_start?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          annual_leave_days: number | null
          basic_salary: number
          contract_type: string
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          job_title_arabic: string | null
          mohre_contract_no: string
          notice_period: number | null
          probation_period: number | null
          start_date: string
          status: string | null
          total_salary: number | null
          updated_at: string
          work_location: string | null
          working_hours: number | null
        }
        Insert: {
          annual_leave_days?: number | null
          basic_salary: number
          contract_type: string
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          job_title_arabic?: string | null
          mohre_contract_no: string
          notice_period?: number | null
          probation_period?: number | null
          start_date: string
          status?: string | null
          total_salary?: number | null
          updated_at?: string
          work_location?: string | null
          working_hours?: number | null
        }
        Update: {
          annual_leave_days?: number | null
          basic_salary?: number
          contract_type?: string
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          job_title_arabic?: string | null
          mohre_contract_no?: string
          notice_period?: number | null
          probation_period?: number | null
          start_date?: string
          status?: string | null
          total_salary?: number | null
          updated_at?: string
          work_location?: string | null
          working_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          category: string | null
          created_at: string
          employee_id: string
          file_size: string | null
          file_type: string
          file_url: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          employee_id: string
          file_size?: string | null
          file_type: string
          file_url: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          employee_id?: string
          file_size?: string | null
          file_type?: string
          file_url?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          allowance: number | null
          basic_salary: number | null
          contract_type: string | null
          created_at: string
          department: string
          emirates_id: string | null
          emirates_id_expiry: string | null
          full_name: string
          hrms_no: string
          id: string
          job_position: string
          joining_date: string
          leave_balance: number | null
          manager: string | null
          nationality: string | null
          passport_expiry: string | null
          passport_no: string | null
          photo_url: string | null
          status: string | null
          updated_at: string
          visa_expiration: string | null
          visa_no: string | null
          work_email: string
          work_phone: string
        }
        Insert: {
          allowance?: number | null
          basic_salary?: number | null
          contract_type?: string | null
          created_at?: string
          department: string
          emirates_id?: string | null
          emirates_id_expiry?: string | null
          full_name: string
          hrms_no: string
          id?: string
          job_position: string
          joining_date: string
          leave_balance?: number | null
          manager?: string | null
          nationality?: string | null
          passport_expiry?: string | null
          passport_no?: string | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string
          visa_expiration?: string | null
          visa_no?: string | null
          work_email: string
          work_phone: string
        }
        Update: {
          allowance?: number | null
          basic_salary?: number | null
          contract_type?: string | null
          created_at?: string
          department?: string
          emirates_id?: string | null
          emirates_id_expiry?: string | null
          full_name?: string
          hrms_no?: string
          id?: string
          job_position?: string
          joining_date?: string
          leave_balance?: number | null
          manager?: string | null
          nationality?: string | null
          passport_expiry?: string | null
          passport_no?: string | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string
          visa_expiration?: string | null
          visa_no?: string | null
          work_email?: string
          work_phone?: string
        }
        Relationships: []
      }
      eos_records: {
        Row: {
          basic_salary: number
          created_at: string
          employee_id: string
          gratuity_amount: number
          id: string
          paid: boolean | null
          reason: string | null
          years_of_service: number
        }
        Insert: {
          basic_salary: number
          created_at?: string
          employee_id: string
          gratuity_amount: number
          id?: string
          paid?: boolean | null
          reason?: string | null
          years_of_service: number
        }
        Update: {
          basic_salary?: number
          created_at?: string
          employee_id?: string
          gratuity_amount?: number
          id?: string
          paid?: boolean | null
          reason?: string | null
          years_of_service?: number
        }
        Relationships: [
          {
            foreignKeyName: "eos_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_date: string | null
          end_time: string | null
          event_type: string
          id: string
          is_all_day: boolean | null
          start_date: string
          start_time: string | null
          title: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          start_date: string
          start_time?: string | null
          title: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          start_date?: string
          start_time?: string | null
          title?: string
        }
        Relationships: []
      }
      hr_letters: {
        Row: {
          content: string | null
          created_at: string
          employee_id: string
          file_url: string | null
          id: string
          issued_date: string
          letter_type: string
          status: string | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          employee_id: string
          file_url?: string | null
          id?: string
          issued_date?: string
          letter_type?: string
          status?: string | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          employee_id?: string
          file_url?: string | null
          id?: string
          issued_date?: string
          letter_type?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_letters_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          carried_forward_days: number
          created_at: string
          employee_id: string
          entitled_days: number
          id: string
          leave_type_id: string
          pending_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          carried_forward_days?: number
          created_at?: string
          employee_id: string
          entitled_days?: number
          id?: string
          leave_type_id: string
          pending_days?: number
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          carried_forward_days?: number
          created_at?: string
          employee_id?: string
          entitled_days?: number
          id?: string
          leave_type_id?: string
          pending_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          created_at: string
          days_count: number
          employee_id: string
          end_date: string
          id: string
          is_emergency: boolean | null
          leave_type: string
          leave_type_id: string | null
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string | null
          working_days: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          days_count: number
          employee_id: string
          end_date: string
          id?: string
          is_emergency?: boolean | null
          leave_type: string
          leave_type_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string | null
          working_days?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          is_emergency?: boolean | null
          leave_type?: string
          leave_type_id?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string | null
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_records_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          accrual_type: string | null
          carry_forward_allowed: boolean | null
          code: string
          created_at: string
          description: string | null
          gender_specific: string | null
          id: string
          is_active: boolean | null
          max_carry_forward_days: number | null
          max_days_per_year: number
          min_service_months: number | null
          name: string
          name_arabic: string | null
          paid_type: string
          requires_approval: boolean | null
          requires_documentation: boolean | null
        }
        Insert: {
          accrual_type?: string | null
          carry_forward_allowed?: boolean | null
          code: string
          created_at?: string
          description?: string | null
          gender_specific?: string | null
          id?: string
          is_active?: boolean | null
          max_carry_forward_days?: number | null
          max_days_per_year: number
          min_service_months?: number | null
          name: string
          name_arabic?: string | null
          paid_type?: string
          requires_approval?: boolean | null
          requires_documentation?: boolean | null
        }
        Update: {
          accrual_type?: string | null
          carry_forward_allowed?: boolean | null
          code?: string
          created_at?: string
          description?: string | null
          gender_specific?: string | null
          id?: string
          is_active?: boolean | null
          max_carry_forward_days?: number | null
          max_days_per_year?: number
          min_service_months?: number | null
          name?: string
          name_arabic?: string | null
          paid_type?: string
          requires_approval?: boolean | null
          requires_documentation?: boolean | null
        }
        Relationships: []
      }
      payroll: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string
          deductions: number | null
          employee_id: string
          id: string
          month: string
          net_salary: number
          wps_processed: boolean | null
        }
        Insert: {
          allowances?: number | null
          basic_salary: number
          created_at?: string
          deductions?: number | null
          employee_id: string
          id?: string
          month: string
          net_salary: number
          wps_processed?: boolean | null
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string
          deductions?: number | null
          employee_id?: string
          id?: string
          month?: string
          net_salary?: number
          wps_processed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      public_holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          is_half_day: boolean | null
          name: string
          name_arabic: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_half_day?: boolean | null
          name: string
          name_arabic?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_half_day?: boolean | null
          name?: string
          name_arabic?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
