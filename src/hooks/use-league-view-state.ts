"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  Scope,
  ViewMode,
  Baseline,
  HexSize,
  StrengthFilter,
  LeagueViewState,
} from "@/types/league";

const INITIAL_STATE: LeagueViewState = {
  view: "league",
  baseline: "league",
  hexSize: "M",
  strengthFilter: "ALL",
  minSample: 5,
  hideLowSample: false,
  teamA: null,
  teamB: null,
};

export function useLeagueViewState() {
  const [state, setState] = useState<LeagueViewState>(INITIAL_STATE);

  /** Derive the data-layer scope from UI-level view + baseline */
  const scope: Scope = useMemo(() => {
    if (state.view === "league") return "league";
    if (state.view === "team") return "team";
    return state.baseline === "league" ? "team-vs-league" : "team-vs-team";
  }, [state.view, state.baseline]);

  const setView = useCallback((view: ViewMode) => {
    setState((prev) => {
      const next = { ...prev, view };
      if (view === "league") {
        next.teamA = null;
        next.teamB = null;
      } else if (view === "team") {
        next.teamB = null;
      }
      return next;
    });
  }, []);

  const setBaseline = useCallback((baseline: Baseline) => {
    setState((prev) => {
      const next = { ...prev, baseline };
      if (baseline === "league") {
        next.teamB = null;
      }
      return next;
    });
  }, []);

  const setHexSize = useCallback((hexSize: HexSize) => {
    setState((prev) => ({ ...prev, hexSize }));
  }, []);

  const setStrengthFilter = useCallback((strengthFilter: StrengthFilter) => {
    setState((prev) => ({ ...prev, strengthFilter }));
  }, []);

  const setMinSample = useCallback((minSample: number) => {
    setState((prev) => ({ ...prev, minSample }));
  }, []);

  const setHideLowSample = useCallback((hideLowSample: boolean) => {
    setState((prev) => ({ ...prev, hideLowSample }));
  }, []);

  const setTeamA = useCallback((teamA: string | null) => {
    setState((prev) => ({ ...prev, teamA }));
  }, []);

  const setTeamB = useCallback((teamB: string | null) => {
    setState((prev) => ({ ...prev, teamB }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    scope,
    setView,
    setBaseline,
    setHexSize,
    setStrengthFilter,
    setMinSample,
    setHideLowSample,
    setTeamA,
    setTeamB,
    reset,
  };
}
