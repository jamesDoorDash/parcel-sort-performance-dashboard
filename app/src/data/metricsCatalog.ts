// Catalog of every metric label and info tooltip exposed in V46 (hub + spoke).
// Hand-curated reference for the Admin page. Update whenever V46 copy changes.

export type CatalogElement =
  | { kind: "underline"; label: string }
  | { kind: "info"; label: string }
  | { kind: "swatchInfo"; label: string; color: string };

export type CatalogRow = {
  id: string;
  element: CatalogElement;
  // Body of the live tooltip — matches the production UI exactly.
  // Also rendered into the Definition column.
  tooltip: string;
  // Optional bold title shown above tooltip body (matches some production tooltips).
  tooltipTitle?: string;
  // Optional list rows shown below body — renders as "<bold> · <text>" lines.
  // Used by tooltips like Overall grade that show A/B/C/D/F rubric rows.
  tooltipExtra?: { bold: string; text: string }[];
  target: string;
  hub: boolean;
  spoke: boolean;
};

// ---------------------------------------------------------------------------
// Section 1 — Metrics (have a target)
// ---------------------------------------------------------------------------

export const metricRows: CatalogRow[] = [
  // Top-level metrics (Row 1)
  {
    id: "sortSlaCompliance",
    element: { kind: "underline", label: "Sort SLA compliance" },
    tooltip: "Percent of parcels sorted before the sort deadline in the selected period",
    target: "98%",
    hub: true,
    spoke: false,
  },
  {
    id: "binsReadyBy9am",
    element: { kind: "underline", label: "Bins ready by 9am" },
    tooltip: "Percent of spoke bins that are fully sorted and staged for runner pickup by 9:00am in the selected period.",
    target: "98%",
    hub: false,
    spoke: true,
  },
  {
    id: "controllableCpt",
    element: { kind: "underline", label: "Controllable CPT compliance" },
    tooltip: "Percent of trucks that departed before their critical pull time. Only includes delays within the facility's control — carrier or external delays are excluded.",
    target: "99%",
    hub: true,
    spoke: false,
  },
  {
    id: "onTimeDelivery",
    element: { kind: "underline", label: "On-time delivery" },
    tooltip: "Percent of parcels delivered to the customer on or before the target delivery date (end of day) in the selected period.",
    target: "99%",
    hub: false,
    spoke: true,
  },
  {
    id: "onTimeReturnsToMerchant",
    element: { kind: "underline", label: "On time returns to merchant" },
    tooltip: "Percent of parcels successfully returned in the selected period. Some days may have no expected return parcels",
    target: "98%",
    hub: true,
    spoke: true,
  },
  {
    id: "associatesMeetingTargets",
    element: { kind: "underline", label: "Associates meeting targets" },
    tooltipTitle: "Associates meeting targets",
    tooltip: "Number of associates whose average sort rate meets or exceeds their target rate for the selected period.",
    target: "All associates",
    hub: true,
    spoke: true,
  },

  // Parcels — related metrics
  {
    id: "parcelDwellTime",
    element: { kind: "underline", label: "Dwelled parcels" },
    tooltipTitle: "Dwelled parcels",
    tooltip: "Number of parcels that have dwelled for more than 24 hours in the selected period",
    target: "0",
    hub: true,
    spoke: true,
  },
  {
    id: "parcelMissortRate",
    element: { kind: "underline", label: "Parcel missort rate" },
    tooltipTitle: "Parcel missort rate",
    tooltip: "Percent of parcels that were scanned or placed into the wrong area during sorting",
    target: "0.1%",
    hub: true,
    spoke: true,
  },
  {
    id: "parcelLossRate",
    element: { kind: "underline", label: "Parcel loss rate" },
    tooltipTitle: "Parcel loss rate",
    tooltip: "Percent of parcels that still have not appeared in the expected area after 9 days with no further scans",
    target: "0.010%",
    hub: true,
    spoke: true,
  },

  // Trucks — related metrics (hub only)
  {
    id: "palletsScannedToTruck",
    element: { kind: "underline", label: "Pallets scanned to truck" },
    tooltipTitle: "Pallets scanned to truck",
    tooltip: "Percent of pallets successfully scanned to the correct truck before outbound",
    target: "100%",
    hub: true,
    spoke: false,
  },
  {
    id: "palletsMissloaded",
    element: { kind: "underline", label: "Pallets missloaded" },
    tooltipTitle: "Pallets missloaded",
    tooltip: "Percent of pallets that ended up at the wrong facility",
    target: "0.1%",
    hub: true,
    spoke: false,
  },

  // Returns — related metrics
  {
    id: "returnsScannedToPallet",
    element: { kind: "underline", label: "Returns scanned to pallet" },
    tooltipTitle: "Returns scanned to pallet",
    tooltip: "Percent of return parcels successfully scanned to a return pallet in the selected period",
    target: "98%",
    hub: true,
    spoke: true,
  },
  {
    id: "returnPalletsScannedToTruck",
    element: { kind: "underline", label: "Return pallets scanned to truck" },
    tooltipTitle: "Return pallets scanned to truck",
    tooltip: "Percent of return pallets successfully scanned to a truck in the selected period",
    target: "98%",
    hub: true,
    spoke: true,
  },

  // Flow rates (Row 2)
  {
    id: "parcelPreSortRate",
    element: { kind: "underline", label: "Parcel pre-sort rate" },
    tooltipTitle: "Parcel pre-sort rate",
    tooltip: "Blended average parcels pre-sorted per hour. Parcels over 2 lbs are weighted at 1.8x.",
    target: "145 / hr",
    hub: true,
    spoke: true,
  },
  {
    id: "parcelSortToPalletRate",
    element: { kind: "underline", label: "Parcel sort to pallet rate" },
    tooltipTitle: "Parcel sort to pallet rate",
    tooltip: "Blended average parcels sorted to pallet per hour. Parcels over 2 lbs are weighted at 1.8x.",
    target: "140 / hr",
    hub: true,
    spoke: false,
  },
  {
    id: "parcelSortToBinRate",
    element: { kind: "underline", label: "Parcel sort to bin rate" },
    tooltipTitle: "Parcel sort to bin rate",
    tooltip: "Average number of parcels sorted into the correct spoke bin per labor hour during active sort time in the selected period.",
    target: "140 / hr",
    hub: false,
    spoke: true,
  },
  {
    id: "palletLoadRate",
    element: { kind: "underline", label: "Pallet load rate" },
    tooltipTitle: "Pallet load rate",
    tooltip: "Average pallets loaded to truck per hour across the selected period.",
    target: "55 / hr",
    hub: true,
    spoke: false,
  },
  {
    id: "binDispatchRate",
    element: { kind: "underline", label: "Bin dispatch rate" },
    tooltipTitle: "Bin dispatch rate",
    tooltip: "Average number of spoke bins dispatched to runners per labor hour during active dispatch time in the selected period.",
    target: "55 / hr",
    hub: false,
    spoke: true,
  },
];

