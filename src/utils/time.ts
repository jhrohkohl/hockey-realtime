/**
 * Converts "MM:SS" period time string to total seconds.
 * Examples: "05:30" → 330, "12:00" → 720, "00:00" → 0
 */
export function timeToSeconds(mmss: string): number {
  const [minutes, seconds] = mmss.split(":").map(Number);
  return minutes * 60 + seconds;
}
