export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    nome: string
                    nickname: string
                    email: string
                    foto_perfil: string | null
                    funcao: 'usuario' | 'moderator' | 'admin'
                    status: 'ativo' | 'pendente' | 'bloqueado'
                    presence: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    nome: string
                    nickname: string
                    email: string
                    foto_perfil?: string | null
                    funcao?: 'usuario' | 'moderator' | 'admin'
                    status?: 'ativo' | 'pendente' | 'bloqueado'
                    presence?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    nome?: string
                    nickname?: string
                    email?: string
                    foto_perfil?: string | null
                    funcao?: 'usuario' | 'moderator' | 'admin'
                    status?: 'ativo' | 'pendente' | 'bloqueado'
                    presence?: string | null
                    created_at?: string
                }
            }
            championships: {
                Row: {
                    id: string
                    name: string
                    status: 'ativo' | 'finalizado' | 'arquivado' | 'agendado'
                    category: string | null
                    settings: Json | null
                    legacy_import: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    status?: 'ativo' | 'finalizado' | 'arquivado' | 'agendado'
                    category?: string | null
                    settings?: Json | null
                    legacy_import?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    status?: 'ativo' | 'finalizado' | 'arquivado' | 'agendado'
                    category?: string | null
                    settings?: Json | null
                    legacy_import?: boolean
                    created_at?: string
                }
            }
            matches: {
                Row: {
                    id: string
                    championship_id: string
                    round: number
                    round_name: string | null
                    date: string
                    status: string
                    home_team: string
                    away_team: string
                    score_home: number | null
                    score_away: number | null
                    home_team_crest: string | null
                    away_team_crest: string | null
                    external_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    championship_id: string
                    round: number
                    round_name?: string | null
                    date: string
                    status: string
                    home_team: string
                    away_team: string
                    score_home?: number | null
                    score_away?: number | null
                    home_team_crest?: string | null
                    away_team_crest?: string | null
                    external_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    championship_id?: string
                    round?: number
                    round_name?: string | null
                    date?: string
                    status?: string
                    home_team?: string
                    away_team?: string
                    score_home?: number | null
                    score_away?: number | null
                    home_team_crest?: string | null
                    away_team_crest?: string | null
                    external_id?: string | null
                    created_at?: string
                }
            }
            predictions: {
                Row: {
                    id: string
                    user_id: string
                    match_id: string
                    home_score: number
                    away_score: number
                    points: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    match_id: string
                    home_score: number
                    away_score: number
                    points?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    match_id?: string
                    home_score?: number
                    away_score?: number
                    points?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            legacy_stats: {
                Row: {
                    id: string
                    championship_id: string | null
                    year: number | null
                    championship_name: string | null
                    legacy_user_name: string | null
                    user_id: string | null
                    points: number
                    exact_scores: number
                    outcomes: number
                    errors: number
                    rank: number | null
                    champion_pick: string | null
                    team_picks: Json | null
                    achievements: string[] | null
                    imported_at: string
                }
                Insert: {
                    id: string
                    championship_id?: string | null
                    year?: number | null
                    championship_name?: string | null
                    legacy_user_name?: string | null
                    user_id?: string | null
                    points?: number
                    exact_scores?: number
                    outcomes?: number
                    errors?: number
                    rank?: number | null
                    champion_pick?: string | null
                    team_picks?: Json | null
                    achievements?: string[] | null
                    imported_at?: string
                }
                Update: {
                    id?: string
                    championship_id?: string | null
                    year?: number | null
                    championship_name?: string | null
                    legacy_user_name?: string | null
                    user_id?: string | null
                    points?: number
                    exact_scores?: number
                    outcomes?: number
                    errors?: number
                    rank?: number | null
                    champion_pick?: string | null
                    team_picks?: Json | null
                    achievements?: string[] | null
                    imported_at?: string
                }
            }
            messages: {
                Row: {
                    id: string
                    sender_id: string
                    receiver_id: string | null
                    content: string
                    read: boolean
                    delivered: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    sender_id: string
                    receiver_id?: string | null
                    content: string
                    read?: boolean
                    delivered?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    sender_id?: string
                    receiver_id?: string | null
                    content?: string
                    read?: boolean
                    delivered?: boolean
                    created_at?: string
                }
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    message: string
                    type: string
                    read: boolean
                    link: string | null
                    meta: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    message: string
                    type: string
                    read?: boolean
                    link?: string | null
                    meta?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    message?: string
                    type?: string
                    read?: boolean
                    link?: string | null
                    meta?: Json | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            ranking_live: {
                Row: {
                    user_id: string
                    nickname: string
                    total_points: number
                    matches_played: number
                }
            },
            public_profiles: {
                Row: {
                    id: string
                    nome: string
                    nickname: string
                    foto_perfil: string | null
                    funcao: 'usuario' | 'moderator' | 'admin'
                    status: 'ativo' | 'pendente' | 'bloqueado'
                    created_at: string
                }
            }
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
