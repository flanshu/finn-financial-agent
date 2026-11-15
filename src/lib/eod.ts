// Pair daily bars before filtering; never mix a close and volume from different dates.
export function completedBars(chart: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[]; volume?: (number | null)[] }[] } }, now = Date.now()) {
  const quotes = chart.indicators?.quote?.[0];
  const india = new Date(now + 330 * 60000);
  const today = india.toISOString().slice(0, 10);
  const minutes = india.getUTCHours() * 60 + india.getUTCMinutes();
  return (chart.timestamp || []).flatMap((timestamp, index) => {
    const date = new Date(timestamp * 1000 + 330 * 60000).toISOString().slice(0, 10);
    const close = quotes?.close?.[index], volume = quotes?.volume?.[index];
    if (date > today || (date === today && minutes < 15 * 60 + 35) || typeof close !== "number" || !Number.isFinite(close) || close <= 0 || typeof volume !== "number" || !Number.isFinite(volume) || volume < 0) return [];
    return [{ close, volume, date }];
  });
}
