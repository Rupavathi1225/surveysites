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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_entries: {
        Row: {
          contest_id: string
          created_at: string | null
          id: string
          points: number | null
          user_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string | null
          id?: string
          points?: number | null
          user_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string | null
          id?: string
          points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          allow_same_ip: boolean | null
          amount: number | null
          created_at: string | null
          description: string | null
          end_date: string | null
          excluded_users: string[] | null
          id: string
          rewards: Json | null
          start_date: string | null
          status: string | null
          title: string
        }
        Insert: {
          allow_same_ip?: boolean | null
          amount?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          excluded_users?: string[] | null
          id?: string
          rewards?: Json | null
          start_date?: string | null
          status?: string | null
          title: string
        }
        Update: {
          allow_same_ip?: boolean | null
          amount?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          excluded_users?: string[] | null
          id?: string
          rewards?: Json | null
          start_date?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      earning_history: {
        Row: {
          amount: number | null
          bonus_percentage: number | null
          created_at: string | null
          description: string | null
          id: string
          offer_name: string | null
          status: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          bonus_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          offer_name?: string | null
          status?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          bonus_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          offer_name?: string | null
          status?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          created_at: string | null
          from_name: string | null
          id: string
          is_read: boolean | null
          message: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          from_name?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          from_name?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_logs: {
        Row: {
          browser: string | null
          created_at: string | null
          device: string | null
          fingerprint: string | null
          id: string
          ip_address: string | null
          is_new_device: boolean | null
          isp: string | null
          location: string | null
          method: string | null
          os: string | null
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device?: string | null
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_new_device?: boolean | null
          isp?: string | null
          location?: string | null
          method?: string | null
          os?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device?: string | null
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_new_device?: boolean | null
          isp?: string | null
          location?: string | null
          method?: string | null
          os?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_global: boolean | null
          message: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          message: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          message?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_clicks: {
        Row: {
          attempt_count: number | null
          browser: string | null
          completion_status: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          offer_id: string | null
          os: string | null
          risk_score: number | null
          session_end: string | null
          session_id: string | null
          session_start: string | null
          source: string | null
          survey_link_id: string | null
          time_spent: number | null
          user_agent: string | null
          user_id: string | null
          utm_params: Json | null
          vpn_proxy_flag: boolean | null
        }
        Insert: {
          attempt_count?: number | null
          browser?: string | null
          completion_status?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          offer_id?: string | null
          os?: string | null
          risk_score?: number | null
          session_end?: string | null
          session_id?: string | null
          session_start?: string | null
          source?: string | null
          survey_link_id?: string | null
          time_spent?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_params?: Json | null
          vpn_proxy_flag?: boolean | null
        }
        Update: {
          attempt_count?: number | null
          browser?: string | null
          completion_status?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          offer_id?: string | null
          os?: string | null
          risk_score?: number | null
          session_end?: string | null
          session_id?: string | null
          session_start?: string | null
          source?: string | null
          survey_link_id?: string | null
          time_spent?: number | null
          user_agent?: string | null
          user_id?: string | null
          utm_params?: Json | null
          vpn_proxy_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_clicks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_clicks_survey_link_id_fkey"
            columns: ["survey_link_id"]
            isOneToOne: false
            referencedRelation: "survey_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          allowed_countries: string | null
          countries: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          device: string | null
          devices: string | null
          expiry_date: string | null
          id: string
          image_url: string | null
          non_access_url: string | null
          offer_id: string | null
          payout: number | null
          payout_model: string | null
          percent: number | null
          platform: string | null
          preview_url: string | null
          status: string | null
          title: string
          traffic_sources: string | null
          updated_at: string | null
          url: string | null
          vertical: string | null
        }
        Insert: {
          allowed_countries?: string | null
          countries?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          device?: string | null
          devices?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          non_access_url?: string | null
          offer_id?: string | null
          payout?: number | null
          payout_model?: string | null
          percent?: number | null
          platform?: string | null
          preview_url?: string | null
          status?: string | null
          title: string
          traffic_sources?: string | null
          updated_at?: string | null
          url?: string | null
          vertical?: string | null
        }
        Update: {
          allowed_countries?: string | null
          countries?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          device?: string | null
          devices?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          non_access_url?: string | null
          offer_id?: string | null
          payout?: number | null
          payout_model?: string | null
          percent?: number | null
          platform?: string | null
          preview_url?: string | null
          status?: string | null
          title?: string
          traffic_sources?: string | null
          updated_at?: string | null
          url?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          id: string
          login_log_id: string | null
          page_path: string
          user_id: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          login_log_id?: string | null
          page_path: string
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          login_log_id?: string | null
          page_path?: string
          user_id?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_visits_login_log_id_fkey"
            columns: ["login_log_id"]
            isOneToOne: false
            referencedRelation: "login_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          fee_percentage: number | null
          id: string
          min_amount: number | null
          name: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          fee_percentage?: number | null
          id?: string
          min_amount?: number | null
          name: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          fee_percentage?: number | null
          id?: string
          min_amount?: number | null
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          cash_balance: number | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          free_messages_remaining: number | null
          id: string
          is_verified: boolean | null
          last_name: string | null
          locked_points: number | null
          mobile: string | null
          payment_info: string | null
          payment_method: string | null
          points: number | null
          referral_code: string | null
          referred_by: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          cash_balance?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          free_messages_remaining?: number | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          locked_points?: number | null
          mobile?: string | null
          payment_info?: string | null
          payment_method?: string | null
          points?: number | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          cash_balance?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          free_messages_remaining?: number | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          locked_points?: number | null
          mobile?: string | null
          payment_info?: string | null
          payment_method?: string | null
          points?: number | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      promocode_redemptions: {
        Row: {
          created_at: string | null
          id: string
          promocode_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          promocode_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          promocode_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocode_redemptions_promocode_id_fkey"
            columns: ["promocode_id"]
            isOneToOne: false
            referencedRelation: "promocodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocode_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promocodes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          reward: number | null
          status: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          reward?: number | null
          status?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          reward?: number | null
          status?: string | null
        }
        Relationships: []
      }
      single_link_providers: {
        Row: {
          code: string | null
          created_at: string | null
          different_postback: boolean | null
          fail_value: string | null
          id: string
          link_keys: string | null
          name: string
          payout_type: string | null
          point_percentage: number | null
          postback_payout_key: string | null
          postback_status_key: string | null
          postback_txn_key: string | null
          postback_url: string | null
          postback_username_key: string | null
          status: string | null
          success_value: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          different_postback?: boolean | null
          fail_value?: string | null
          id?: string
          link_keys?: string | null
          name: string
          payout_type?: string | null
          point_percentage?: number | null
          postback_payout_key?: string | null
          postback_status_key?: string | null
          postback_txn_key?: string | null
          postback_url?: string | null
          postback_username_key?: string | null
          status?: string | null
          success_value?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          different_postback?: boolean | null
          fail_value?: string | null
          id?: string
          link_keys?: string | null
          name?: string
          payout_type?: string | null
          point_percentage?: number | null
          postback_payout_key?: string | null
          postback_status_key?: string | null
          postback_txn_key?: string | null
          postback_url?: string | null
          postback_username_key?: string | null
          status?: string | null
          success_value?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          content: string | null
          id: string
          name: string
          status: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      sub_admins: {
        Row: {
          created_at: string | null
          id: string
          permissions: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_links: {
        Row: {
          button_gradient: string | null
          button_text: string | null
          color_code: string | null
          content: string | null
          country: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_recommended: boolean | null
          level: number | null
          link: string | null
          link_offer_id: string | null
          name: string
          payout: number | null
          rating: number | null
          status: string | null
          survey_provider_id: string | null
          updated_at: string | null
        }
        Insert: {
          button_gradient?: string | null
          button_text?: string | null
          color_code?: string | null
          content?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_recommended?: boolean | null
          level?: number | null
          link?: string | null
          link_offer_id?: string | null
          name: string
          payout?: number | null
          rating?: number | null
          status?: string | null
          survey_provider_id?: string | null
          updated_at?: string | null
        }
        Update: {
          button_gradient?: string | null
          button_text?: string | null
          color_code?: string | null
          content?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_recommended?: boolean | null
          level?: number | null
          link?: string | null
          link_offer_id?: string | null
          name?: string
          payout?: number | null
          rating?: number | null
          status?: string | null
          survey_provider_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_links_survey_provider_id_fkey"
            columns: ["survey_provider_id"]
            isOneToOne: false
            referencedRelation: "survey_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_providers: {
        Row: {
          button_gradient: string | null
          button_text: string | null
          code: string | null
          color_code: string | null
          content: string | null
          created_at: string | null
          different_postback_link: string | null
          id: string
          iframe_code: string | null
          iframe_keys: string | null
          image_url: string | null
          is_recommended: boolean | null
          level: number | null
          name: string
          payout_type: string | null
          point_percentage: number | null
          postback_payout_key: string | null
          postback_status_key: string | null
          postback_txn_key: string | null
          postback_url: string | null
          postback_username_key: string | null
          rating: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          button_gradient?: string | null
          button_text?: string | null
          code?: string | null
          color_code?: string | null
          content?: string | null
          created_at?: string | null
          different_postback_link?: string | null
          id?: string
          iframe_code?: string | null
          iframe_keys?: string | null
          image_url?: string | null
          is_recommended?: boolean | null
          level?: number | null
          name: string
          payout_type?: string | null
          point_percentage?: number | null
          postback_payout_key?: string | null
          postback_status_key?: string | null
          postback_txn_key?: string | null
          postback_url?: string | null
          postback_username_key?: string | null
          rating?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          button_gradient?: string | null
          button_text?: string | null
          code?: string | null
          color_code?: string | null
          content?: string | null
          created_at?: string | null
          different_postback_link?: string | null
          id?: string
          iframe_code?: string | null
          iframe_keys?: string | null
          image_url?: string | null
          is_recommended?: boolean | null
          level?: number | null
          name?: string
          payout_type?: string | null
          point_percentage?: number | null
          postback_payout_key?: string | null
          postback_status_key?: string | null
          postback_txn_key?: string | null
          postback_url?: string | null
          postback_username_key?: string | null
          rating?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          id: string
          key: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          fee: number | null
          id: string
          payment_method: string
          status: string | null
          txn_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          fee?: number | null
          id?: string
          payment_method: string
          status?: string | null
          txn_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          fee?: number | null
          id?: string
          payment_method?: string
          status?: string | null
          txn_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finalize_ended_contests: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_subadmin: { Args: never; Returns: boolean }
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
