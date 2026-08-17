// ============================================================================
// Tipos de la base de datos Supabase (schema public).
//
// ⚠️ Archivo BASE: fuente de referencia manual, alineado con supabase/schema.sql
// y supabase/migrations/*. Para regenerar la versión autogenerada oficial:
//
//   supabase gen types typescript --project-id <PROJECT_ID> \
//     > src/types/database.types.ts
//
// Usar como: `supabase.from<Database>('binder_cards')` (con los clientes de
// lib/supabase). Si la tabla no está aquí, cae en `any` sin romper el build.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          whatsapp_number: string | null
          country: string | null
          city: string | null
          is_admin: boolean
          total_sales: number
          total_trades: number
          rating_avg: number
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          whatsapp_number?: string | null
          country?: string | null
          city?: string | null
          is_admin?: boolean
          total_sales?: number
          total_trades?: number
          rating_avg?: number
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      binders: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          is_public: boolean
          cover_card_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          description?: string | null
          is_public?: boolean
          cover_card_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['binders']['Insert']>
        Relationships: []
      }
      binder_cards: {
        Row: {
          id: string
          binder_id: string
          card_id: string
          card_name: string
          set_id: string
          number: string
          slot_number: number
          market_price: number | null
          status: 'collection' | 'for_sale' | 'for_trade' | 'reserved'
          price_override: number | null
          is_for_sale: boolean
          is_for_trade: boolean
          price: number | null
          trade_notes: string | null
          condition: string | null
          language: 'ES' | 'EN' | 'JP' | 'KO' | 'ZH'
          manual_price: number | null
          currency: 'USD' | 'EUR' | 'ARS'
          is_user_reported: boolean
          reserved_until: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          binder_id: string
          card_id: string
          card_name: string
          set_id: string
          number: string
          slot_number: number
          market_price?: number | null
          status?: 'collection' | 'for_sale' | 'for_trade' | 'reserved'
          price_override?: number | null
          is_for_sale?: boolean
          is_for_trade?: boolean
          price?: number | null
          trade_notes?: string | null
          condition?: string | null
          language?: 'ES' | 'EN' | 'JP' | 'KO' | 'ZH'
          manual_price?: number | null
          currency?: 'USD' | 'EUR' | 'ARS'
          is_user_reported?: boolean
          reserved_until?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['binder_cards']['Insert']>
        Relationships: []
      }
      claims: {
        Row: {
          id: string
          buyer_id: string
          seller_id: string
          card_id: string | null
          kind: 'sale' | 'trade' | 'both'
          status: 'pending' | 'completed' | 'cancelled'
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          buyer_id: string
          seller_id: string
          card_id?: string | null
          kind?: 'sale' | 'trade' | 'both'
          status?: 'pending' | 'completed' | 'cancelled'
          created_at?: string
          completed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['claims']['Insert']>
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          claim_id: string
          reviewer_id: string
          reviewed_user_id: string
          rating: number
          tags: string[]
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          claim_id: string
          reviewer_id: string
          reviewed_user_id: string
          rating: number
          tags?: string[]
          comment?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
        Relationships: []
      }
      wantlist_cards: {
        Row: {
          id: string
          user_id: string
          card_id: string
          card_name: string
          set_id: string
          set_name: string | null
          number: string
          max_budget: number | null
          currency: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id: string
          card_name: string
          set_id: string
          set_name?: string | null
          number: string
          max_budget?: number | null
          currency?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['wantlist_cards']['Insert']>
        Relationships: []
      }
      trade_offers: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          requested_card_id: string
          offered_card_ids: string[]
          cash_offered: number
          message: string | null
          status: string
          created_at: string
          requested_snapshot: Json
          offered_snapshot: Json
          sender_snapshot: Json
          receiver_snapshot: Json
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          requested_card_id: string
          offered_card_ids?: string[]
          cash_offered?: number
          message?: string | null
          status?: string
          created_at?: string
          requested_snapshot: Json
          offered_snapshot?: Json
          sender_snapshot: Json
          receiver_snapshot: Json
        }
        Update: Partial<Database['public']['Tables']['trade_offers']['Insert']>
        Relationships: []
      }
      card_prices: {
        Row: {
          card_id: string
          market_price: number | null
          updated_at: string
        }
        Insert: {
          card_id: string
          market_price?: number | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['card_prices']['Insert']>
        Relationships: []
      }
      expansions_cache: {
        Row: {
          set_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          set_id: string
          payload: Json
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['expansions_cache']['Insert']>
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['app_settings']['Insert']>
        Relationships: []
      }
      integration_usage: {
        Row: {
          integration: string
          bucket: string
          count: number
        }
        Insert: {
          integration: string
          bucket: string
          count?: number
        }
        Update: Partial<Database['public']['Tables']['integration_usage']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}