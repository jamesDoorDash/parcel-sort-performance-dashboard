export const metricTargetDefinitions = [
  { key: "processed", value: 2400 },
  { key: "pallets", value: 100 },
  { key: "trucksOnTime", value: 95 },
  { key: "missort", value: 0.1 },
  { key: "loss", value: 0.01 },
  { key: "preSortSpeed", value: 120 },
  { key: "sortSpeed", value: 140 },
  { key: "loadSpeed", value: 135 },
] as const;

export type KnownMetricTargetKey = (typeof metricTargetDefinitions)[number]["key"];

export const metricTargets = Object.fromEntries(
  metricTargetDefinitions.map(({ key, value }) => [key, value]),
) as Record<KnownMetricTargetKey, number>;

export const sorterTargets = {
  preSort: metricTargets.preSortSpeed,
  sort: metricTargets.sortSpeed,
  load: metricTargets.loadSpeed,
  missort: metricTargets.missort,
  loss: metricTargets.loss,
} as const;

export function getMetricTarget(key: KnownMetricTargetKey) {
  return metricTargets[key];
}
