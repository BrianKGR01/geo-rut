// Generado desde el esquema real de Supabase (mcp generate_typescript_types) el 2026-09-21.
// No editar a mano: si el esquema cambia, regenerar con el MCP de Supabase y volver a pegar.

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
      admins: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          display_name: string | null
          invited_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string | null
          invited_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string | null
          invited_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      claim_rate_limit_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          ip: string
        }
        Update: {
          attempted_at?: string
          id?: never
          ip?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      route_driver_sessions: {
        Row: {
          claimed_at: string
          driver_user_id: string
          route_id: string
        }
        Insert: {
          claimed_at?: string
          driver_user_id: string
          route_id: string
        }
        Update: {
          claimed_at?: string
          driver_user_id?: string
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_driver_sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stop_images: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          route_stop_id: string
          storage_path: string
          uploaded_by: string
          uploaded_role: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          route_stop_id: string
          storage_path: string
          uploaded_by: string
          uploaded_role: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          route_stop_id?: string
          storage_path?: string
          uploaded_by?: string
          uploaded_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stop_images_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stop_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          position: number
          quantity: number | null
          route_stop_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          id?: string
          position?: number
          quantity?: number | null
          route_stop_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          position?: number
          quantity?: number | null
          route_stop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stop_items_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          arrived_at: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          delivered_at: string | null
          id: string
          lat: number
          lng: number
          name: string
          note: string | null
          pedido_monto: number | null
          position: number
          route_id: string
          status: string
          store_id: string | null
        }
        Insert: {
          arrived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          note?: string | null
          pedido_monto?: number | null
          position: number
          route_id: string
          status?: string
          store_id?: string | null
        }
        Update: {
          arrived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          note?: string | null
          pedido_monto?: number | null
          position?: number
          route_id?: string
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          driver_code: string
          driver_id: string | null
          finished_at: string | null
          id: string
          legs_cache: Json | null
          order_mode: string
          start_point: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          driver_code: string
          driver_id?: string | null
          finished_at?: string | null
          id?: string
          legs_cache?: Json | null
          order_mode?: string
          start_point?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          driver_code?: string
          driver_id?: string | null
          finished_at?: string | null
          id?: string
          legs_cache?: Json | null
          order_mode?: string
          start_point?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_images: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          storage_path: string
          store_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          storage_path: string
          store_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          storage_path?: string
          store_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          coords_source: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          lat: number
          lng: number
          name: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          coords_source: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          coords_source?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      chofer_update_stop: {
        Args: {
          p_arrived_at?: string
          p_delivered_at?: string
          p_note?: string
          p_route_stop_id: string
          p_status: string
        }
        Returns: undefined
      }
      has_claimed_route: { Args: { p_route_id: string }; Returns: boolean }
      is_active_admin: { Args: never; Returns: boolean }
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
