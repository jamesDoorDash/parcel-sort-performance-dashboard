// Dynamic roster generation for the sorters table.
// A fixed pool of ~100 people rotates through the hub, ~20 per day with
// ~80% carryover from the previous day. For a given date range, we return
// the union of everyone who worked at least one day, with their metrics
// averaged over the days they worked in that range.

import type { Sorter } from "./mock";
import { sorterTargets } from "./targets";

const NAMES = [
  "John Smith", "Emily Johnson", "David Williams", "Ashley Brown", "Michael Davis",
  "Brittany Miller", "Christopher Wilson", "Jessica Moore", "Daniel Taylor", "Amanda Anderson",
  "Matthew Thomas", "Sarah Jackson", "Joshua White", "Lauren Harris", "Ryan Martin",
  "Megan Thompson", "Andrew Garcia", "Stephanie Martinez", "Justin Robinson", "Nicole Clark",
  "Brandon Rodriguez", "Heather Lewis", "Jacob Lee", "Melissa Walker", "Tyler Hall",
  "Rebecca Allen", "Zachary Young", "Kimberly King", "Nathan Wright", "Amber Scott",
  "Jonathan Green", "Michelle Baker", "Kyle Adams", "Rachel Nelson", "Aaron Carter",
  "Victoria Mitchell", "Adam Perez", "Samantha Roberts", "Jeremy Turner", "Katherine Phillips",
  "Anthony Campbell", "Laura Parker", "Kevin Evans", "Elizabeth Edwards", "Jason Collins",
  "Christina Stewart", "Eric Sanchez", "Danielle Morris", "Patrick Rogers", "Olivia Reed",
  "Ethan Cook", "Natalie Morgan", "Jared Bell", "Alyssa Murphy", "Trevor Bailey",
  "Alexandra Rivera", "Dustin Cooper", "Morgan Richardson", "Shawn Cox", "Erica Howard",
  "Travis Ward", "Kayla Torres", "Cameron Peterson", "Haley Gray", "Derek Ramirez",
  "Jenna James", "Marcus Watson", "Bailey Brooks", "Cody Kelly", "Sierra Sanders",
  "Austin Price", "Paige Bennett", "Logan Wood", "Madison Barnes", "Connor Ross",
  "Brooke Henderson", "Caleb Coleman", "Autumn Jenkins", "Ian Perry", "Hannah Powell",
  "Evan Long", "Taylor Patterson", "Grant Hughes", "Jordan Flores", "Blake Washington",
  "Marisa Butler", "Spencer Simmons", "Chelsea Foster", "Luke Gonzalez", "Leah Bryant",
  "Nolan Alexander", "Destiny Russell", "Garrett Griffin", "Whitney Diaz", "Tanner Hayes",
  "Cassidy Myers", "Hunter Ford", "Makayla Hamilton", "Peyton Graham", "Alexis Sullivan",
];

// ---- Seeded PRNG (mulberry32) ----
function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic shuffle
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- Person pool ----
type BasePerson = {
  id: string;
  name: string;
  tier: "top" | "mid" | "low";
  basePreSort: number;
  baseSort: number;
  baseLoad: number;
  baseMissort: number;
  baseLoss: number;
};

const pool: BasePerson[] = (() => {
  const rng = mulberry32(42);
  return NAMES.map((name, i) => {
    const r = rng();
    const tier: BasePerson["tier"] = r < 0.4 ? "top" : r < 0.78 ? "mid" : "low";
    const [ps, s, l] =
      tier === "top"
        ? [140 + rng() * 30, 148 + rng() * 22, 142 + rng() * 22]
        : tier === "mid"
          ? [112 + rng() * 25, 134 + rng() * 18, 128 + rng() * 16]
          : [75 + rng() * 30, 100 + rng() * 28, 102 + rng() * 24];
    const missort =
      tier === "top"
        ? 0.15 + rng() * 0.2
        : tier === "mid"
          ? 0.3 + rng() * 0.22
          : 0.6 + rng() * 0.55;
    const loss =
      tier === "top"
        ? 0.005 + rng() * 0.015
        : tier === "mid"
          ? 0.015 + rng() * 0.025
          : 0.04 + rng() * 0.055;
    return {
      id: `P-${i + 1}`,
      name,
      tier,
      basePreSort: Math.round(ps),
      baseSort: Math.round(s),
      baseLoad: Math.round(l),
      baseMissort: +missort.toFixed(2),
      baseLoss: +loss.toFixed(3),
    };
  });
})();

