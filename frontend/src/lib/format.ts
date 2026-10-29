export const percent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

export const ms = (value: number) => `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`;

export function duration(totalMs: number): string {
  const total = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const clockTime = (iso: string | number | Date) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
