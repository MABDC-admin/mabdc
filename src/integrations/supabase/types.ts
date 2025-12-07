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
      leave_records: {
        Row: {
          created_at: string
          days_count: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string | null
        }
        Insert: {
          created_at?: string
          days_count: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          start_date: string
          status?: string | null
        }
        Update: {
          created_at?: string
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