// ---------------------------------------------------------------------------
// Section 2 — Info tooltips (no target — definition only)
// ---------------------------------------------------------------------------

export const infoTooltipRows: CatalogRow[] = [
  {
    id: "overallGrade",
    element: { kind: "underline", label: "Overall grade" },
    tooltipTitle: "Overall facility grade",
    tooltip: "Based on how many of the 4 top-level metrics are at or above target for the selected period.",
    tooltipExtra: [
      { bold: "A", text: "4 of 4 at target" },
      { bold: "B", text: "3 at target" },
      { bold: "C", text: "2 at target" },
      { bold: "D", text: "1 at target" },
      { bold: "F", text: "0 at target" },
    ],
    target: "—",
    hub: true,
    spoke: true,
  },
  {
    id: "topSorters",
    element: { kind: "underline", label: "Top sorters" },
    tooltip: "The 3 associates ranked best on a combination of sort rate, parcels sorted, missorts, and lost items",
    target: "—",
    hub: true,
    spoke: true,
  },
  {
    id: "topLoaders",
    element: { kind: "underline", label: "Top loaders" },
    tooltip: "The 3 associates ranked best on a combination of load rate, pallets loaded, and load quality (missloaded pallets).",
    target: "—",
    hub: true,
    spoke: false,
  },
  {
    id: "mostInNeedOfCoachingHub",
    element: { kind: "underline", label: "Most in need of coaching" },
    tooltip: "The 3 most underperforming associates based on a combination of sort rates, load rates, missloads, missorts, lost items, idle time, and other quality metrics.",
    target: "—",
    hub: true,
    spoke: false,
  },
  {
    id: "mostInNeedOfCoachingSpoke",
    element: { kind: "underline", label: "Most in need of coaching" },
    tooltip: "The 3 most underperforming associates based on a combination of sort rates, missorts, lost items, idle time, and other quality metrics",
    target: "—",
    hub: false,
    spoke: true,
  },
  {
    id: "tablePreSortRate",
    element: { kind: "info", label: "Pre-sort rate" },
    tooltip: "Parcels greater than 2 lbs count 1.8x towards sort rate",
    target: "—",
    hub: true,
    spoke: true,
  },
  {
    id: "tableSortRate",
    element: { kind: "info", label: "Sort rate" },
    tooltip: "Parcels greater than 2 lbs count 1.8x towards sort rate",
    target: "—",
    hub: true,
    spoke: true,
  },
  {
    id: "tableIdleTime",
    element: { kind: "info", label: "Idle time" },
    tooltip: "Time a worker is signed in but not actively sorting, loading, or scanning",
    target: "—",
    hub: true,
    spoke: true,
  },
  {
    id: "legendLost",
    element: { kind: "swatchInfo", label: "Lost", color: "#7c3aed" },
    tooltip: "Takes 9 days to finalize. Only days with confirmed data are shown",
    target: "—",
    hub: true,
    spoke: true,
  },
  {
    id: "legendMissloaded",
    element: { kind: "swatchInfo", label: "Missloaded", color: "#7c3aed" },
    tooltip: "Takes 9 days to finalize. Only days with confirmed data are shown",
    target: "—",
    hub: true,
    spoke: false,
  },
  {
    id: "flowLegendBlended",
    element: { kind: "swatchInfo", label: "Blended average", color: "#0156fb" },
    tooltip: "Parcels greater than 2 lbs count 1.8x towards sort rate",
    target: "—",
    hub: true,
    spoke: true,
  },
  {
    id: "flowLegendSmall",
    element: { kind: "swatchInfo", label: "Small parcels only", color: "#00bea7" },
    tooltip: "Parcels under 2 lbs",
    target: "—",
    hub: true,
    spoke: true,
  },
  {
    id: "flowLegendLarge",
    element: { kind: "swatchInfo", label: "Large parcels only", color: "#df3480" },
    tooltip: "Parcels over 2 lbs",
    target: "—",
    hub: true,
    spoke: true,
  },
];
