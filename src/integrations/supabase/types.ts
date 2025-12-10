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
          id: string
          issued_at: string | null
          needed_date: string
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
          id?: string
          issued_at?: string | null
          needed_date: string
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
          id?: string
          issued_at?: string | null
          needed_date?: string
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
        Relationships: []
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
          phone?: string | null
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      request_status: ["pending", "approved", "rejected", "issued", "returned"],
    },
  },
} as const
