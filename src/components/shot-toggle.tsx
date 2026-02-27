"use client";

interface ShotToggleProps {
  isGoalsOnly: boolean;
  onToggle: (goalsOnly: boolean) => void;
}

export function ShotToggle({ isGoalsOnly, onToggle }: ShotToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`text-sm ${!isGoalsOnly ? "font-bold text-white" : "opacity-60"}`}
      >
        All Shots
      </span>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={isGoalsOnly}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label="Toggle between all shots and goals only"
      />
      <span
        className={`text-sm ${isGoalsOnly ? "font-bold text-white" : "opacity-60"}`}
      >
        Goals Only
      </span>
    </div>
  );
}
