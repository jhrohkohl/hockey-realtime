import { createSupabaseServerClient } from "@/services/supabase-server";
import { LeagueHeatmapClient } from "@/components/league-heatmap-client";
import { fetchScoreByDate } from "@/services/nhl-api";
import type { LeagueShotRow, AvailableTeam } from "@/types/league";

export const dynamic = "force-dynamic";

interface LeaguePageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

function getTodayET(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const NHL_TEAMS = new Set([
  "ANA", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL",
  "DAL", "DET", "EDM", "FLA", "LAK", "MIN", "MTL", "NJD",
  "NSH", "NYI", "NYR", "OTT", "PHI", "PIT", "SEA", "SJS",
  "STL", "TBL", "TOR", "UTA", "VAN", "VGK", "WPG", "WSH",
]);

function getAvailableTeams(
  games: { home_team_abbrev: string; away_team_abbrev: string; home_team_name: string; away_team_name: string }[],
): AvailableTeam[] {
  const teamMap = new Map<string, string>();
  for (const g of games) {
    if (NHL_TEAMS.has(g.home_team_abbrev)) teamMap.set(g.home_team_abbrev, g.home_team_name);
    if (NHL_TEAMS.has(g.away_team_abbrev)) teamMap.set(g.away_team_abbrev, g.away_team_name);
  }
  return Array.from(teamMap.entries())
    .map(([abbrev, name]) => ({ abbrev, name }))
    .sort((a, b) => a.abbrev.localeCompare(b.abbrev));
}

/** Count games per team abbreviation (each team plays once per game as home or away). */
function getTeamGameCounts(
  games: { home_team_abbrev: string; away_team_abbrev: string }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const g of games) {
    counts[g.home_team_abbrev] = (counts[g.home_team_abbrev] ?? 0) + 1;
    counts[g.away_team_abbrev] = (counts[g.away_team_abbrev] ?? 0) + 1;
  }
  return counts;
}

/** Build a mapping from team_id → team abbreviation. */
function getTeamIdToAbbrev(
  games: { home_team_id: number; away_team_id: number; home_team_abbrev: string; away_team_abbrev: string }[],
): Record<number, string> {
  const map: Record<number, string> = {};
  for (const g of games) {
    map[g.home_team_id] = g.home_team_abbrev;
    map[g.away_team_id] = g.away_team_abbrev;
  }
  return map;
}

export default async function LeaguePage(props: LeaguePageProps) {
  const searchParams = await props.searchParams;
  const todayET = getTodayET();

  const supabase = createSupabaseServerClient();

  // Default "from" = earliest game in the DB (season opener)
  let seasonStartDate = todayET;
  const { data: earliest } = await supabase
    .from("games")
    .select("game_date")
    .order("game_date", { ascending: true })
    .limit(1)
    .single();
  if (earliest?.game_date) {
    seasonStartDate = earliest.game_date;
  }

  const from = searchParams.from || seasonStartDate;
  const to = searchParams.to || todayET;

  // 1. Query all games in the date range
  const { data: allGames } = await supabase
    .from("games")
    .select("id, home_team_id, away_team_id, home_team_abbrev, away_team_abbrev, home_team_name, away_team_name")
    .gte("game_date", from)
    .lte("game_date", to);

  let games = allGames ?? [];

  // If DB has no games for today, try fetching from NHL API
  if (games.length === 0 && from === to) {
    try {
      const scoreData = await fetchScoreByDate(from);
      if (scoreData.games.length > 0) {
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
        await supabase.from("games").upsert(gameUpserts, { onConflict: "id" });

        const { data: refreshed } = await supabase
          .from("games")
          .select("id, home_team_id, away_team_id, home_team_abbrev, away_team_abbrev, home_team_name, away_team_name")
          .gte("game_date", from)
          .lte("game_date", to);
        games = refreshed ?? [];
      }
    } catch {
      // Silently fall through — show empty state
    }
  }

  // 2. Derive metadata from ALL games (no server-side team filtering)
  const availableTeams = getAvailableTeams(games);
  const teamIdToAbbrev = getTeamIdToAbbrev(games);
  const teamGameCounts = getTeamGameCounts(games);

  // 3. Build homeTeamMap
  const homeTeamMap: Record<number, number> = {};
  for (const g of games) {
    homeTeamMap[g.id] = g.home_team_id;
  }

  // 4. Query ALL shot events (team filtering happens on client)
  const gameIds = games.map((g) => g.id);
  let shots: LeagueShotRow[] = [];
  if (gameIds.length > 0) {
    const PAGE_SIZE = 1000;
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase
        .from("shot_events")
        .select("game_id, x_coord, y_coord, type_code, team_id, home_team_defending_side, goalie_player_id, strength")
        .in("game_id", gameIds)
        .in("type_code", [505, 506])
        .range(offset, offset + PAGE_SIZE - 1);

      const rows = (data ?? []) as LeagueShotRow[];
      shots.push(...rows);
      hasMore = rows.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }
  }

  return (
    <main className="mx-auto max-w-[120rem] px-4 sm:px-6 py-6">
      <LeagueHeatmapClient
        shots={shots}
        homeTeamMap={homeTeamMap}
        availableTeams={availableTeams}
        from={from}
        to={to}
        seasonStartDate={seasonStartDate}
        teamIdToAbbrev={teamIdToAbbrev}
        teamGameCounts={teamGameCounts}
        totalGameCount={games.length}
      />
    </main>
  );
}