const poolById: Record<string, BasePerson> = Object.fromEntries(pool.map((p) => [p.id, p]));

// ---- Date helpers ----
function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Track every day we have roster info for (Feb 2 — Feb 22 2026 to cover all tabs).
const ALL_DAYS: string[] = (() => {
  const out: string[] = [];
  const d = new Date("2026-02-02T00:00:00");
  for (let i = 0; i < 21; i++) {
    out.push(isoDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
})();

// ---- Daily rosters: ~20/day, ~80% carryover ----
const DAILY_TARGET = 20;
const CARRYOVER = 16; // 80% of 20
const dayRosters: Record<string, string[]> = (() => {
  const rng = mulberry32(20260202);
  const out: Record<string, string[]> = {};
  let prev = shuffle(pool, rng)
    .slice(0, DAILY_TARGET)
    .map((p) => p.id);
  out[ALL_DAYS[0]] = prev;
  for (let i = 1; i < ALL_DAYS.length; i++) {
    const keptPool = shuffle(prev, rng).slice(0, CARRYOVER);
    const keptSet = new Set(keptPool);
    const available = pool.filter((p) => !keptSet.has(p.id));
    const fresh = shuffle(available, rng)
      .slice(0, DAILY_TARGET - CARRYOVER)
      .map((p) => p.id);
    const roster = [...keptPool, ...fresh];
    out[ALL_DAYS[i]] = roster;
    prev = roster;
  }
  return out;
})();

// ---- Per-person, per-day metrics (baseline + noise) ----
function dayMetrics(personId: string, day: string) {
  const rng = mulberry32(hashStr(personId + day));
  const base = poolById[personId];
  const n = () => (rng() - 0.5) * 2; // [-1, 1]
  return {
    preSort: Math.max(30, Math.round(base.basePreSort + n() * 12)),
    sort: Math.max(50, Math.round(base.baseSort + n() * 10)),
    load: Math.max(50, Math.round(base.baseLoad + n() * 10)),
    missort: Math.max(0.05, +(base.baseMissort + n() * 0.08).toFixed(2)),
    loss: Math.max(0.005, +(base.baseLoss + n() * 0.015).toFixed(3)),
  };
}

// ---- Public API ----
export function getSortersForRange(startIso: string, endIso: string): Sorter[] {
  const daysInRange = ALL_DAYS.filter((d) => d >= startIso && d <= endIso);
  if (daysInRange.length === 0) return [];

  // Union of people who worked at least one day in the range → days worked per person
  const personDays: Record<string, string[]> = {};
  for (const day of daysInRange) {
    const roster = dayRosters[day] || [];
    for (const pid of roster) {
      if (!personDays[pid]) personDays[pid] = [];
      personDays[pid].push(day);
    }
  }

  const results: Sorter[] = [];
  for (const pid of Object.keys(personDays)) {
    const days = personDays[pid];
    const base = poolById[pid];
    let ps = 0,
      s = 0,
      l = 0,
      ms = 0,
      ls = 0;
    for (const day of days) {
      const m = dayMetrics(pid, day);
      ps += m.preSort;
      s += m.sort;
      l += m.load;
      ms += m.missort;
      ls += m.loss;
    }
    const n = days.length;
    const avgPreSort = Math.round(ps / n);
    const avgSort = Math.round(s / n);
    const avgLoad = Math.round(l / n);
    const avgMissort = +(ms / n).toFixed(2);
    const avgLoss = +(ls / n).toFixed(3);

    results.push({
      id: base.id,
      name: base.name,
      preSort: avgPreSort,
      sort: avgSort,
      load: avgLoad,
      missort: avgMissort,
      loss: avgLoss,
      meetsTargets:
        avgPreSort >= sorterTargets.preSort &&
        avgSort >= sorterTargets.sort &&
        avgLoad >= sorterTargets.load &&
        avgMissort <= sorterTargets.missort &&
        avgLoss <= sorterTargets.loss,
    });
  }

  return results;
}
