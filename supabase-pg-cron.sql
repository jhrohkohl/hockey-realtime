-- ============================================================
-- NHL Shot Heatmap — pg_cron Setup
-- Run this in the Supabase SQL Editor AFTER deploying to Vercel
-- Replace the URL and secret with your actual values
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to poll live games (GET /api/ingest)
CREATE OR REPLACE FUNCTION call_ingest_endpoint()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM net.http_get(
    url := 'https://hockey-realtime.vercel.app/api/ingest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer nhl-cron-9f3c7b1a2e84f6a0742'
    )
  );
END;
$$;

-- Schedule live-game polling every 30 seconds
SELECT cron.schedule(
  'poll-nhl-api',
  '30 seconds',
  'SELECT call_ingest_endpoint()'
);

-- Function to reconcile yesterday's data (POST /api/ingest with yesterday's date)
-- Catches overnight NHL stat corrections (reclassified shots, coordinate fixes, etc.)
CREATE OR REPLACE FUNCTION reconcile_yesterday()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://hockey-realtime.vercel.app/api/ingest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer nhl-cron-9f3c7b1a2e84f6a0742',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'date', to_char(now() AT TIME ZONE 'America/New_York' - INTERVAL '1 day', 'YYYY-MM-DD')
    )
  );
END;
$$;

-- Schedule daily reconciliation at 5:00 AM ET (10:00 UTC)
SELECT cron.schedule(
  'reconcile-yesterday',
  '0 10 * * *',
  'SELECT reconcile_yesterday()'
);
