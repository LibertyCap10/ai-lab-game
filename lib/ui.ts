
export function meterBar(value: number, width = 18) {
  const filled = Math.round((value / 100) * width);
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}
