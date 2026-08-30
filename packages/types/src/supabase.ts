// AUTO-GENERATED — do not hand-edit.
// Regenerate with: pnpm gen:types  (or supabase gen types typescript --project-id amveuzvlhbttqbldjqye --schema public)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          avatar_url: string | null
          bio: string | null
          company: string | null
          cover_url: string | null
          created_at: string
          designation: string | null
          direct_link_url: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          lead_capture_config: Json | null
          lead_capture_enabled: boolean | null
          logo_url: string | null
          owner_id: string
          template_locked: boolean | null
          theme: Json | null
          updated_at: string
          username: string
          view_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          cover_url?: string | null
          created_at?: string
          designation?: string | null
          direct_link_url?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          lead_capture_config?: Json | null
          lead_capture_enabled?: boolean | null
          logo_url?: string | null
          owner_id: string
          template_locked?: boolean | null
          theme?: Json | null
          updated_at?: string
          username: string
          view_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          cover_url?: string | null
          created_at?: string
          designation?: string | null
          direct_link_url?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          lead_capture_config?: Json | null
          lead_capture_enabled?: boolean | null
          logo_url?: string | null
          owner_id?: string
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
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
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
