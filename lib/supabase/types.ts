// Hand-written to match supabase/migrations/20260904232051_init_onboarding_schema.sql,
// supabase/migrations/20260905192540_swipe_feed_schema.sql,
// supabase/migrations/20260906102444_profile_extras.sql,
// supabase/migrations/20260907090000_quiz_schema.sql, and
// supabase/migrations/20260907160000_quiz_sharing_schema.sql.
// Replace with `supabase gen types typescript` output once the schema stabilizes.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          locale: string;
          is_premium: boolean;
          streak_count: number;
          longest_streak: number;
          last_active_date: string | null;
          discovery_score: number;
          level: number;
          created_at: string;
          analytics_opt_in: boolean;
          leaderboard_opt_in: boolean;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      interest_categories: {
        Row: {
          id: string;
          slug: string;
          label: string;
          icon: string;
          wikipedia_category_seed: string;
        };
        Insert: Database['public']['Tables']['interest_categories']['Row'];
        Update: Partial<Database['public']['Tables']['interest_categories']['Row']>;
        Relationships: [];
      };
      user_interests: {
        Row: {
          user_id: string;
          category_id: string;
          weight: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          category_id: string;
          weight?: number;
        };
        Update: Partial<Database['public']['Tables']['user_interests']['Row']>;
        Relationships: [];
      };
      articles_cache: {
        Row: {
          wikipedia_pageid: number;
          lang: string;
          title: string;
          extract: string;
          thumbnail_url: string | null;
          source_url: string;
          categories: string[];
          cached_at: string;
          ttl_expires_at: string;
        };
        Insert: Partial<Database['public']['Tables']['articles_cache']['Row']> & {
          wikipedia_pageid: number;
          title: string;
          extract: string;
          source_url: string;
          ttl_expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['articles_cache']['Row']>;
        Relationships: [];
      };
      swipes: {
        Row: {
          id: string;
          user_id: string;
          article_pageid: number;
          article_lang: string;
          direction: 'like' | 'skip';
          category_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          article_pageid: number;
          article_lang?: string;
          direction: 'like' | 'skip';
          category_id: string;
        };
        Update: Partial<Database['public']['Tables']['swipes']['Row']>;
        Relationships: [];
      };
      saved_articles: {
        Row: {
          user_id: string;
          article_pageid: number;
          article_lang: string;
          saved_at: string;
        };
        Insert: {
          user_id: string;
          article_pageid: number;
          article_lang?: string;
        };
        Update: Partial<Database['public']['Tables']['saved_articles']['Row']>;
        Relationships: [];
      };
      quiz_sessions: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          completed_at: string | null;
          score: number;
          total_questions: number;
          article_set_key: string;
        };
        Insert: {
          user_id: string;
          total_questions: number;
          article_set_key: string;
          score?: number;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['quiz_sessions']['Row']>;
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_session_id: string;
          article_pageid: number;
          article_lang: string;
          question_text: string;
          options: string[];
          correct_option_index: number;
          user_answer_index: number | null;
          question_order: number;
        };
        Insert: {
          quiz_session_id: string;
          article_pageid: number;
          article_lang?: string;
          question_text: string;
          options: string[];
          correct_option_index: number;
          question_order: number;
          user_answer_index?: number | null;
        };
        Update: Partial<Database['public']['Tables']['quiz_questions']['Row']>;
        Relationships: [];
      };
      shared_quizzes: {
        Row: {
          id: string;
          owner_user_id: string;
          source_quiz_session_id: string;
          created_at: string;
        };
        Insert: {
          owner_user_id: string;
          source_quiz_session_id: string;
        };
        Update: Partial<Database['public']['Tables']['shared_quizzes']['Row']>;
        Relationships: [];
      };
      quiz_plays: {
        Row: {
          id: string;
          shared_quiz_id: string;
          player_user_id: string;
          score: number;
          total_questions: number;
          played_at: string;
        };
        Insert: {
          shared_quiz_id: string;
          player_user_id: string;
          score: number;
          total_questions: number;
        };
        Update: Partial<Database['public']['Tables']['quiz_plays']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_interest_weight_delta: {
        Args: {
          p_user_id: string;
          p_category_id: string;
          p_delta: number;
          p_floor: number;
          p_cap: number;
        };
        Returns: undefined;
      };
      get_unseen_articles_for_category: {
        Args: {
          p_user_id: string;
          p_category_id: string;
          p_lang: string;
          p_limit: number;
        };
        Returns: Database['public']['Tables']['articles_cache']['Row'][];
      };
      increment_discovery_score: {
        Args: {
          p_user_id: string;
          p_delta: number;
        };
        Returns: undefined;
      };
      get_leaderboard_display_names: {
        Args: {
          p_user_ids: string[];
        };
        Returns: { id: string; display_name: string | null }[];
      };
    };
  };
}
