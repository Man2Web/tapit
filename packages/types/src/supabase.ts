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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      leads: {
        Row: {
          company: string | null
          created_at: string
          designation: string | null
          email: string | null
          id: string
          meta: Json | null
          name: string | null
          notes: string | null
          phone: string | null
          profile_id: string
          source: string
          status: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          meta?: Json | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          profile_id: string
          source?: string
          status?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          meta?: Json | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          profile_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_events: {
        Row: {
          created_at: string
          event: string
          id: number
          link_id: string | null
          profile_id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          link_id?: string | null
          profile_id: string
          source?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          link_id?: string | null
          profile_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "profile_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_links: {
        Row: {
          click_count: number | null
          created_at: string
          icon: string | null
          id: string
          is_visible: boolean | null
          kind: Database["public"]["Enums"]["link_kind"]
          label: string
          platform: string | null
          position: number
          profile_id: string
          value: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string
          icon?: string | null
          id?: string
          is_visible?: boolean | null
          kind: Database["public"]["Enums"]["link_kind"]
          label: string
          platform?: string | null
          position?: number
          profile_id: string
          value: string
        }
        Update: {
          click_count?: number | null
          created_at?: string
          icon?: string | null
          id?: string
          is_visible?: boolean | null
          kind?: Database["public"]["Enums"]["link_kind"]
          label?: string
          platform?: string | null
          position?: number
          profile_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accreditations: string | null
          avatar_url: string | null
          bio: string | null
          company: string | null
          cover_url: string | null
          created_at: string
          department: string | null
          designation: string | null
          direct_link_url: string | null
          display_name: string
          first_name: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_name: string | null
          lead_capture_config: Json | null
          lead_capture_enabled: boolean | null
          logo_url: string | null
          owner_id: string
          pronouns: string | null
          template_locked: boolean | null
          theme: Json | null
          updated_at: string
          username: string
          view_count: number | null
        }
        Insert: {
          accreditations?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          cover_url?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          direct_link_url?: string | null
          display_name: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_name?: string | null
          lead_capture_config?: Json | null
          lead_capture_enabled?: boolean | null
          logo_url?: string | null
          owner_id: string
          pronouns?: string | null
          template_locked?: boolean | null
          theme?: Json | null
          updated_at?: string
          username: string
          view_count?: number | null
        }
        Update: {
          accreditations?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          cover_url?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          direct_link_url?: string | null
          display_name?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_name?: string | null
          lead_capture_config?: Json | null
          lead_capture_enabled?: boolean | null
          logo_url?: string | null
          owner_id?: string
          pronouns?: string | null
          template_locked?: boolean | null
          theme?: Json | null
          updated_at?: string
          username?: string
          view_count?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_done: boolean | null
          phone: string | null
          plan: string
          plan_expires_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_done?: boolean | null
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_done?: boolean | null
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
      get_profile_insights: {
        Args: never
        Returns: {
          qr_views: number
          vcard_saves: number
          views: number
        }[]
      }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      log_profile_event: {
        Args: { p_event: string; p_source?: string; p_username: string }
        Returns: undefined
      }
      submit_lead: {
        Args: {
          p_company?: string
          p_designation?: string
          p_email?: string
          p_name?: string
          p_notes?: string
          p_phone?: string
          p_source?: string
          p_username: string
        }
        Returns: undefined
      }
    }
    Enums: {
      link_kind:
        | "phone"
        | "whatsapp"
        | "email"
        | "website"
        | "address"
        | "upi"
        | "payment"
        | "social"
        | "file"
        | "video"
        | "calendar"
        | "custom"
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
      link_kind: [
        "phone",
        "whatsapp",
        "email",
        "website",
        "address",
        "upi",
        "payment",
        "social",
        "file",
        "video",
        "calendar",
        "custom",
      ],
    },
  },
} as const
