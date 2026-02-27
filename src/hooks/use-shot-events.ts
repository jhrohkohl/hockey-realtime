"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/services/supabase-browser";
import type { ShotEventRow } from "@/types/database";

export function useShotEvents(
  gameId: number,
  initialShots: ShotEventRow[]
): ShotEventRow[] {
  const [shots, setShots] = useState<ShotEventRow[]>(initialShots);

  useEffect(() => {
    setShots(initialShots);
  }, [gameId, initialShots]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`shots-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shot_events",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const newShot = payload.new as ShotEventRow;
          setShots((prev) => {
            if (prev.some((s) => s.event_id === newShot.event_id)) {
              return prev;
            }
            return [...prev, newShot];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return shots;
}
