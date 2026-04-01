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
      accounts: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          instagram_name: string | null
          instagram_pic_url: string | null
          instagram_user_id: string
          instagram_username: string
          is_active: boolean | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          webhook_verified_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          instagram_name?: string | null
          instagram_pic_url?: string | null
          instagram_user_id: string
          instagram_username: string
          is_active?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          webhook_verified_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          instagram_name?: string | null
          instagram_pic_url?: string | null
          instagram_user_id?: string
          instagram_username?: string
          is_active?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          webhook_verified_at?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          account_id: string
          automation_run_id: string | null
          completion_tokens: number | null
          cost_usd: number | null
          created_at: string | null
          id: string
          model: string
          prompt_tokens: number | null
          step_id: string | null
          total_tokens: number | null
        }
        Insert: {
          account_id: string
          automation_run_id?: string | null
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          model: string
          prompt_tokens?: number | null
          step_id?: string | null
          total_tokens?: number | null
        }
        Update: {
          account_id?: string
          automation_run_id?: string | null
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          model?: string
          prompt_tokens?: number | null
          step_id?: string | null
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_automation_run_id_fkey"
            columns: ["automation_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_id: string
          completed_at: string | null
          contact_id: string
          current_step_id: string | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string
          trigger_event_id: string | null
          trigger_payload: Json | null
          updated_at: string | null
        }
        Insert: {
          automation_id: string
          completed_at?: string | null
          contact_id: string
          current_step_id?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_event_id?: string | null
          trigger_payload?: Json | null
          updated_at?: string | null
        }
        Update: {
          automation_id?: string
          completed_at?: string | null
          contact_id?: string
          current_step_id?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_event_id?: string | null
          trigger_payload?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string
          total_runs: number | null
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          total_runs?: number | null
          trigger_config?: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          total_runs?: number | null
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          message_config: Json
          name: string
          scheduled_at: string | null
          segment_tags: string[] | null
          sent_at: string | null
          started_at: string | null
          status: string
          total_delivered: number | null
          total_failed: number | null
          total_opened: number | null
          total_recipients: number | null
          total_sent: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          message_config?: Json
          name: string
          scheduled_at?: string | null
          segment_tags?: string[] | null
          sent_at?: string | null
          started_at?: string | null
          status?: string
          total_delivered?: number | null
          total_failed?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          message_config?: Json
          name?: string
          scheduled_at?: string | null
          segment_tags?: string[] | null
          sent_at?: string | null
          started_at?: string | null
          status?: string
          total_delivered?: number | null
          total_failed?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      closer_applications: {
        Row: {
          created_at: string
          eliminated: boolean
          eliminated_at_question: number | null
          id: string
          instagram: string | null
          nome: string | null
          q1: string | null
          q10: string | null
          q10_justification: string | null
          q11: string | null
          q12: string | null
          q13: string | null
          q14: string | null
          q2: string | null
          q3: string | null
          q4: string | null
          q5: string | null
          q6: string | null
          q7: string | null
          q8: string | null
          q8_details: string | null
          q9: string | null
          status: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          eliminated?: boolean
          eliminated_at_question?: number | null
          id?: string
          instagram?: string | null
          nome?: string | null
          q1?: string | null
          q10?: string | null
          q10_justification?: string | null
          q11?: string | null
          q12?: string | null
          q13?: string | null
          q14?: string | null
          q2?: string | null
          q3?: string | null
          q4?: string | null
          q5?: string | null
          q6?: string | null
          q7?: string | null
          q8?: string | null
          q8_details?: string | null
          q9?: string | null
          status?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          eliminated?: boolean
          eliminated_at_question?: number | null
          id?: string
          instagram?: string | null
          nome?: string | null
          q1?: string | null
          q10?: string | null
          q10_justification?: string | null
          q11?: string | null
          q12?: string | null
          q13?: string | null
          q14?: string | null
          q2?: string | null
          q3?: string | null
          q4?: string | null
          q5?: string | null
          q6?: string | null
          q7?: string | null
          q8?: string | null
          q8_details?: string | null
          q9?: string | null
          status?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          account_id: string
          created_at: string | null
          full_name: string | null
          id: string
          instagram_user_id: string
          is_blocked: boolean | null
          last_message_at: string | null
          notes: string | null
          opted_out: boolean | null
          profile_pic_url: string | null
          tags: string[] | null
          updated_at: string | null
          username: string | null
          window_expires_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          full_name?: string | null
          id?: string
          instagram_user_id: string
          is_blocked?: boolean | null
          last_message_at?: string | null
          notes?: string | null
          opted_out?: boolean | null
          profile_pic_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          username?: string | null
          window_expires_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          full_name?: string | null
          id?: string
          instagram_user_id?: string
          is_blocked?: boolean | null
          last_message_at?: string | null
          notes?: string | null
          opted_out?: boolean | null
          profile_pic_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
          username?: string | null
          window_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      "Follow-up": {
        Row: {
          conversation_id: string | null
          datetime: string | null
          horario_transferido: string | null
          id: number
          lastMessage: string | null
          phone: string
          transferido: boolean | null
        }
        Insert: {
          conversation_id?: string | null
          datetime?: string | null
          horario_transferido?: string | null
          id?: number
          lastMessage?: string | null
          phone: string
          transferido?: boolean | null
        }
        Update: {
          conversation_id?: string | null
          datetime?: string | null
          horario_transferido?: string | null
          id?: number
          lastMessage?: string | null
          phone?: string
          transferido?: boolean | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          call_agendada: boolean | null
          created_at: string | null
          email: string | null
          empresa: string | null
          faturamento: string | null
          id: string
          nome: string
          origem: string | null
          segmento: string | null
          telefone: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          call_agendada?: boolean | null
          created_at?: string | null
          email?: string | null
          empresa?: string | null
          faturamento?: string | null
          id?: string
          nome: string
          origem?: string | null
          segmento?: string | null
          telefone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          call_agendada?: boolean | null
          created_at?: string | null
          email?: string | null
          empresa?: string | null
          faturamento?: string | null
          id?: string
          nome?: string
          origem?: string | null
          segmento?: string | null
          telefone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          account_id: string
          automation_run_id: string | null
          broadcast_id: string | null
          contact_id: string
          content: Json
          delivered_at: string | null
          direction: string
          error_details: Json | null
          failed_at: string | null
          id: string
          meta_message_id: string | null
          read_at: string | null
          sent_at: string | null
          step_id: string | null
          type: string
        }
        Insert: {
          account_id: string
          automation_run_id?: string | null
          broadcast_id?: string | null
          contact_id: string
          content?: Json
          delivered_at?: string | null
          direction: string
          error_details?: Json | null
          failed_at?: string | null
          id?: string
          meta_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          step_id?: string | null
          type: string
        }
        Update: {
          account_id?: string
          automation_run_id?: string | null
          broadcast_id?: string | null
          contact_id?: string
          content?: Json
          delivered_at?: string | null
          direction?: string
          error_details?: Json | null
          failed_at?: string | null
          id?: string
          meta_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          step_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_automation_run_id_fkey"
            columns: ["automation_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_agentise: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      registros_agendamento: {
        Row: {
          conversation_id: string | null
          data_agendamento: string | null
          id: number
        }
        Insert: {
          conversation_id?: string | null
          data_agendamento?: string | null
          id?: number
        }
        Update: {
          conversation_id?: string | null
          data_agendamento?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "registros_transferencia_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "Follow-up"
            referencedColumns: ["conversation_id"]
          },
        ]
      }
      steps: {
        Row: {
          automation_id: string
          branch_value: string | null
          config: Json
          created_at: string | null
          id: string
          parent_step_id: string | null
          position: number
          type: string
        }
        Insert: {
          automation_id: string
          branch_value?: string | null
          config?: Json
          created_at?: string | null
          id?: string
          parent_step_id?: string | null
          position?: number
          type: string
        }
        Update: {
          automation_id?: string
          branch_value?: string | null
          config?: Json
          created_at?: string | null
          id?: string
          parent_step_id?: string | null
          position?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_parent_step_id_fkey"
            columns: ["parent_step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error: string | null
          event_type: string
          id: string
          instagram_user_id: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          received_at: string | null
        }
        Insert: {
          error?: string | null
          event_type: string
          id?: string
          instagram_user_id?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          instagram_user_id?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_rag_agentise: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
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
