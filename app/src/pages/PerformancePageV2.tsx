import { useMemo, useState } from "react";
import { DateRangeTabs } from "../components/DateRangeTabs";
import { KpiTile } from "../components/KpiTile";
import { WaitingStackChart } from "../components/WaitingStackChart";
import { VolumeChart } from "../components/VolumeChart";
import { FlowRateSection } from "../components/FlowRateSection";
import { ErrorBreakdownChart } from "../components/ErrorBreakdownChart";
import { SortersTableV2 } from "../components/SortersTableV2";
import { metricConfigs } from "../data/mock";
import type { DateRangeKey } from "../data/mock";
import {
  rangePayloadsV2,
  resolveCustomRangeV2,
  toSorterV2,
} from "../data/mockV2";
import type { V2ChartType } from "../data/mockV2";
import { getSortersForRange } from "../data/sortersData";
import { rangeIsoBounds } from "../data/mock";

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Days in the range (rough count for sorter metric scaling)
function dayCount(range: DateRangeKey, custom?: { start: Date; end: Date }): number {
  if (range === "today") return 1;
  if (range === "custom" && custom) {
    return Math.max(1, Math.round((custom.end.getTime() - custom.start.getTime()) / 86400000) + 1);
  }
  return 7;
}

type ChartAreaProps = {
  chartType: V2ChartType;
  payload: ReturnType<typeof resolveCustomRangeV2>;
  percentMetricKey?: keyof typeof metricConfigs;
  errorBreakdownKey?: "parcel" | "pallet";
};

function ChartArea({ chartType, payload, percentMetricKey, errorBreakdownKey }: ChartAreaProps) {
  if (chartType === "waiting" && payload.week) {
    return (
      <VolumeChart
        data={payload.week}
        metric={metricConfigs["processed"]}
        visibleDays={payload.visibleDays}
      />
    );
  }

  if (chartType === "percent" && percentMetricKey && payload.week) {
    const metric = metricConfigs[percentMetricKey];
    return (
      <VolumeChart
        data={payload.week}
        metric={metric}
        visibleDays={payload.visibleDays}
      />
    );
  }

  if (chartType === "errorBreakdown" && errorBreakdownKey === "parcel" && payload.parcelErrorWeek) {
    return <ErrorBreakdownChart data={payload.parcelErrorWeek} mode="parcel" visibleDays={payload.visibleDays} />;
  }

  if (chartType === "errorBreakdown" && errorBreakdownKey === "pallet" && payload.palletErrorWeek) {
    return <ErrorBreakdownChart data={payload.palletErrorWeek} mode="pallet" visibleDays={payload.visibleDays} />;
  }

  if (chartType === "errorBreakdown") {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-card border border-dashed border-line-hovered bg-surface-hovered">
        <p className="text-body-md text-ink-subdued">Error breakdown chart — coming soon</p>
      </div>
    );
  }

  if (chartType === "dwell" && payload.waitingWeek) {
    return (
      <WaitingStackChart
        data={payload.waitingWeek}
        visibleDays={payload.visibleDays}
      />
    );
  }

  return null;
}

export function PerformancePageV2() {
  const [range, setRange] = useState<DateRangeKey>("today");
  const [selectedMetric, setSelectedMetric] = useState("parcelsCompleted");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date }>({
    start: new Date("2026-02-14T00:00:00"),
    end: new Date("2026-02-15T00:00:00"),
  });

  const payload = useMemo(() => {
    if (range === "custom") return resolveCustomRangeV2(customRange.start, customRange.end);
    return rangePayloadsV2[range];
  }, [range, customRange]);

  const sorterDays = useMemo(() => dayCount(range, range === "custom" ? customRange : undefined), [range, customRange]);

  const sortersV2 = useMemo(() => {
    let isoStart: string, isoEnd: string;
    if (range === "custom") {
      isoStart = toIso(customRange.start);
      isoEnd = toIso(customRange.end);
    } else {
      const bounds = rangeIsoBounds[range];
      isoStart = bounds.start;
      isoEnd = bounds.end;
    }
    const rawSorters = getSortersForRange(isoStart, isoEnd);
    return rawSorters.map((s) => toSorterV2(s, sorterDays));
  }, [range, customRange, sorterDays]);

  const selectedKpi = payload.kpis.find((k) => k.key === selectedMetric) ?? payload.kpis[0];
  const chartType = selectedKpi?.chartType ?? "waiting";
  const percentMetricKey = selectedKpi?.percentMetricKey;
  const errorBreakdownKey = selectedKpi?.errorBreakdownKey;

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="mx-auto w-full max-w-[1200px] px-12 pt-12 pb-16">
        <h1 className="text-display-lg text-ink">Performance</h1>

        {/* Date range tabs */}
        <div className="mt-8">
          <DateRangeTabs
            value={range}
            onChange={setRange}
            selectedLabel={payload.label}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>

        {/* Metrics section */}
        <section className="mt-10">
          <h2 className="mb-5 text-display-md text-ink">Metrics</h2>
          <div className="grid grid-cols-3 gap-4">
            {payload.kpis.map((kpi) => (
              <KpiTile
                key={kpi.key}
                kpi={kpi}
                selected={selectedMetric === kpi.key}
                onClick={() => setSelectedMetric(kpi.key)}
              />
            ))}
          </div>
        </section>

        {/* Chart area — driven by selected tile */}
        <section className="mt-10">
          <ChartArea
            chartType={chartType}
            payload={payload}
            percentMetricKey={percentMetricKey}
            errorBreakdownKey={errorBreakdownKey}
          />
        </section>

        {/* Flow rate section */}
        <section className="mt-10">
          <FlowRateSection flowRateWeek={payload.flowRateWeek} />
        </section>

        {/* Sorters table */}
        <section className="mt-10">
          <SortersTableV2 sorters={sortersV2} />
        </section>
      </div>
    </div>
  );
}
