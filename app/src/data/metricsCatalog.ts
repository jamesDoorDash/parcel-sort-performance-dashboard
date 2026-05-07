// Catalog of every metric label and info tooltip exposed in V56 (hub + spoke) —
// the active "post-design review" group. Hand-curated reference for the Admin page.
// Update whenever V56 copy changes.

export type CatalogElement =
  | { kind: "underline"; label: string }
  | { kind: "info"; label: string }
  | { kind: "swatchInfo"; label: string; color: string };

export type CatalogRow = {
  id: string;
  // Optional sub-header to group adjacent rows under a common title within a section
  group?: string;
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
  inDoc?: boolean;
};

// ---------------------------------------------------------------------------
// Section 1 — Metrics (have a target)
// ---------------------------------------------------------------------------

export const metricRows: CatalogRow[] = [
  // Top-level metrics (Row 1)
  {
    id: "sortSlaCompliance",
    element: { kind: "underline", label: "Sort SLA compliance" },
    tooltip: "% of parcels sorted at least 15m before the first truck CPT of the day",
    target: "100%",
    hub: true,
    spoke: false,
    inDoc: true,
  },
  {
    id: "qaBy9am",
    element: { kind: "underline", label: "QA by 9am" },
    tooltip: "% of bins that are fully sorted for runner pickup by 9am",
    target: "100%",
    hub: false,
    spoke: true,
    inDoc: false,
  },
  {
    id: "controllableCpt",
    element: { kind: "underline", label: "Controllable CPT compliance" },
    tooltip: "% of pallets loaded to truck by the truck's CPT — only for trucks that arrived on time or early",
    target: "100%",
    hub: true,
    spoke: false,
    inDoc: true,
  },
  {
    id: "onTimeDelivery",
    element: { kind: "underline", label: "On-time delivery" },
    tooltip: "% of parcels delivered to the customer on or before the target delivery date",
    target: "99.9%",
    hub: false,
    spoke: true,
    inDoc: true,
  },
  {
    id: "onTimeReturnsToMerchant",
    element: { kind: "underline", label: "On time returns" },
    tooltip: "% of return parcels loaded onto the soonest scheduled return truck after being scanned as return",
    target: "100%",
    hub: true,
    spoke: true,
    inDoc: true,
  },
  {
    id: "associatesMeetingTargets",
    element: { kind: "underline", label: "Associates meeting targets" },
    tooltip: "Number of associates meeting all individual performance targets",
    target: "All associates",
    hub: true,
    spoke: true,
    inDoc: true,
  },

  // Parcels — related metrics
  {
    id: "parcelDwellTime",
    element: { kind: "underline", label: "Dwelled parcels" },
    tooltip: "Number of parcels on site > 24 hours",
    target: "0",
    hub: true,
    spoke: true,
    inDoc: true,
  },
  {
    id: "parcelMissortRate",
    element: { kind: "underline", label: "Parcel missort rate" },
    tooltip: "% of parcels from this period that were scanned at the wrong location",
    target: "0.1%",
    hub: true,
    spoke: true,
    inDoc: true,
  },
  {
    id: "parcelLossRate",
    element: { kind: "underline", label: "Parcel loss rate" },
    tooltip: "% of parcels from this period that were lost and not scanned for 10 days",
    target: "0.08%",
    hub: true,
    spoke: true,
    inDoc: true,
  },

  // Trucks — related metrics (hub only)
  {
    id: "palletsScannedToTruck",
    element: { kind: "underline", label: "Pallets scanned to truck" },
    tooltip: "% of pallets scanned to the correct truck",
    target: "99.7%",
    hub: true,
    spoke: false,
    inDoc: true,
  },
  {
    id: "palletsMissloaded",
    element: { kind: "underline", label: "Pallets missloaded" },
    tooltip: "% of pallets meant to be loaded during this time period that were scanned at the wrong facility",
    target: "0%",
    hub: true,
    spoke: false,
    inDoc: true,
  },

  // Returns — related metrics
  {
    id: "returnsScannedToPallet",
    element: { kind: "underline", label: "Returns scanned to pallet" },
    tooltip: "% of parcels that were scanned to a pallet for return",
    target: "100%",
    hub: true,
    spoke: true,
    inDoc: true,
  },
  {
    id: "returnPalletsScannedToTruck",
    element: { kind: "underline", label: "Return pallets scanned to truck" },
    tooltip: "% of pallets that were scanned to an outbound truck for return",
    target: "100%",
    hub: true,
    spoke: true,
    inDoc: true,
  },

  // Flow rates (Row 2)
  {
    id: "parcelPreSortRate",
    element: { kind: "underline", label: "Parcel pre-sort rate" },
    tooltip: "Average hourly rate at which parcels were actively pre-sorted in pre-sort mode",
    target: "160 / hr",
    hub: true,
    spoke: true,
    inDoc: true,
  },
  {
    id: "parcelSortToPalletRate",
    element: { kind: "underline", label: "Parcel sort to pallet rate" },
    tooltip: "Average hourly rate at which parcels were actively scanned to pallet",
    target: "160 / hr",
    hub: true,
    spoke: false,
    inDoc: true,
  },
  {
    id: "parcelSortToBinRate",
    element: { kind: "underline", label: "Parcel sort to bin rate" },
    tooltip: "Average hourly rate at which parcels were actively scanned to bins",
    target: "160 / hr",
    hub: false,
    spoke: true,
    inDoc: false,
  },
  {
    id: "palletLoadRate",
    element: { kind: "underline", label: "Pallet load rate" },
    tooltip: "Average hourly rate at which pallets were actively scanned to truck",
    target: "30 / hr",
    hub: true,
    spoke: false,
    inDoc: false,
  },
  {
    id: "binDispatchRate",
    element: { kind: "underline", label: "Bin dispatch rate" },
    tooltip: "Average hourly rate at which bins were actively dispatched to runners",
    target: "20 / hr",
    hub: false,
    spoke: true,
    inDoc: false,
  },
];

