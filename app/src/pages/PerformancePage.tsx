import { useMemo, useState } from "react";
import { DateRangeTabs } from "../components/DateRangeTabs";
import { VolumeChart } from "../components/VolumeChart";
import { KpiTile } from "../components/KpiTile";
import { SortersTable } from "../components/SortersTable";
import {
  type DateRangeKey,
  type MetricKey,
  metricConfigs,
  rangePayloads,
  resolveCustomRange,
  sorters,
} from "../data/mock";

export function PerformancePage() {
  const [range, setRange] = useState<DateRangeKey>("today");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("processed");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date }>({
    start: new Date("2026-02-14T00:00:00"),
    end: new Date("2026-02-15T00:00:00"),
  });

  const payload = useMemo(() => {
    if (range === "custom") return resolveCustomRange(customRange.start, customRange.end);
    return rangePayloads[range];
  }, [range, customRange]);

  const showChart = payload.week != null;
  const metric = metricConfigs[selectedMetric];

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="mx-auto w-full max-w-[1200px] px-12 pt-12 pb-16">
        <h1 className="text-display-lg text-ink">Performance</h1>

        <div className="mt-8">
          <DateRangeTabs
            value={range}
            onChange={setRange}
            selectedLabel={payload.label}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>

        {/* Volume chart — only when range resolves to a Mon–Sun week */}
        {showChart && payload.week && (
          <section className="mt-10">
            <VolumeChart
              data={payload.week}
              metric={metric}
              visibleDays={payload.visibleDays}
            />
          </section>
        )}

        {/* KPI grid */}
        <section className="mt-10 grid grid-cols-4 gap-4">
          {payload.kpis.map((kpi) => (
            <KpiTile
              key={kpi.key}
              kpi={kpi}
              selected={selectedMetric === kpi.key}
              onClick={() => setSelectedMetric(kpi.key as MetricKey)}
            />
          ))}
        </section>

        {/* Sorters table */}
        <section className="mt-10">
          <SortersTable sorters={sorters} />
        </section>
      </div>
    </div>
  );
}
