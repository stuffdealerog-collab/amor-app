export type AgePool = 'kids' | 'teens' | 'young_adults'
export type RoomType = 'text' | 'voice' | 'both'
export type RoomCategory = 'chat' | 'play' | 'support' | 'creative'
export type SwipeAction = 'like' | 'skip' | 'superlike'
export type QuestType = 'daily' | 'pair'
export type QuestDifficulty = 'easy' | 'medium' | 'hard'
export type QuestStatus = 'active' | 'completed'
export type MessageType = 'text' | 'image' | 'voice' | 'system'
export type CharacterRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          name: string
          age: number
          age_pool: AgePool
          city: string | null
          avatar_url: string | null
          photos: string[]
          interests: string[]
          bio: string | null
          voice_bio_url: string | null
          vibe_question: string | null
          music_genres: string[]
          favorite_artists: string[]
          yandex_music_link: string | null
          banner_url: string | null
          last_free_chest: string | null
          stars_count: number
          equipped_character_id: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at' | 'stars_count'> & {
          stars_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      collections: {
        Row: {
          id: string
          name: string
          subtitle: string
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['collections']['Row'], 'created_at'> & { created_at?: string }
        Update: Partial<Database['public']['Tables']['collections']['Insert']>
      }
      characters: {
        Row: {
          id: string
          collection_id: string
          name: string
          slug: string
          rarity: CharacterRarity
          color: string
          boost: string
          image_url: string
          drop_rate: number
          css_effect: string
          description: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['characters']['Row'], 'created_at'> & { created_at?: string }
        Update: Partial<Database['public']['Tables']['characters']['Insert']>
      }
      user_characters: {
        Row: {
          id: string
          user_id: string
          character_id: string
          level: number
          xp: number
          equipped: boolean
          obtained_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_characters']['Row'], 'obtained_at' | 'level' | 'xp'> & {
          level?: number
          xp?: number
          obtained_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_characters']['Insert']>
      }
      swipes: {
        Row: {
          id: string
          swiper_id: string
          swiped_id: string
          action: SwipeAction
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['swipes']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['swipes']['Insert']>
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          auth_key: string
          p256dh_key: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
      }
      matches: {
        Row: {
          id: string
          user1_id: string
          user2_id: string
          vibe_score: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['matches']['Insert']>
      }
      messages: {
        Row: {
          id: string
          match_id: string
          sender_id: string
          content: string
          type: MessageType
          media_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at' | 'media_url' | 'read_at'> & {
          id?: string
          media_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      rooms: {
        Row: {
          id: string
          category: RoomCategory
          name: string
          description: string | null
          max_members: number
          is_premium: boolean
          room_type: RoomType
          age_pool: AgePool
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>
      }
      room_members: {
        Row: {
          id: string
          room_id: string
          user_id: string
          is_muted: boolean
          is_speaking: boolean
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['room_members']['Row'], 'id' | 'joined_at' | 'is_muted' | 'is_speaking'> & {
          id?: string
          is_muted?: boolean
          is_speaking?: boolean
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['room_members']['Insert']>
      }
      room_messages: {
        Row: {
          id: string
          room_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['room_messages']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['room_messages']['Insert']>
      }
      quests: {
        Row: {
          id: string
          title: string
          description: string
          type: QuestType
          difficulty: QuestDifficulty
          reward_stars: number
          reward_xp: number
          icon: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['quests']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['quests']['Insert']>
      }
      user_quests: {
        Row: {
          id: string
          user_id: string
          quest_id: string
          partner_id: string | null
          progress: number
          max_progress: number
          status: QuestStatus
          started_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_quests']['Row'], 'id' | 'started_at' | 'progress'> & {
          id?: string
          progress?: number
          started_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_quests']['Insert']>
      }
      stars_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: string
          from_user_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stars_transactions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['stars_transactions']['Insert']>
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          type: string
          value: string
          max_uses: number
          used_count: number
          expires_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['promo_codes']['Row'], 'id' | 'created_at' | 'used_count'> & {
          id?: string
          used_count?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['promo_codes']['Insert']>
      }
      promo_redemptions: {
        Row: {
          id: string
          user_id: string
          promo_id: string
          redeemed_at: string
        }
        Insert: Omit<Database['public']['Tables']['promo_redemptions']['Row'], 'id' | 'redeemed_at'> & {
          id?: string
          redeemed_at?: string
        }
        Update: Partial<Database['public']['Tables']['promo_redemptions']['Insert']>
      }
    }
    Functions: {
      increment_stars: {
        Args: { p_user_id: string; p_amount: number; p_reason?: string }
        Returns: number
      }
      gift_star: {
        Args: { p_from: string; p_to: string }
        Returns: { error: string | null; balance?: number }
      }
      exchange_stars_for_character: {
        Args: { p_user_id: string }
        Returns: { error: string | null; character_id?: string; balance?: number }
      }
      redeem_promo: {
        Args: { p_user_id: string; p_code: string }
        Returns: { success: boolean; message: string; type?: string; value?: string; balance?: number }
      }
    }
    Enums: {
      age_pool: AgePool
      room_type: RoomType
      room_category: RoomCategory
      swipe_action: SwipeAction
      quest_type: QuestType
      quest_difficulty: QuestDifficulty
      quest_status: QuestStatus
      message_type: MessageType
      character_rarity: CharacterRarity
    }
  }
}
