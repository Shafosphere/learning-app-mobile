const UNITS = [
  { divisor: 1_000, suffix: "k" },
  { divisor: 1_000_000, suffix: "M" },
  { divisor: 1_000_000_000, suffix: "B" },
  { divisor: 1_000_000_000_000, suffix: "T" },
] as const;

export function formatNavbarStatValue(
  value: number,
  locale: string,
  maxLength: 4 | 5,
): string {
  if (value < 1_000) return String(value);

  for (let index = 0; index < UNITS.length; index += 1) {
    const { divisor, suffix } = UNITS[index];
    const scaled = value / divisor;
    if (scaled >= 1_000 && index < UNITS.length - 1) continue;

    for (const fractionDigits of [1, 0]) {
      const factor = 10 ** fractionDigits;
      const rounded = Math.round(scaled * factor) / factor;
      // Rounding 999.5k should produce 1M, rather than 1000k.
      if (rounded >= 1_000 && index < UNITS.length - 1) break;

      const label = `${rounded.toLocaleString(locale, {
        useGrouping: false,
        maximumFractionDigits: fractionDigits,
      })}${suffix}`;
      if (label.length <= maxLength || fractionDigits === 0) return label;
    }
  }

  return String(value);
}
