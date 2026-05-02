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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      client_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      google_calendar_connections: {
        Row: {
          access_token: string
          created_at: string
          google_email: string
          id: string
          last_synced_at: string | null
          mirror_enabled: boolean
          mirror_label: string
          mirror_target_calendar_id: string
          mirror_visibility: string
          refresh_token: string
          selected_calendars: Json | null
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email: string
          id?: string
          last_synced_at?: string | null
          mirror_enabled?: boolean
          mirror_label?: string
          mirror_target_calendar_id?: string
          mirror_visibility?: string
          refresh_token: string
          selected_calendars?: Json | null
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string
          id?: string
          last_synced_at?: string | null
          mirror_enabled?: boolean
          mirror_label?: string
          mirror_target_calendar_id?: string
          mirror_visibility?: string
          refresh_token?: string
          selected_calendars?: Json | null
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_calendar_events: {
        Row: {
          all_day: boolean | null
          calendar_id: string
          color: string | null
          connection_id: string
          created_at: string
          description: string | null
          end_time: string
          google_event_id: string
          id: string
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          calendar_id: string
          color?: string | null
          connection_id: string
          created_at?: string
          description?: string | null
          end_time: string
          google_event_id: string
          id?: string
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          calendar_id?: string
          color?: string | null
          connection_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          google_event_id?: string
          id?: string
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "google_calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          day: number
          description: string
          id: string
          is_builtin: boolean
          kind: string
          month: number
          name: string
          recurring: boolean
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          day: number
          description?: string
          id?: string
          is_builtin?: boolean
          kind?: string
          month: number
          name: string
          recurring?: boolean
          title?: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          day?: number
          description?: string
          id?: string
          is_builtin?: boolean
          kind?: string
          month?: number
          name?: string
          recurring?: boolean
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      llm_config: {
        Row: {
          active_provider: string
          cloud_api_endpoint: string | null
          cloud_api_key: string | null
          cloud_model: string | null
          created_at: string
          id: string
          local_api_endpoint: string | null
          local_model: string | null
          updated_at: string
        }
        Insert: {
          active_provider?: string
          cloud_api_endpoint?: string | null
          cloud_api_key?: string | null
          cloud_model?: string | null
          created_at?: string
          id?: string
          local_api_endpoint?: string | null
          local_model?: string | null
          updated_at?: string
        }
        Update: {
          active_provider?: string
          cloud_api_endpoint?: string | null
          cloud_api_key?: string | null
          cloud_model?: string | null
          created_at?: string
          id?: string
          local_api_endpoint?: string | null
          local_model?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      reminder_queue: {
        Row: {
          body: string
          created_at: string
          fire_at: string
          id: string
          sent_at: string | null
          tag: string
          task_id: string
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          fire_at: string
          id?: string
          sent_at?: string | null
          tag: string
          task_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          fire_at?: string
          id?: string
          sent_at?: string | null
          tag?: string
          task_id?: string
          title?: string
        }
        Relationships: []
      }
      task_calendar_mirrors: {
        Row: {
          calendar_id: string
          connection_id: string
          created_at: string
          google_event_id: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          connection_id: string
          created_at?: string
          google_event_id: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          connection_id?: string
          created_at?: string
          google_event_id?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          client_tag_id: string | null
          created_at: string
          description: string | null
          follow_up_message: string | null
          id: string
          parent_task_id: string | null
          priority: number | null
          reminder_minutes: number | null
          scheduled_date: string | null
          scheduled_start_time: string | null
          status: string
          task_kind: string
          time_estimate: number
          title: string
          updated_at: string
        }
        Insert: {
          client_tag_id?: string | null
          created_at?: string
          description?: string | null
          follow_up_message?: string | null
          id?: string
          parent_task_id?: string | null
          priority?: number | null
          reminder_minutes?: number | null
          scheduled_date?: string | null
          scheduled_start_time?: string | null
          status?: string
          task_kind?: string
          time_estimate?: number
          title: string
          updated_at?: string
        }
        Update: {
          client_tag_id?: string | null
          created_at?: string
          description?: string | null
          follow_up_message?: string | null
          id?: string
          parent_task_id?: string | null
          priority?: number | null
          reminder_minutes?: number | null
          scheduled_date?: string | null
          scheduled_start_time?: string | null
          status?: string
          task_kind?: string
          time_estimate?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_tag_id_fkey"
            columns: ["client_tag_id"]
            isOneToOne: false
            referencedRelation: "client_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          default_reminder_minutes: number | null
          id: string
          notifications_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_reminder_minutes?: number | null
          id?: string
          notifications_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_reminder_minutes?: number | null
          id?: string
          notifications_enabled?: boolean | null
          updated_at?: string
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
