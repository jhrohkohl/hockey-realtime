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
          event: "*",
          schema: "public",
          table: "shot_events",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newShot = payload.new as ShotEventRow;
            setShots((prev) => {
              if (prev.some((s) => s.event_id === newShot.event_id)) return prev;
              return [...prev, newShot];
            });
          } else if (payload.eventType === "UPDATE") {
            // Handles typeCode changes (e.g. goal 505 → shot-on-goal 506
            // after a successful coach's challenge).
            const updated = payload.new as ShotEventRow;
            setShots((prev) =>
              prev.map((s) => (s.event_id === updated.event_id ? updated : s)),
            );
          } else if (payload.eventType === "DELETE") {
            // Handles events removed from the PBP entirely (reversed goals).
            // Default replica identity only provides the primary key.
            const old = payload.old as { id?: number };
            if (old.id != null) {
              setShots((prev) => prev.filter((s) => s.id !== old.id));
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return shots;
}
