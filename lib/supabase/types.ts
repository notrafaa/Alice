/**
 * Future Supabase schema — typed ahead of time, NOT used by the demo.
 *
 * These types document the planned tables so features can be built against
 * a stable contract. When the schema is created for real, regenerate with
 * `supabase gen types typescript` and reconcile.
 *
 * Planned tables (see also docs/ARCHITECTURE.md and docs/MULTIPLAYER_PLAN.md):
 *   users               — profile linked to Supabase Auth
 *   songs               — uploaded songs (content-hashed, cached analyses)
 *   song_stems          — separated stems per song (Level 2 engine)
 *   charts              — generated beatmaps per song × instrument
 *   scores              — per-user, per-song, per-instrument results
 *   multiplayer_rooms   — lobby/room state
 *   multiplayer_players — players present in a room (Realtime presence)
 */

import type { Beatmap, DifficultyLevel, InstrumentId, JudgementCounts, Rank } from "@/types";

export interface UserRow {
  id: string; // = auth.users.id
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface SongRow {
  id: string;
  /** SHA-256 of file content — lets a re-uploaded song reuse its analysis. */
  content_hash: string;
  title: string;
  duration_sec: number;
  bpm: number | null;
  /** Supabase Storage path of the original upload. */
  storage_path: string;
  uploaded_by: string | null; // users.id
  analysis_status: "pending" | "processing" | "ready" | "error";
  created_at: string;
}

export interface SongStemRow {
  id: string;
  song_id: string;
  stem:
    | "vocals"
    | "drums"
    | "bass"
    | "piano"
    | "electric_guitar"
    | "acoustic_guitar";
  storage_path: string;
  created_at: string;
}

export interface ChartRow {
  id: string;
  song_id: string;
  instrument: InstrumentId;
  difficulty: DifficultyLevel;
  /** Full Beatmap JSON (same schema as types/index.ts → Beatmap). */
  data: Beatmap;
  source: "demo-local-analysis" | "server-stem-separation";
  created_at: string;
}

export interface ScoreRow {
  id: string;
  user_id: string;
  song_id: string;
  instrument: InstrumentId;
  score: number;
  accuracy: number;
  max_combo: number;
  counts: JudgementCounts;
  rank: Rank;
  created_at: string;
}

export interface MultiplayerRoomRow {
  id: string;
  code: string; // short join code
  host_id: string;
  song_id: string | null;
  status: "lobby" | "countdown" | "playing" | "results";
  /** Shared clock reference for sync (see docs/MULTIPLAYER_PLAN.md). */
  song_start_at: string | null;
  created_at: string;
}

export interface MultiplayerPlayerRow {
  id: string;
  room_id: string;
  user_id: string;
  instrument: InstrumentId | null;
  is_ready: boolean;
  is_bot: boolean;
  live_score: number;
  live_combo: number;
  joined_at: string;
}

/** Minimal Database generic for the supabase-js client. */
export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow> };
      songs: { Row: SongRow; Insert: Partial<SongRow>; Update: Partial<SongRow> };
      song_stems: {
        Row: SongStemRow;
        Insert: Partial<SongStemRow>;
        Update: Partial<SongStemRow>;
      };
      charts: { Row: ChartRow; Insert: Partial<ChartRow>; Update: Partial<ChartRow> };
      scores: { Row: ScoreRow; Insert: Partial<ScoreRow>; Update: Partial<ScoreRow> };
      multiplayer_rooms: {
        Row: MultiplayerRoomRow;
        Insert: Partial<MultiplayerRoomRow>;
        Update: Partial<MultiplayerRoomRow>;
      };
      multiplayer_players: {
        Row: MultiplayerPlayerRow;
        Insert: Partial<MultiplayerPlayerRow>;
        Update: Partial<MultiplayerPlayerRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
