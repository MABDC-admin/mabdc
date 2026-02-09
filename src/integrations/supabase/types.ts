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
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          priority: string
          published_at: string | null
          send_push: boolean
          target_departments: string[] | null
          target_employee_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published_at?: string | null
          send_push?: boolean
          target_departments?: string[] | null
          target_employee_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published_at?: string | null
          send_push?: boolean
          target_departments?: string[] | null
          target_employee_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          admin_remarks: string | null
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          employee_remarks: string | null
          id: string
          modified_at: string | null
          modified_by: string | null
          status: string | null
        }
        Insert: {
          admin_remarks?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          employee_remarks?: string | null
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          status?: string | null
        }
        Update: {
          admin_remarks?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          employee_remarks?: string | null
          id?: string
          modified_at?: string | null
          modified_by?: string | null
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
      attendance_appeals: {
        Row: {
          appeal_date: string
          appeal_message: string
          attendance_id: string | null
          created_at: string
          employee_id: string
          id: string
          rejection_reason: string | null
          requested_check_in: string | null
          requested_check_out: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          appeal_date: string
          appeal_message: string
          attendance_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          rejection_reason?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          appeal_date?: string
          appeal_message?: string
          attendance_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          rejection_reason?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_appeals_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_appeals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string
          id: string
          ip_address: unknown
          level: string
          metadata: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: unknown
          level: string
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: unknown
          level?: string
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_files: {
        Row: {
          created_at: string
          file_size: string | null
          file_type: string
          file_url: string
          folder_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_size?: string | null
          file_type: string
          file_url: string
          folder_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_size?: string | null
          file_type?: string
          file_url?: string
          folder_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "company_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      company_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "company_folders"
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
          expiry_notification_days: number | null
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
          expiry_notification_days?: number | null
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
          expiry_notification_days?: number | null
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
          housing_allowance: number | null
          id: string
          job_title_arabic: string | null
          mohre_contract_no: string
          notice_period: number | null
          page1_url: string | null
          page2_url: string | null
          probation_period: number | null
          start_date: string
          status: string | null
          ticket_allowance: number | null
          total_salary: number | null
          transportation_allowance: number | null
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
          housing_allowance?: number | null
          id?: string
          job_title_arabic?: string | null
          mohre_contract_no: string
          notice_period?: number | null
          page1_url?: string | null
          page2_url?: string | null
          probation_period?: number | null
          start_date: string
          status?: string | null
          ticket_allowance?: number | null
          total_salary?: number | null
          transportation_allowance?: number | null
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
          housing_allowance?: number | null
          id?: string
          job_title_arabic?: string | null
          mohre_contract_no?: string
          notice_period?: number | null
          page1_url?: string | null
          page2_url?: string | null
          probation_period?: number | null
          start_date?: string
          status?: string | null
          ticket_allowance?: number | null
          total_salary?: number | null
          transportation_allowance?: number | null
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
      document_types: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          name_arabic: string | null
          requires_expiry: boolean | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          name_arabic?: string | null
          requires_expiry?: boolean | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          name_arabic?: string | null
          requires_expiry?: boolean | null
        }
        Relationships: []
      }
      email_approval_tokens: {
        Row: {
          action: string
          created_at: string
          expires_at: string
          id: string
          request_id: string
          request_type: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          expires_at?: string
          id?: string
          request_id: string
          request_type: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          expires_at?: string
          id?: string
          request_id?: string
          request_type?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      email_history: {
        Row: {
          created_at: string
          delivered_at: string | null
          email_type: string
          employee_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          resend_id: string | null
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          employee_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          employee_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_badges: {
        Row: {
          badge_id: string
          earned_at: string
          employee_id: string
          id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          employee_id: string
          id?: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "gamification_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_badges_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_corrective_actions: {
        Row: {
          action_type: string
          created_at: string
          document_name: string | null
          document_url: string | null
          employee_id: string
          id: string
          issued_by: string | null
          issued_date: string
          notes: string | null
          reason: string
          status: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          employee_id: string
          id?: string
          issued_by?: string | null
          issued_date?: string
          notes?: string | null
          reason: string
          status?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          employee_id?: string
          id?: string
          issued_by?: string | null
          issued_date?: string
          notes?: string | null
          reason?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_corrective_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_discipline: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string
          document_name: string | null
          document_url: string | null
          employee_id: string
          id: string
          incident_date: string
          incident_type: string
          issued_by: string | null
          status: string | null
          suspension_end_date: string | null
          suspension_start_date: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description: string
          document_name?: string | null
          document_url?: string | null
          employee_id: string
          id?: string
          incident_date?: string
          incident_type: string
          issued_by?: string | null
          status?: string | null
          suspension_end_date?: string | null
          suspension_start_date?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string
          document_name?: string | null
          document_url?: string | null
          employee_id?: string
          id?: string
          incident_date?: string
          incident_type?: string
          issued_by?: string | null
          status?: string | null
          suspension_end_date?: string | null
          suspension_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_discipline_employee_id_fkey"
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
          document_type_id: string | null
          employee_id: string
          expiry_date: string | null
          file_size: string | null
          file_type: string
          file_url: string
          id: string
          is_renewed: boolean | null
          name: string
          previous_document_id: string | null
          renewed_at: string | null
          renewed_document_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          document_type_id?: string | null
          employee_id: string
          expiry_date?: string | null
          file_size?: string | null
          file_type: string
          file_url: string
          id?: string
          is_renewed?: boolean | null
          name: string
          previous_document_id?: string | null
          renewed_at?: string | null
          renewed_document_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          document_type_id?: string | null
          employee_id?: string
          expiry_date?: string | null
          file_size?: string | null
          file_type?: string
          file_url?: string
          id?: string
          is_renewed?: boolean | null
          name?: string
          previous_document_id?: string | null
          renewed_at?: string | null
          renewed_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_previous_document_id_fkey"
            columns: ["previous_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_renewed_document_id_fkey"
            columns: ["renewed_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_education: {
        Row: {
          certificate_level: string
          created_at: string
          employee_id: string
          field_of_study: string | null
          graduation_year: number | null
          id: string
          school: string | null
        }
        Insert: {
          certificate_level: string
          created_at?: string
          employee_id: string
          field_of_study?: string | null
          graduation_year?: number | null
          id?: string
          school?: string | null
        }
        Update: {
          certificate_level?: string
          created_at?: string
          employee_id?: string
          field_of_study?: string | null
          graduation_year?: number | null
          id?: string
          school?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_education_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_face_data: {
        Row: {
          created_at: string
          employee_id: string
          face_descriptor: Json
          id: string
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          face_descriptor: Json
          id?: string
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          face_descriptor?: Json
          id?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_face_data_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_performance: {
        Row: {
          comments: string | null
          created_at: string
          employee_id: string
          id: string
          performance_type: string
          rating: number | null
          review_period: string
          reviewer: string | null
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          employee_id: string
          id?: string
          performance_type: string
          rating?: number | null
          review_period: string
          reviewer?: string | null
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          performance_type?: string
          rating?: number | null
          review_period?: string
          reviewer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_performance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shift_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          override_date: string
          reason: string | null
          shift_end_time: string
          shift_start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          override_date: string
          reason?: string | null
          shift_end_time: string
          shift_start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          override_date?: string
          reason?: string | null
          shift_end_time?: string
          shift_start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shift_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          shift_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          shift_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          shift_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          allowance: number | null
          bank_account_no: string | null
          bank_name: string | null
          basic_salary: number | null
          birthday: string | null
          contract_type: string | null
          country_of_birth: string | null
          created_at: string
          current_address: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          department: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          emirates_id: string | null
          emirates_id_expiry: string | null
          family_status: string | null
          full_name: string
          gender: string | null
          hrms_no: string
          iban: string | null
          id: string
          job_position: string
          joining_date: string
          last_working_day: string | null
          leave_balance: number | null
          manager: string | null
          nationality: string | null
          number_of_children: number | null
          passport_expiry: string | null
          passport_no: string | null
          personal_email: string | null
          personal_phone: string | null
          photo_url: string | null
          place_of_birth: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          visa_expiration: string | null
          visa_no: string | null
          work_email: string
          work_phone: string
        }
        Insert: {
          allowance?: number | null
          bank_account_no?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          birthday?: string | null
          contract_type?: string | null
          country_of_birth?: string | null
          created_at?: string
          current_address?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          department: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emirates_id?: string | null
          emirates_id_expiry?: string | null
          family_status?: string | null
          full_name: string
          gender?: string | null
          hrms_no: string
          iban?: string | null
          id?: string
          job_position: string
          joining_date: string
          last_working_day?: string | null
          leave_balance?: number | null
          manager?: string | null
          nationality?: string | null
          number_of_children?: number | null
          passport_expiry?: string | null
          passport_no?: string | null
          personal_email?: string | null
          personal_phone?: string | null
          photo_url?: string | null
          place_of_birth?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          visa_expiration?: string | null
          visa_no?: string | null
          work_email: string
          work_phone: string
        }
        Update: {
          allowance?: number | null
          bank_account_no?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          birthday?: string | null
          contract_type?: string | null
          country_of_birth?: string | null
          created_at?: string
          current_address?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          department?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          emirates_id?: string | null
          emirates_id_expiry?: string | null
          family_status?: string | null
          full_name?: string
          gender?: string | null
          hrms_no?: string
          iban?: string | null
          id?: string
          job_position?: string
          joining_date?: string
          last_working_day?: string | null
          leave_balance?: number | null
          manager?: string | null
          nationality?: string | null
          number_of_children?: number | null
          passport_expiry?: string | null
          passport_no?: string | null
          personal_email?: string | null
          personal_phone?: string | null
          photo_url?: string | null
          place_of_birth?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
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
      gamification_badges: {
        Row: {
          category: string
          condition_type: string | null
          condition_value: number | null
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          points_required: number | null
        }
        Insert: {
          category?: string
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          points_required?: number | null
        }
        Update: {
          category?: string
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number | null
        }
        Relationships: []
      }
      gamification_config: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          points: number
          updated_at: string
          xp: number
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          points?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          points?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      gamification_points: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          level: number
          level_name: string
          perfect_months: number
          perfect_weeks: number
          points: number
          streak_days: number
          updated_at: string
          xp: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          level?: number
          level_name?: string
          perfect_months?: number
          perfect_weeks?: number
          points?: number
          streak_days?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          level?: number
          level_name?: string
          perfect_months?: number
          perfect_weeks?: number
          points?: number
          streak_days?: number
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamification_points_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_transactions: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          employee_id: string
          id: string
          points: number
          xp: number
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          points: number
          xp?: number
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          points?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamification_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      leave_accrual_log: {
        Row: {
          accrual_date: string
          accrual_month: number
          accrual_rate: number
          accrual_year: number
          created_at: string
          days_accrued: number
          employee_id: string
          id: string
          joining_date: string
          leave_balance_id: string
          months_of_service: number
        }
        Insert: {
          accrual_date: string
          accrual_month: number
          accrual_rate: number
          accrual_year: number
          created_at?: string
          days_accrued: number
          employee_id: string
          id?: string
          joining_date: string
          leave_balance_id: string
          months_of_service: number
        }
        Update: {
          accrual_date?: string
          accrual_month?: number
          accrual_rate?: number
          accrual_year?: number
          created_at?: string
          days_accrued?: number
          employee_id?: string
          id?: string
          joining_date?: string
          leave_balance_id?: string
          months_of_service?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_accrual_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_accrual_log_leave_balance_id_fkey"
            columns: ["leave_balance_id"]
            isOneToOne: false
            referencedRelation: "leave_balances"
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
      notification_preferences: {
        Row: {
          announcements: boolean
          attendance_reminders: boolean
          created_at: string
          document_expiry: boolean
          id: string
          leave_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          announcements?: boolean
          attendance_reminders?: boolean
          created_at?: string
          document_expiry?: boolean
          id?: string
          leave_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          announcements?: boolean
          attendance_reminders?: boolean
          created_at?: string
          document_expiry?: boolean
          id?: string
          leave_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          data: Json | null
          id: string
          read: boolean
          read_at: string | null
          sent_at: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          data?: Json | null
          id?: string
          read?: boolean
          read_at?: string | null
          sent_at?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          data?: Json | null
          id?: string
          read?: boolean
          read_at?: string | null
          sent_at?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      org_chart_positions: {
        Row: {
          created_at: string
          employee_id: string | null
          holder_name: string | null
          id: string
          level: number
          parent_id: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          holder_name?: string | null
          id?: string
          level?: number
          parent_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          holder_name?: string | null
          id?: string
          level?: number
          parent_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_chart_positions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_positions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_chart_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string
          deduction_reason: string | null
          deductions: number | null
          employee_id: string
          housing_allowance: number | null
          id: string
          lop_days: number | null
          lop_deduction: number | null
          month: string
          net_salary: number
          other_allowances: number | null
          ticket_allowance: number | null
          transportation_allowance: number | null
          wps_processed: boolean | null
        }
        Insert: {
          allowances?: number | null
          basic_salary: number
          created_at?: string
          deduction_reason?: string | null
          deductions?: number | null
          employee_id: string
          housing_allowance?: number | null
          id?: string
          lop_days?: number | null
          lop_deduction?: number | null
          month: string
          net_salary: number
          other_allowances?: number | null
          ticket_allowance?: number | null
          transportation_allowance?: number | null
          wps_processed?: boolean | null
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string
          deduction_reason?: string | null
          deductions?: number | null
          employee_id?: string
          housing_allowance?: number | null
          id?: string
          lop_days?: number | null
          lop_deduction?: number | null
          month?: string
          net_salary?: number
          other_allowances?: number | null
          ticket_allowance?: number | null
          transportation_allowance?: number | null
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
      payroll_deductions: {
        Row: {
          amount: number
          created_at: string | null
          days: number | null
          deduction_type: string
          id: string
          payroll_id: string
          reason: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          days?: number | null
          deduction_type: string
          id?: string
          payroll_id: string
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          days?: number | null
          deduction_type?: string
          id?: string
          payroll_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_deductions_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_earnings: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          earning_type: string
          id: string
          payroll_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          earning_type: string
          id?: string
          payroll_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          earning_type?: string
          id?: string
          payroll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_earnings_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_deletions: {
        Row: {
          approval_token: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          record_data: Json
          record_id: string
          record_type: string
          requested_at: string | null
          requested_by: string | null
          requested_by_email: string | null
          status: string | null
        }
        Insert: {
          approval_token?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          record_data: Json
          record_id: string
          record_type: string
          requested_at?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
          status?: string | null
        }
        Update: {
          approval_token?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          record_data?: Json
          record_id?: string
          record_type?: string
          requested_at?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
          status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_name: string | null
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_name?: string | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_name?: string | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_allowance_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          performed_by: string | null
          ticket_allowance_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          ticket_allowance_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          ticket_allowance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_allowance_audit_log_ticket_allowance_id_fkey"
            columns: ["ticket_allowance_id"]
            isOneToOne: false
            referencedRelation: "ticket_allowance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_allowance_records: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          eligibility_start_date: string
          eligibility_year: number
          employee_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_in_payroll_id: string | null
          reminder_active: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          eligibility_start_date: string
          eligibility_year: number
          employee_id: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_in_payroll_id?: string | null
          reminder_active?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          eligibility_start_date?: string
          eligibility_year?: number
          employee_id?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_in_payroll_id?: string | null
          reminder_active?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_allowance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_allowance_records_processed_in_payroll_id_fkey"
            columns: ["processed_in_payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll"
            referencedColumns: ["id"]
          },
        ]
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visa_applications: {
        Row: {
          created_at: string
          created_by: string | null
          current_stage: string
          daman_applied_at: string | null
          daman_approved_at: string | null
          daman_cost: number | null
          daman_policy_no: string | null
          daman_required: boolean | null
          daman_status: string | null
          emirates_id_applied: boolean | null
          emirates_id_ref_no: string | null
          employee_id: string
          id: string
          immigration_approved_at: string | null
          immigration_cost: number | null
          immigration_expected_date: string | null
          immigration_required: boolean | null
          immigration_status: string | null
          immigration_submitted_at: string | null
          labour_card_amount: number | null
          labour_card_paid: boolean | null
          labour_card_payment_date: string | null
          medical_completed_at: string | null
          medical_cost: number | null
          medical_required: boolean | null
          medical_result: string | null
          medical_scheduled_date: string | null
          medical_status: string | null
          mohre_application_no: string | null
          mohre_approved_at: string | null
          mohre_cost: number | null
          mohre_status: string | null
          mohre_submitted_at: string | null
          notes: string | null
          onboarding_checklist: Json | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          residence_visa_applied_at: string | null
          residence_visa_cost: number | null
          residence_visa_no: string | null
          residence_visa_stamped_at: string | null
          residence_visa_status: string | null
          stage_entered_at: string
          tawjeeh_completed: boolean | null
          tawjeeh_completed_at: string | null
          tawjeeh_cost: number | null
          tawjeeh_required: boolean | null
          updated_at: string
          visa_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_stage?: string
          daman_applied_at?: string | null
          daman_approved_at?: string | null
          daman_cost?: number | null
          daman_policy_no?: string | null
          daman_required?: boolean | null
          daman_status?: string | null
          emirates_id_applied?: boolean | null
          emirates_id_ref_no?: string | null
          employee_id: string
          id?: string
          immigration_approved_at?: string | null
          immigration_cost?: number | null
          immigration_expected_date?: string | null
          immigration_required?: boolean | null
          immigration_status?: string | null
          immigration_submitted_at?: string | null
          labour_card_amount?: number | null
          labour_card_paid?: boolean | null
          labour_card_payment_date?: string | null
          medical_completed_at?: string | null
          medical_cost?: number | null
          medical_required?: boolean | null
          medical_result?: string | null
          medical_scheduled_date?: string | null
          medical_status?: string | null
          mohre_application_no?: string | null
          mohre_approved_at?: string | null
          mohre_cost?: number | null
          mohre_status?: string | null
          mohre_submitted_at?: string | null
          notes?: string | null
          onboarding_checklist?: Json | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          residence_visa_applied_at?: string | null
          residence_visa_cost?: number | null
          residence_visa_no?: string | null
          residence_visa_stamped_at?: string | null
          residence_visa_status?: string | null
          stage_entered_at?: string
          tawjeeh_completed?: boolean | null
          tawjeeh_completed_at?: string | null
          tawjeeh_cost?: number | null
          tawjeeh_required?: boolean | null
          updated_at?: string
          visa_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_stage?: string
          daman_applied_at?: string | null
          daman_approved_at?: string | null
          daman_cost?: number | null
          daman_policy_no?: string | null
          daman_required?: boolean | null
          daman_status?: string | null
          emirates_id_applied?: boolean | null
          emirates_id_ref_no?: string | null
          employee_id?: string
          id?: string
          immigration_approved_at?: string | null
          immigration_cost?: number | null
          immigration_expected_date?: string | null
          immigration_required?: boolean | null
          immigration_status?: string | null
          immigration_submitted_at?: string | null
          labour_card_amount?: number | null
          labour_card_paid?: boolean | null
          labour_card_payment_date?: string | null
          medical_completed_at?: string | null
          medical_cost?: number | null
          medical_required?: boolean | null
          medical_result?: string | null
          medical_scheduled_date?: string | null
          medical_status?: string | null
          mohre_application_no?: string | null
          mohre_approved_at?: string | null
          mohre_cost?: number | null
          mohre_status?: string | null
          mohre_submitted_at?: string | null
          notes?: string | null
          onboarding_checklist?: Json | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          residence_visa_applied_at?: string | null
          residence_visa_cost?: number | null
          residence_visa_no?: string | null
          residence_visa_stamped_at?: string | null
          residence_visa_status?: string | null
          stage_entered_at?: string
          tawjeeh_completed?: boolean | null
          tawjeeh_completed_at?: string | null
          tawjeeh_cost?: number | null
          tawjeeh_required?: boolean | null
          updated_at?: string
          visa_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_stage_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          to_stage: string
          visa_application_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage: string
          visa_application_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage?: string
          visa_application_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_stage_history_visa_application_id_fkey"
            columns: ["visa_application_id"]
            isOneToOne: false
            referencedRelation: "visa_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      audit_log_summary: {
        Row: {
          action: string | null
          event_count: number | null
          level: string | null
          log_date: string | null
          unique_users: number | null
        }
        Relationships: []
      }
      contract_integrity_violations: {
        Row: {
          active_contract_count: number | null
          description: string | null
          employee_id: string | null
          full_name: string | null
          issue_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_tenure_based_leave:
        | { Args: { emp_joining_date: string }; Returns: number }
        | {
            Args: { p_as_of_date?: string; p_joining_date: string }
            Returns: number
          }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pg_advisory_lock: { Args: { key: number }; Returns: boolean }
      pg_advisory_locked: { Args: { key: number }; Returns: boolean }
      pg_advisory_unlock: { Args: { key: number }; Returns: boolean }
      pg_try_advisory_lock: { Args: { key: number }; Returns: boolean }
      process_monthly_leave_accrual: {
        Args: { target_month?: number; target_year?: number }
        Returns: Json
      }
      validate_contract_integrity: {
        Args: never
        Returns: {
          active_contract_count: number
          employee_id: string
          issue_type: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "hr" | "employee"
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
    Enums: {
      app_role: ["admin", "hr", "employee"],
    },
  },
} as const
