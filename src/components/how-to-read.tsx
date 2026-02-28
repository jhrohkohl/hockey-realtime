"use client";

import { useState, useRef, useEffect } from "react";

const BULLETS = [
  "Each hexagon aggregates shots from that area of the ice.",
  "Left map = shot volume; right map = shooting success rate.",
  "Brighter color = more shots (or higher percentage).",
  "Select a team to see Offense (their shots) and Defense (shots against them).",
  "Use Compare to see how a team differs from the league average.",
];

export function HowToRead() {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !popoverRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[12px] text-white/30 hover:text-white/60 transition-colors
                   underline underline-offset-2 decoration-white/15 hover:decoration-white/35"
      >
        How to read this
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full mt-2 left-0 z-50 glass-tooltip px-5 py-4 w-[300px]"
        >
          <p className="text-[11px] font-semibold text-white/70 mb-3 uppercase tracking-wider">
            Reading the maps
          </p>
          <ul className="space-y-2">
            {BULLETS.map((text) => (
              <li
                key={text}
                className="flex gap-2 text-[11px] text-white/50 leading-relaxed"
              >
                <span className="text-white/20 mt-px shrink-0">&bull;</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
