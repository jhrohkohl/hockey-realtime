import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/services/supabase-server";
import {
  fetchTodaysGames,
  fetchPlayByPlay,
  extractShotEvents,
  fetchScoreByDate,
} from "@/services/nhl-api";

const POLLABLE_STATES = ["LIVE", "CRIT", "OFF", "FINAL"] as const;

/** POST: Seed a specific date's games + shots (for testing) */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const date = body.date as string; // YYYY-MM-DD
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  try {
    const scoreData = await fetchScoreByDate(date);

    const gameUpserts = scoreData.games.map((game) => ({
      id: game.id,
      season: game.season,
      game_date: game.gameDate,
      game_state: game.gameState,
      home_team_id: game.homeTeam.id,
      away_team_id: game.awayTeam.id,
      home_team_abbrev: game.homeTeam.abbrev,
      away_team_abbrev: game.awayTeam.abbrev,
      home_team_name: game.homeTeam.name.default,
      away_team_name: game.awayTeam.name.default,
      home_score: game.homeTeam.score ?? 0,
      away_score: game.awayTeam.score ?? 0,
      period_number: game.periodDescriptor?.number ?? null,
      period_type: game.periodDescriptor?.periodType ?? null,
      time_remaining: game.clock?.timeRemaining ?? null,
      start_time_utc: game.startTimeUTC,
      last_polled_at: new Date().toISOString(),
    }));

    if (gameUpserts.length > 0) {
      await supabase.from("games").upsert(gameUpserts, { onConflict: "id" });
    }

    let totalShotEvents = 0;
    const finishedGames = scoreData.games.filter(
      (g) => g.gameState === "OFF" || g.gameState === "FINAL"
    );

    for (const game of finishedGames) {
      const pbp = await fetchPlayByPlay(game.id);
      const shotInserts = extractShotEvents(pbp.plays, game.id);

      if (shotInserts.length > 0) {
        await supabase.from("shot_events").upsert(shotInserts, {
          onConflict: "game_id,event_id",
          ignoreDuplicates: true,
        });
        totalShotEvents += shotInserts.length;
      }
    }

    return NextResponse.json({
      ok: true,
      gamesSeeded: finishedGames.length,
      totalShotEvents,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  try {
    const scoreData = await fetchTodaysGames();

    // Upsert games
    const gameUpserts = scoreData.games.map((game) => ({
      id: game.id,
      season: game.season,
      game_date: game.gameDate,
      game_state: game.gameState,
      home_team_id: game.homeTeam.id,
      away_team_id: game.awayTeam.id,
      home_team_abbrev: game.homeTeam.abbrev,
      away_team_abbrev: game.awayTeam.abbrev,
      home_team_name: game.homeTeam.name.default,
      away_team_name: game.awayTeam.name.default,
      home_score: game.homeTeam.score ?? 0,
      away_score: game.awayTeam.score ?? 0,
      period_number: game.periodDescriptor?.number ?? null,
      period_type: game.periodDescriptor?.periodType ?? null,
      time_remaining: game.clock?.timeRemaining ?? null,
      start_time_utc: game.startTimeUTC,
      last_polled_at: new Date().toISOString(),
    }));

    if (gameUpserts.length > 0) {
      await supabase.from("games").upsert(gameUpserts, { onConflict: "id" });
    }

    // Poll play-by-play for live/recent games
    const pollableGames = scoreData.games.filter((g) =>
      POLLABLE_STATES.includes(
        g.gameState as (typeof POLLABLE_STATES)[number]
      )
    );

    let totalShotEvents = 0;

    for (const game of pollableGames) {
      const pbp = await fetchPlayByPlay(game.id);
      const shotInserts = extractShotEvents(pbp.plays, game.id);

      if (shotInserts.length > 0) {
        await supabase.from("shot_events").upsert(shotInserts, {
          onConflict: "game_id,event_id",
          ignoreDuplicates: true,
        });
        totalShotEvents += shotInserts.length;
      }
    }

    return NextResponse.json({
      ok: true,
      gamesPolled: pollableGames.length,
      totalGames: scoreData.games.length,
      totalShotEvents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Ingestion failed", details: String(error) },
      { status: 500 }
    );
  }
}
