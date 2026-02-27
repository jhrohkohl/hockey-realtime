-- ============================================================
-- NHL Shot Heatmap — pg_cron Setup
-- Run this in the Supabase SQL Editor AFTER deploying to Vercel
-- Replace the URL and secret with your actual values
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Store the cron secret and app URL as database settings
ALTER DATABASE postgres SET app.ingest_url = 'https://your-app.vercel.app/api/ingest';
ALTER DATABASE postgres SET app.cron_secret = 'your-cron-secret-here';

-- Function to call the ingestion endpoint
CREATE OR REPLACE FUNCTION call_ingest_endpoint()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.ingest_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule polling every 30 seconds
SELECT cron.schedule(
  'poll-nhl-api',
  '30 seconds',
  'SELECT call_ingest_endpoint()'
);
