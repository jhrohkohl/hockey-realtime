import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/services/supabase-server";
import {
  fetchScoreByDate,
  fetchPlayByPlay,
  extractShotEvents,
  fetchShiftChart,
  extractShiftInserts,
} from "@/services/nhl-api";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST /api/seed
 * Body: { "startDate": "2025-10-07", "endDate": "2026-02-27" }
 *
 * Iterates through each date, fetches games + play-by-play for finished games,
 * and upserts into Supabase. Streams progress. Throttled to avoid 429s.
 */
export const maxDuration = 300; // 5 min (Vercel Pro), locally unlimited

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const startDate = body.startDate as string;
  const endDate = body.endDate as string;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const encoder = new TextEncoder();
  let totalGames = 0;
  let totalShots = 0;
  let totalShifts = 0;
  let errorCount = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];

        try {
          await delay(500); // throttle between date fetches
          const scoreData = await fetchScoreByDate(dateStr);
          const finishedGames = scoreData.games.filter(
            (g) => g.gameState === "OFF" || g.gameState === "FINAL"
          );

          if (finishedGames.length > 0) {
            const gameUpserts = finishedGames.map((game) => ({
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

            await supabase
              .from("games")
              .upsert(gameUpserts, { onConflict: "id" });

            for (const game of finishedGames) {
              try {
                await delay(300); // throttle between play-by-play fetches
                const pbp = await fetchPlayByPlay(game.id);
                const shotInserts = extractShotEvents(pbp.plays, game.id, pbp.homeTeam.id);

                if (shotInserts.length > 0) {
                  await supabase.from("shot_events").upsert(shotInserts, {
                    onConflict: "game_id,event_id",
                    ignoreDuplicates: true,
                  });
                  totalShots += shotInserts.length;
                }

                try {
                  await delay(200);
                  const shiftRecords = await fetchShiftChart(game.id);
                  const shiftInserts = extractShiftInserts(shiftRecords, game.id);
                  if (shiftInserts.length > 0) {
                    await supabase.from("shifts").upsert(shiftInserts, {
                      onConflict: "id",
                      ignoreDuplicates: true,
                    });
                    totalShifts += shiftInserts.length;
                  }
                } catch {
                  // Non-fatal: shifts are enrichment data
                }

                totalGames++;
              } catch (err) {
                // Retry once on 429
                if (String(err).includes("429")) {
                  await delay(5000);
                  try {
                    const pbp = await fetchPlayByPlay(game.id);
                    const shotInserts = extractShotEvents(pbp.plays, game.id, pbp.homeTeam.id);
                    if (shotInserts.length > 0) {
                      await supabase.from("shot_events").upsert(shotInserts, {
                        onConflict: "game_id,event_id",
                        ignoreDuplicates: true,
                      });
                      totalShots += shotInserts.length;
                    }

                    try {
                      await delay(200);
                      const shiftRecords = await fetchShiftChart(game.id);
                      const shiftInserts = extractShiftInserts(shiftRecords, game.id);
                      if (shiftInserts.length > 0) {
                        await supabase.from("shifts").upsert(shiftInserts, {
                          onConflict: "id",
                          ignoreDuplicates: true,
                        });
                        totalShifts += shiftInserts.length;
                      }
                    } catch {
                      // Non-fatal
                    }

                    totalGames++;
                  } catch {
                    errorCount++;
                  }
                } else {
                  errorCount++;
                }
              }
            }
          }

          const progress = `${dateStr}: ${finishedGames.length} games (total: ${totalGames} games, ${totalShots} shots, ${totalShifts} shifts)\n`;
          controller.enqueue(encoder.encode(progress));
        } catch (err) {
          // Retry date fetch on 429
          if (String(err).includes("429")) {
            await delay(5000);
            try {
              const scoreData = await fetchScoreByDate(dateStr);
              const finishedGames = scoreData.games.filter(
                (g) => g.gameState === "OFF" || g.gameState === "FINAL"
              );

              if (finishedGames.length > 0) {
                const gameUpserts = finishedGames.map((game) => ({
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

                await supabase
                  .from("games")
                  .upsert(gameUpserts, { onConflict: "id" });

                for (const game of finishedGames) {
                  try {
                    await delay(500);
                    const pbp = await fetchPlayByPlay(game.id);
                    const shotInserts = extractShotEvents(pbp.plays, game.id, pbp.homeTeam.id);
                    if (shotInserts.length > 0) {
                      await supabase.from("shot_events").upsert(shotInserts, {
                        onConflict: "game_id,event_id",
                        ignoreDuplicates: true,
                      });
                      totalShots += shotInserts.length;
                    }

                    try {
                      await delay(200);
                      const shiftRecords = await fetchShiftChart(game.id);
                      const shiftInserts = extractShiftInserts(shiftRecords, game.id);
                      if (shiftInserts.length > 0) {
                        await supabase.from("shifts").upsert(shiftInserts, {
                          onConflict: "id",
                          ignoreDuplicates: true,
                        });
                        totalShifts += shiftInserts.length;
                      }
                    } catch {
                      // Non-fatal
                    }

                    totalGames++;
                  } catch {
                    errorCount++;
                  }
                }
              }

              const progress = `${dateStr}: ${finishedGames.length} games (retry ok, total: ${totalGames} games, ${totalShots} shots, ${totalShifts} shifts)\n`;
              controller.enqueue(encoder.encode(progress));
            } catch {
              controller.enqueue(
                encoder.encode(`${dateStr}: FAILED after retry\n`)
              );
              errorCount++;
            }
          } else {
            controller.enqueue(
              encoder.encode(`${dateStr}: ERROR ${String(err)}\n`)
            );
            errorCount++;
          }
        }

        current.setDate(current.getDate() + 1);
      }

      const summary = `\nDone! ${totalGames} games, ${totalShots} shots, ${totalShifts} shifts, ${errorCount} errors\n`;
      controller.enqueue(encoder.encode(summary));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
