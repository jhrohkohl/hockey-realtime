"use client";

import { Fragment, useState, useMemo, useEffect, useRef } from "react";
import type { RosterPlayer } from "@/types/roster";

interface PlayerPickerProps {
  roster: RosterPlayer[];
  selectedPlayerId: number | null;
  onPlayerChange: (playerId: number | null) => void;
  homeTeamId: number;
  homeTeamAbbrev: string;
  awayTeamAbbrev: string;
}

interface PickerOption {
  id: string;
  playerId: number | null;
  label: string;
  group: "all" | "away" | "home";
}

function playerLabel(p: RosterPlayer): string {
  return `#${p.sweaterNumber ?? "?"} ${p.lastName}, ${p.firstName}${p.positionCode ? ` (${p.positionCode})` : ""}`;
}

export function PlayerPicker({
  roster,
  selectedPlayerId,
  onPlayerChange,
  homeTeamId,
  homeTeamAbbrev,
  awayTeamAbbrev,
}: PlayerPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Display text for the trigger ─────────────────────────────
  const selectedPlayer = roster.find((p) => p.playerId === selectedPlayerId);
  const displayText = selectedPlayer
    ? `#${selectedPlayer.sweaterNumber ?? "?"} ${selectedPlayer.lastName}`
    : "All Players";

  // ── Build flat option list (filtered by query) ───────────────
  const options = useMemo(() => {
    const result: PickerOption[] = [];
    const lq = query.toLowerCase().trim();

    const matches = (p: RosterPlayer) => {
      if (!lq) return true;
      return `#${p.sweaterNumber ?? ""} ${p.lastName} ${p.firstName} ${p.positionCode ?? ""}`
        .toLowerCase()
        .includes(lq);
    };

    // Always include "All Players" so the user can reset
    result.push({ id: "all", playerId: null, label: "All Players", group: "all" });

    for (const p of roster.filter((r) => r.teamId !== homeTeamId && r.positionCode !== "G" && matches(r))) {
      result.push({ id: String(p.playerId), playerId: p.playerId, label: playerLabel(p), group: "away" });
    }

    for (const p of roster.filter((r) => r.teamId === homeTeamId && r.positionCode !== "G" && matches(r))) {
      result.push({ id: String(p.playerId), playerId: p.playerId, label: playerLabel(p), group: "home" });
    }

    return result;
  }, [roster, query, homeTeamId]);

  // ── Reset active index when search changes ───────────────────
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ── Focus input + reset state on open ────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  // ── Click-outside to close ───────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // ── Scroll active option into view ───────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  // ── Handlers (no useCallback — only used on non-memoized JSX) ─
  function selectOption(index: number) {
    const opt = options[index];
    if (opt) {
      onPlayerChange(opt.playerId);
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        selectOption(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  }

  // ── Group-header indices ─────────────────────────────────────
  const firstAwayIndex = options.findIndex((o) => o.group === "away");
  const firstHomeIndex = options.findIndex((o) => o.group === "home");

  if (roster.length === 0) return null;

  return (
    <div className="relative">
      {/* ── Trigger ──────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="player-listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium
                   bg-white/[0.04] border border-white/[0.10] rounded-md
                   hover:bg-white/[0.06] text-white/90
                   focus:outline-none focus:ring-2 focus:ring-[rgba(160,180,255,0.35)]
                   min-w-[140px] max-w-[200px] cursor-pointer transition-colors"
      >
        <span className="truncate flex-1 text-left">{displayText}</span>
        <svg
          className={`w-3 h-3 opacity-50 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {/* ── Dropdown panel ──────────────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="glass-dropdown absolute z-50 top-full mt-1.5 left-0 w-[280px]"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="px-1.5 pb-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players…"
              className="w-full px-2.5 py-1.5 text-[11px] text-white/90 placeholder:text-white/40
                         bg-white/[0.05] border border-white/[0.08] rounded-lg
                         focus:outline-none focus:border-white/[0.15]
                         transition-colors"
              aria-label="Search players"
              aria-activedescendant={
                options[activeIndex] ? `pp-opt-${options[activeIndex].id}` : undefined
              }
              aria-controls="player-listbox"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Options list */}
          <div
            ref={listRef}
            id="player-listbox"
            role="listbox"
            className="glass-dropdown-scroll max-h-[280px] overflow-y-auto px-1.5 pb-1.5"
          >
            {options.length === 0 ? (
              <div className="px-3 py-4 text-[11px] text-white/40 text-center">
                No players found
              </div>
            ) : (
              options.map((opt, i) => (
                <Fragment key={opt.id}>
                  {/* Team group header */}
                  {i === firstAwayIndex && (
                    <div className="px-2.5 pt-2 pb-1 text-[9px] font-semibold text-white/35 uppercase tracking-widest select-none">
                      {awayTeamAbbrev}
                    </div>
                  )}
                  {i === firstHomeIndex && (
                    <div className="px-2.5 pt-2 pb-1 text-[9px] font-semibold text-white/35 uppercase tracking-widest select-none">
                      {homeTeamAbbrev}
                    </div>
                  )}

                  {/* Option row */}
                  <button
                    type="button"
                    id={`pp-opt-${opt.id}`}
                    role="option"
                    data-index={i}
                    aria-selected={opt.playerId === selectedPlayerId}
                    onClick={() => selectOption(i)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full flex items-center gap-2 px-2.5 h-[34px] rounded-lg text-[11px]
                      font-medium transition-colors cursor-pointer
                      ${i === activeIndex ? "bg-white/[0.08] text-white" : ""}
                      ${opt.playerId === selectedPlayerId && i !== activeIndex ? "bg-white/[0.10] text-white" : ""}
                      ${i !== activeIndex && opt.playerId !== selectedPlayerId ? "text-white/70 hover:bg-white/[0.06]" : ""}
                    `}
                  >
                    {opt.playerId === selectedPlayerId && (
                      <svg
                        className="w-3 h-3 shrink-0 text-sh-accent"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M2 6L5 9L10 3" />
                      </svg>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </button>
                </Fragment>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
