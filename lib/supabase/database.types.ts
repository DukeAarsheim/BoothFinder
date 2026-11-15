// GENERATED FILE. Do not edit by hand.
// Source: live Supabase schema after add_event_organizer_email (20261115045953).
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      discovery_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          queries: string[]
          query_offset: number
          started_at: string
          stats: Json
          trigger: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          queries?: string[]
          query_offset?: number
          started_at?: string
          stats?: Json
          trigger?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          queries?: string[]
          query_offset?: number
          started_at?: string
          stats?: Json
          trigger?: string
        }
        Relationships: []
      }
      event_vendor_lists: {
        Row: {
          created_at: string
          event_id: string
          id: string
          updated_at: string
          vendor_category: string
          vendor_name: string
          year: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
          vendor_category?: string
          vendor_name: string
          year: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
          vendor_category?: string
          vendor_name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_vendor_lists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          application_deadline: string | null
          application_fee: number | null
          apply_url: string | null
          attendance_source: string | null
          booth_fee_max: number | null
          booth_fee_min: number | null
          booth_size: string | null
          city: string | null
          county: string | null
          created_at: string
          created_via: string
          day_type: string | null
          electricity_fee: number | null
          end_date: string | null
          event_type: string
          expected_attendance: number | null
          fee_info_year: number | null
          fee_notes: string | null
          fee_pct_of_sales: number | null
          how_to_apply: string | null
          id: string
          is_sample: boolean
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          organizer_email: string | null
          schedule_notes: string | null
          similar_vendor_limit: string | null
          source_url: string | null
          start_date: string | null
          updated_at: string
          vendor_spots: number | null
          venue: string | null
        }
        Insert: {
          application_deadline?: string | null
          application_fee?: number | null
          apply_url?: string | null
          attendance_source?: string | null
          booth_fee_max?: number | null
          booth_fee_min?: number | null
          booth_size?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          created_via?: string
          day_type?: string | null
          electricity_fee?: number | null
          end_date?: string | null
          event_type?: string
          expected_attendance?: number | null
          fee_info_year?: number | null
          fee_notes?: string | null
          fee_pct_of_sales?: number | null
          how_to_apply?: string | null
          id?: string
          is_sample?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          organizer_email?: string | null
          schedule_notes?: string | null
          similar_vendor_limit?: string | null
          source_url?: string | null
          start_date?: string | null
          updated_at?: string
          vendor_spots?: number | null
          venue?: string | null
        }
        Update: {
          application_deadline?: string | null
          application_fee?: number | null
          apply_url?: string | null
          attendance_source?: string | null
          booth_fee_max?: number | null
          booth_fee_min?: number | null
          booth_size?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          created_via?: string
          day_type?: string | null
          electricity_fee?: number | null
          end_date?: string | null
          event_type?: string
          expected_attendance?: number | null
          fee_info_year?: number | null
          fee_notes?: string | null
          fee_pct_of_sales?: number | null
          how_to_apply?: string | null
          id?: string
          is_sample?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          organizer_email?: string | null
          schedule_notes?: string | null
          similar_vendor_limit?: string | null
          source_url?: string | null
          start_date?: string | null
          updated_at?: string
          vendor_spots?: number | null
          venue?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          audience_fit: number | null
          booth_cost: number | null
          competing_vendors: number | null
          created_at: string
          event_id: string
          id: string
          is_sample: boolean
          organization: number | null
          sales_range: string | null
          traffic: number | null
          updated_at: string
          would_return: boolean | null
        }
        Insert: {
          audience_fit?: number | null
          booth_cost?: number | null
          competing_vendors?: number | null
          created_at?: string
          event_id: string
          id?: string
          is_sample?: boolean
          organization?: number | null
          sales_range?: string | null
          traffic?: number | null
          updated_at?: string
          would_return?: boolean | null
        }
        Update: {
          audience_fit?: number | null
          booth_cost?: number | null
          competing_vendors?: number | null
          created_at?: string
          event_id?: string
          id?: string
          is_sample?: boolean
          organization?: number | null
          sales_range?: string | null
          traffic?: number | null
          updated_at?: string
          would_return?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_opportunities: {
        Row: {
          content_hash: string | null
          created_at: string
          discovered_via: string
          discovery_query: string | null
          dropped_fields: string[]
          event_id: string | null
          evidence: Json
          extracted: Json
          fetched_at: string
          geo_precision: string | null
          has_pricing: boolean
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          organizer_name: string | null
          review_note: string | null
          reviewed_at: string | null
          source_documents: Json
          source_domain: string
          source_title: string | null
          source_url: string
          status: string
          updated_at: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          discovered_via?: string
          discovery_query?: string | null
          dropped_fields?: string[]
          event_id?: string | null
          evidence?: Json
          extracted?: Json
          fetched_at?: string
          geo_precision?: string | null
          has_pricing?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          organizer_name?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          source_documents?: Json
          source_domain: string
          source_title?: string | null
          source_url: string
          status?: string
          updated_at?: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          discovered_via?: string
          discovery_query?: string | null
          dropped_fields?: string[]
          event_id?: string | null
          evidence?: Json
          extracted?: Json
          fetched_at?: string
          geo_precision?: string | null
          has_pricing?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          organizer_name?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          source_documents?: Json
          source_domain?: string
          source_title?: string | null
          source_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_opportunities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
