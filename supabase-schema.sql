-- ============================================================
-- NHL Shot Heatmap — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Games table
CREATE TABLE games (
  id BIGINT PRIMARY KEY,
  season INTEGER NOT NULL,
  game_date DATE NOT NULL,
  game_state TEXT NOT NULL DEFAULT 'FUT',
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_abbrev TEXT NOT NULL,
  away_team_abbrev TEXT NOT NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  period_number INTEGER,
  period_type TEXT,
  time_remaining TEXT,
  start_time_utc TIMESTAMPTZ NOT NULL,
  last_polled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_games_game_date ON games(game_date);
CREATE INDEX idx_games_game_state ON games(game_state);

-- 2. Shot events table
CREATE TABLE shot_events (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL,
  type_code INTEGER NOT NULL,
  type_desc_key TEXT NOT NULL,
  x_coord INTEGER NOT NULL,
  y_coord INTEGER NOT NULL,
  zone_code TEXT,
  shot_type TEXT,
  period_number INTEGER NOT NULL,
  period_type TEXT NOT NULL,
  time_in_period TEXT NOT NULL,
  team_id INTEGER NOT NULL,
  shooter_player_id INTEGER,
  goalie_player_id INTEGER,
  home_team_defending_side TEXT,
  strength TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(game_id, event_id)
);

CREATE INDEX idx_shot_events_game_id ON shot_events(game_id);
CREATE INDEX idx_shot_events_type_code ON shot_events(type_code);
CREATE INDEX idx_shot_events_game_type ON shot_events(game_id, type_code);

-- 3. Row-Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE shot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read shot_events"
  ON shot_events FOR SELECT
  USING (true);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shot_events;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
