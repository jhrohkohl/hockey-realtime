"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/services/supabase-browser";
import type { GameRow } from "@/types/database";

export function useGamesToday(initialGames: GameRow[], date: string): { games: GameRow[] } {
  const [games, setGames] = useState<GameRow[]>(initialGames);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`games-${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `game_date=eq.${date}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setGames((prev) => [...prev, payload.new as GameRow]);
          } else if (payload.eventType === "UPDATE") {
            setGames((prev) =>
              prev.map((g) =>
                g.id === (payload.new as GameRow).id
                  ? (payload.new as GameRow)
                  : g
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date]);

  return { games };
}
