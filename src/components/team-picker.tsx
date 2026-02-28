"use client";

import { Fragment, useState, useMemo, useEffect, useRef } from "react";

interface AvailableTeam {
  abbrev: string;
  name: string;
}

interface TeamPickerProps {
  availableTeams: AvailableTeam[];
  selectedTeams: string[];
  onTeamsChange: (teams: string[]) => void;
  /** When true, only one team can be selected at a time */
  singleSelect?: boolean;
}

export function TeamPicker({
  availableTeams,
  selectedTeams,
  onTeamsChange,
  singleSelect = false,
}: TeamPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selectedTeams), [selectedTeams]);

  const displayText =
    selectedTeams.length === 0
      ? "All Teams"
      : selectedTeams.length <= 3
        ? selectedTeams.join(", ")
        : `${selectedTeams.length} teams`;

  // Build filtered option list
  const options = useMemo(() => {
    const lq = query.toLowerCase().trim();
    const result: AvailableTeam[] = [];
    for (const t of availableTeams) {
      if (lq && !`${t.abbrev} ${t.name}`.toLowerCase().includes(lq)) continue;
      result.push(t);
    }
    return result;
  }, [availableTeams, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  // Click outside to close
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

  // Scroll active option into view
  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  function toggleTeam(abbrev: string) {
    if (singleSelect) {
      // In single-select mode, selecting the same team deselects it;
      // otherwise replace with the new team and close the dropdown
      if (selectedSet.has(abbrev)) {
        onTeamsChange([]);
      } else {
        onTeamsChange([abbrev]);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
      return;
    }
    if (selectedSet.has(abbrev)) {
      onTeamsChange(selectedTeams.filter((t) => t !== abbrev));
    } else {
      onTeamsChange([...selectedTeams, abbrev]);
    }
  }

  function clearAll() {
    onTeamsChange([]);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // offset by 1 for the "All Teams" option
    const totalOptions = options.length + 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, totalOptions - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex === 0) {
          clearAll();
        } else {
          const opt = options[activeIndex - 1];
          if (opt) toggleTeam(opt.abbrev);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  }

  if (availableTeams.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium
                   bg-white/[0.04] border border-white/[0.10] rounded-md
                   hover:bg-white/[0.06] text-white/90
                   focus:outline-none focus:ring-2 focus:ring-[rgba(160,180,255,0.35)]
                   min-w-[120px] max-w-[200px] cursor-pointer transition-colors"
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

      {isOpen && (
        <div
          ref={panelRef}
          className="glass-dropdown absolute z-50 top-full mt-1.5 left-0 w-[260px]"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="px-1.5 pb-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams…"
              className="w-full px-2.5 py-1.5 text-[11px] text-white/90 placeholder:text-white/40
                         bg-white/[0.05] border border-white/[0.08] rounded-lg
                         focus:outline-none focus:border-white/[0.15]
                         transition-colors"
              aria-label="Search teams"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Options list */}
          <div
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            className="glass-dropdown-scroll max-h-[320px] overflow-y-auto px-1.5 pb-1.5"
          >
            {/* All Teams option */}
            <button
              type="button"
              role="option"
              data-index={0}
              aria-selected={selectedTeams.length === 0}
              onClick={clearAll}
              onMouseEnter={() => setActiveIndex(0)}
              className={`w-full flex items-center gap-2 px-2.5 h-[34px] rounded-lg text-[11px]
                font-medium transition-colors cursor-pointer
                ${activeIndex === 0 ? "bg-white/[0.08] text-white" : ""}
                ${selectedTeams.length === 0 && activeIndex !== 0 ? "bg-white/[0.10] text-white" : ""}
                ${activeIndex !== 0 && selectedTeams.length > 0 ? "text-white/70 hover:bg-white/[0.06]" : ""}
              `}
            >
              {selectedTeams.length === 0 && (
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
              <span className="truncate">All Teams</span>
            </button>

            {/* Divider */}
            <div className="mx-2 my-1 h-px bg-white/[0.06]" />

            {options.length === 0 ? (
              <div className="px-3 py-4 text-[11px] text-white/40 text-center">
                No teams found
              </div>
            ) : (
              options.map((team, i) => {
                const optIndex = i + 1;
                const isSelected = selectedSet.has(team.abbrev);
                return (
                  <button
                    key={team.abbrev}
                    type="button"
                    role="option"
                    data-index={optIndex}
                    aria-selected={isSelected}
                    onClick={() => toggleTeam(team.abbrev)}
                    onMouseEnter={() => setActiveIndex(optIndex)}
                    className={`w-full flex items-center gap-2 px-2.5 h-[34px] rounded-lg text-[11px]
                      font-medium transition-colors cursor-pointer
                      ${optIndex === activeIndex ? "bg-white/[0.08] text-white" : ""}
                      ${isSelected && optIndex !== activeIndex ? "bg-white/[0.10] text-white" : ""}
                      ${optIndex !== activeIndex && !isSelected ? "text-white/70 hover:bg-white/[0.06]" : ""}
                    `}
                  >
                    {isSelected && (
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
                    <img
                      src={`/team-logos/${team.abbrev}.png`}
                      alt=""
                      width={16}
                      height={16}
                      className="shrink-0"
                    />
                    <span className="font-semibold shrink-0">{team.abbrev}</span>
                    <span className="truncate text-white/50">{team.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
