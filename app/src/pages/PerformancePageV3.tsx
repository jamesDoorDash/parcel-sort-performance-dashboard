import { useMemo, useState } from "react";
import { DateRangeTabs } from "../components/DateRangeTabs";
import { SortersTableV3 } from "../components/SortersTableV3";
import { V3FlowBreakoutChart } from "../components/V3FlowBreakoutChart";
import { V3MetricChart } from "../components/V3MetricChart";
import { V3MetricSelectorCard } from "../components/V3MetricSelectorCard";
import { WaitingStackChart } from "../components/WaitingStackChart";
import { VolumeChart } from "../components/VolumeChart";
import type { DateRangeKey } from "../data/mock";
import { metricConfigs, rangeIsoBounds } from "../data/mock";
import { applySorterTargetStatuses, toSorterV2 } from "../data/mockV2";
import { getMetricDefinition, rangePayloadsV3, resolveCustomRangeV3 } from "../data/mockV3";
import type { V3MetricId } from "../data/mockV3";
import { getSortersForRange } from "../data/sortersData";

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayValue = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayValue}`;
}

function dayCount(range: DateRangeKey, custom?: { start: Date; end: Date }) {
  if (range === "today") return 1;
  if (range === "custom" && custom) {
    return Math.max(1, Math.round((custom.end.getTime() - custom.start.getTime()) / 86400000) + 1);
  }
  return 7;
}

export function PerformancePageV3() {
  const [range, setRange] = useState<DateRangeKey>("thisWeek");
  const [selectedMetric, setSelectedMetric] = useState<V3MetricId>("parcelDwellTime");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date }>({
    start: new Date("2026-02-14T00:00:00"),
    end: new Date("2026-02-15T00:00:00"),
  });

  const payload = useMemo(() => {
    if (range === "custom") return resolveCustomRangeV3(customRange.start, customRange.end);
    return rangePayloadsV3[range];
  }, [customRange.end, customRange.start, range]);

  const metric = getMetricDefinition(selectedMetric);
  const sorterDays = useMemo(() => dayCount(range, range === "custom" ? customRange : undefined), [customRange, range]);

  const sorters = useMemo(() => {
    let isoStart: string;
    let isoEnd: string;

    if (range === "custom") {
      isoStart = toIso(customRange.start);
      isoEnd = toIso(customRange.end);
    } else {
      const bounds = rangeIsoBounds[range];
      isoStart = bounds.start;
      isoEnd = bounds.end;
    }

    const sorterRows = getSortersForRange(isoStart, isoEnd).map((sorter) => toSorterV2(sorter, sorterDays));
    return applySorterTargetStatuses(sorterRows);
  }, [customRange, range, sorterDays]);

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="mx-auto w-full max-w-[1220px] px-12 pt-12 pb-16">
        <h1 className="text-display-lg text-ink">Performance</h1>

        <div className="mt-6">
          <DateRangeTabs
            value={range}
            onChange={setRange}
            selectedLabel={payload.label}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>

        <section className="mt-8">
          <div className="grid grid-cols-4 gap-4">
            {payload.cards.map((card) => (
              <V3MetricSelectorCard
                key={card.id}
                card={card}
                selected={card.id === selectedMetric}
                onClick={() => setSelectedMetric(card.id as V3MetricId)}
              />
            ))}
          </div>
        </section>

        <section className="mt-8">
          {metric.chartKind === "processed" && (
            <VolumeChart
              data={payload.processedWeek}
              metric={metricConfigs.processed}
              visibleDays={payload.visibleDays}
            />
          )}

          {metric.chartKind === "waiting" && (
            <WaitingStackChart
              data={payload.waitingWeek}
              visibleDays={payload.visibleDays}
            />
          )}

          {metric.chartKind === "simple" && payload.simpleSeries[selectedMetric] && (
            <V3MetricChart
              data={payload.simpleSeries[selectedMetric] ?? []}
              target={metric.target}
              targetLabel={metric.targetLabel}
              isPercent={metric.unit === "percent"}
              visibleDays={payload.visibleDays}
              formatValue={(value) => metric.formatValue(value)}
            />
          )}

          {metric.chartKind === "flowBreakout" && (
            <V3FlowBreakoutChart
              data={payload.flowRateWeek["parcels-sort"]}
              visibleDays={payload.visibleDays}
            />
          )}
        </section>

        <section className="mt-8">
          <SortersTableV3 sorters={sorters} />
        </section>
      </div>
    </div>
  );
}
