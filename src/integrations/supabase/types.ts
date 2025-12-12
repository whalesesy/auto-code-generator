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
      device_requests: {
        Row: {
          approved_at: string | null
          approver_comments: string | null
          approver_id: string | null
          created_at: string
          device_category: Database["public"]["Enums"]["device_category"]
          device_id: string | null
          device_model: string | null
          device_type: string
          duration: string
          expected_return_date: string | null
          id: string
          issued_at: string | null
          needed_date: string
          pickup_location: string | null
          pickup_time: string | null
          purpose: string
          quantity: number
          requester_id: string
          returned_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_comments?: string | null
          approver_id?: string | null
          created_at?: string
          device_category: Database["public"]["Enums"]["device_category"]
          device_id?: string | null
          device_model?: string | null
          device_type: string
          duration: string
          expected_return_date?: string | null
          id?: string
          issued_at?: string | null
          needed_date: string
          pickup_location?: string | null
          pickup_time?: string | null
          purpose: string
          quantity?: number
          requester_id: string
          returned_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_comments?: string | null
          approver_id?: string | null
          created_at?: string
          device_category?: Database["public"]["Enums"]["device_category"]
          device_id?: string | null
          device_model?: string | null
          device_type?: string
          duration?: string
          expected_return_date?: string | null
          id?: string
          issued_at?: string | null
          needed_date?: string
          pickup_location?: string | null
          pickup_time?: string | null
          purpose?: string
          quantity?: number
          requester_id?: string
          returned_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_requests_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_requests_requester_id_profiles_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devices: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["device_category"]
          created_at: string
          id: string
          location: string | null
          model: string | null
          name: string
          notes: string | null
          serial_number: string | null
          specifications: Json | null
          status: Database["public"]["Enums"]["device_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["device_category"]
          created_at?: string
          id?: string
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["device_category"]
          created_at?: string
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["device_status"]
          updated_at?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempt_count: number | null
          email: string
          first_attempt_at: string
          id: string
          ip_address: string | null
          last_attempt_at: string
          locked_until: string | null
        }
        Insert: {
          attempt_count?: number | null
          email: string
          first_attempt_at?: string
          id?: string
          ip_address?: string | null
          last_attempt_at?: string
          locked_until?: string | null
        }
        Update: {
          attempt_count?: number | null
          email?: string
          first_attempt_at?: string
          id?: string
          ip_address?: string | null
          last_attempt_at?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          encrypted_content: string | null
          id: string
          message: string
          recipient_id: string | null
          recipient_type: string
          sender_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          encrypted_content?: string | null
          id?: string
          message: string
          recipient_id?: string | null
          recipient_type: string
          sender_id: string
          subject: string
        }
        Update: {
          created_at?: string
          encrypted_content?: string | null
          id?: string
          message?: string
          recipient_id?: string | null
          recipient_type?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_request_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_request_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_request_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "device_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          is_approved: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          is_approved?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_approved?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          action_type: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string
        }
        Update: {
          action_type?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: []
      }
      request_tickets: {
        Row: {
          created_at: string
          encrypted_data: string | null
          id: string
          request_id: string
          status: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_data?: string | null
          id?: string
          request_id: string
          status?: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_data?: string | null
          id?: string
          request_id?: string
          status?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_tickets_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "device_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signup_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          rejection_reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          device_id: string
          id: string
          movement_type: string
          performed_by: string
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          movement_type: string
          performed_by: string
          quantity?: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          movement_type?: string
          performed_by?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          encrypted_details: string | null
          id: string
          ip_address: string | null
          performed_by: string
          ticket_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          encrypted_details?: string | null
          id?: string
          ip_address?: string | null
          performed_by: string
          ticket_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          encrypted_details?: string | null
          id?: string
          ip_address?: string | null
          performed_by?: string
          ticket_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_audit_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "request_tickets"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_totp_secrets: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          encrypted_secret: string
          id: string
          is_enabled: boolean | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          encrypted_secret: string
          id?: string
          is_enabled?: boolean | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          encrypted_secret?: string
          id?: string
          is_enabled?: boolean | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_login_attempts: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: {
          attempts_remaining: number
          is_locked: boolean
          locked_until: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_identifier: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: {
          is_limited: boolean
          requests_remaining: number
          reset_at: string
        }[]
      }
      clear_failed_logins: { Args: { p_email: string }; Returns: undefined }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_email?: string
          p_event_type: string
          p_ip_address?: string
          p_metadata?: Json
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      record_failed_login: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: {
          attempts_remaining: number
          is_now_locked: boolean
          locked_until: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "approver" | "staff"
      device_category:
        | "computing"
        | "mobile"
        | "peripherals"
        | "networking"
        | "audio_visual"
        | "other"
      device_status: "available" | "issued" | "maintenance" | "damaged" | "lost"
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "issued"
        | "returned"
        | "pending_return"
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
      app_role: ["admin", "approver", "staff"],
      device_category: [
        "computing",
        "mobile",
        "peripherals",
        "networking",
        "audio_visual",
        "other",
      ],
      device_status: ["available", "issued", "maintenance", "damaged", "lost"],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "issued",
        "returned",
        "pending_return",
      ],
    },
  },
} as const