// ---------------------------------------------------------------------------
// Section 2 — Info tooltips (no target — definition only)
// ---------------------------------------------------------------------------

export const infoTooltipRows: CatalogRow[] = [
  {
    id: "overallGrade",
    element: { kind: "underline", label: "Overall grade" },
    tooltip: "Determined by the number of top-level metrics at or above target:",
    tooltipExtra: [
      { bold: "A", text: "4" },
      { bold: "B", text: "3" },
      { bold: "C", text: "2" },
      { bold: "D", text: "1" },
      { bold: "F", text: "0" },
    ],
    target: "4",
    hub: false,
    spoke: false,
    inDoc: false,
  },
  {
    id: "topSorters",
    element: { kind: "underline", label: "Top sorters" },
    tooltip: "The 3 associates ranked best on a combination of sort rate, parcels sorted, missorts, and lost items",
    target: "—",
    hub: true,
    spoke: true,
    inDoc: false,
  },
  {
    id: "topLoaders",
    element: { kind: "underline", label: "Top loaders" },
    tooltip: "The 3 associates ranked best on a combination of load rate, pallets loaded, and load quality",
    target: "—",
    hub: true,
    spoke: false,
    inDoc: false,
  },
  {
    id: "worstPerformersHub",
    element: { kind: "underline", label: "Worst performers" },
    tooltip: "The 3 most underperforming associates based on a combination of sort rates, load rates, missloads, missorts, lost items, idle time, and other quality metrics.",
    target: "—",
    hub: true,
    spoke: false,
    inDoc: false,
  },
  {
    id: "worstSortersSpoke",
    element: { kind: "underline", label: "Worst sorters" },
    tooltip: "The 3 most underperforming associates based on a combination of sort rates, missorts, lost items, idle time, and other quality metrics",
    target: "—",
    hub: false,
    spoke: true,
    inDoc: false,
  },
  // Associates meeting targets table — column header tooltips (now underlined)
  {
    id: "tablePreSortRate",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Pre-sort rate" },
    tooltip: "Average hourly rate at which parcels were actively pre-sorted in pre-sort mode",
    target: "160 / hr",
    hub: true,
    spoke: true,
    inDoc: true,
  },
  {
    id: "tableSortRateHub",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Sort rate" },
    tooltip: "Average hourly rate at which parcels were actively scanned to pallet",
    target: "160 / hr",
    hub: true,
    spoke: false,
    inDoc: true,
  },
  {
    id: "tableSortRateSpoke",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Sort rate" },
    tooltip: "Average hourly rate at which parcels were actively scanned to bins",
    target: "160 / hr",
    hub: false,
    spoke: true,
    inDoc: false,
  },
  {
    id: "tableParcelsSorted",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Parcels sorted" },
    tooltip: "Total parcels this associate sorted in the selected period",
    target: "—",
    hub: true,
    spoke: true,
    inDoc: false,
  },
  {
    id: "tableMissorted",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Missorted" },
    tooltip: "Parcels this associate last scanned in the selected period that were next scanned at the wrong location",
    target: "0",
    hub: true,
    spoke: true,
    inDoc: false,
  },
  {
    id: "tableLost",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Lost" },
    tooltip: "Parcels this associate last scanned in the selected period that were lost and not scanned again for 10 days",
    target: "0",
    hub: true,
    spoke: true,
    inDoc: false,
  },
  {
    id: "tableLoadRate",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Load rate" },
    tooltip: "Average hourly rate at which pallets were actively scanned to truck",
    target: "30 / hr",
    hub: true,
    spoke: false,
    inDoc: false,
  },
  {
    id: "tableDispatchRate",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Dispatch rate" },
    tooltip: "Average hourly rate at which bins were actively dispatched to runners",
    target: "20 / hr",
    hub: false,
    spoke: true,
    inDoc: false,
  },
  {
    id: "tablePalletsLoaded",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Pallets loaded" },
    tooltip: "Total pallets this associate loaded onto trucks in the selected period",
    target: "—",
    hub: true,
    spoke: false,
    inDoc: false,
  },
  {
    id: "tableBinsDispatched",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Bins dispatched" },
    tooltip: "Total bins this associate dispatched in the selected period",
    target: "—",
    hub: false,
    spoke: true,
    inDoc: false,
  },
  {
    id: "tableIdleTime",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Idle time" },
    tooltip: "Cumulative idle time — any 10+ minute gap between scans. All other time-based metrics pause while idle.",
    target: "—",
    hub: true,
    spoke: true,
    inDoc: false,
  },
  {
    id: "tableTargetStatus",
    group: "Associates meeting targets table",
    element: { kind: "underline", label: "Target status" },
    tooltip: "Whether this associate is meeting all individual performance targets",
    target: "—",
    hub: true,
    spoke: true,
    inDoc: false,
  },
  {
    id: "legendLost",
    group: "Parcel sort status chart legend",
    element: { kind: "swatchInfo", label: "Lost", color: "#7c3aed" },
    tooltip: "Takes 9 days to finalize. Only days with confirmed data are shown",
    target: "—",
    hub: true,
    spoke: true,
    inDoc: false,
  },
  {
    id: "legendMissloaded",
    group: "Pallet outbound status chart legend",
    element: { kind: "swatchInfo", label: "Missloaded", color: "#7c3aed" },
    tooltip: "Takes 9 days to finalize. Only days with confirmed data are shown",
    target: "—",
    hub: true,
    spoke: false,
    inDoc: false,
  },
  // Parcel pre-sort rate chart legend (hub + spoke share this chart context)
  {
    id: "preSortLegendAverage",
    group: "Parcel pre-sort rate chart legend",
    element: { kind: "swatchInfo", label: "Average", color: "#0156fb" },
    tooltip: "Average hourly rate at which parcels were actively pre-sorted in pre-sort mode",
    target: "160 / hr",
    hub: true,
    spoke: true,
    inDoc: true,
  },
  {
    id: "preSortLegendSmalls",
    group: "Parcel pre-sort rate chart legend",
    element: { kind: "swatchInfo", label: "Smalls", color: "#00bea7" },
    tooltip: "Parcels pre-sorted that ultimately go into gaylord containers",
    target: "275 / hr",
    hub: true,
    spoke: true,
    inDoc: true,
  },
  {
    id: "preSortLegendLarges",
    group: "Parcel pre-sort rate chart legend",
    element: { kind: "swatchInfo", label: "Larges", color: "#7c3aed" },
    tooltip: "Parcels pre-sorted that ultimately go into wooden pallets",
    target: "75 / hr",
    hub: true,
    spoke: true,
    inDoc: true,
  },

  // Parcel sort to pallet rate chart legend (hub only)
  {
    id: "sortPalletLegendAverage",
    group: "Parcel sort to pallet rate chart legend",
    element: { kind: "swatchInfo", label: "Average", color: "#0156fb" },
    tooltip: "Average hourly rate at which parcels were actively scanned to pallet",
    target: "160 / hr",
    hub: true,
    spoke: false,
    inDoc: true,
  },
  {
    id: "sortPalletLegendSmalls",
    group: "Parcel sort to pallet rate chart legend",
    element: { kind: "swatchInfo", label: "Smalls", color: "#00bea7" },
    tooltip: "Parcels sorted into gaylord containers",
    target: "275 / hr",
    hub: true,
    spoke: false,
    inDoc: true,
  },
  {
    id: "sortPalletLegendLarges",
    group: "Parcel sort to pallet rate chart legend",
    element: { kind: "swatchInfo", label: "Larges", color: "#7c3aed" },
    tooltip: "Parcels sorted onto wooden pallets directly",
    target: "75 / hr",
    hub: true,
    spoke: false,
    inDoc: true,
  },

  // Parcel sort to bin rate chart legend (spoke only) — placeholder targets/wording
  {
    id: "sortBinLegendAverage",
    group: "Parcel sort to bin rate chart legend",
    element: { kind: "swatchInfo", label: "Average", color: "#0156fb" },
    tooltip: "Average hourly rate at which parcels were actively scanned to bins",
    target: "160 / hr",
    hub: false,
    spoke: true,
    inDoc: false,
  },
  {
    id: "sortBinLegendSmalls",
    group: "Parcel sort to bin rate chart legend",
    element: { kind: "swatchInfo", label: "Smalls", color: "#00bea7" },
    tooltip: "Polypack and small boxes < 2lb",
    target: "275 / hr",
    hub: false,
    spoke: true,
    inDoc: false,
  },
  {
    id: "sortBinLegendLarges",
    group: "Parcel sort to bin rate chart legend",
    element: { kind: "swatchInfo", label: "Larges", color: "#7c3aed" },
    tooltip: "Boxes > 2lb",
    target: "75 / hr",
    hub: false,
    spoke: true,
    inDoc: false,
  },
];
