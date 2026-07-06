/**
 * data.js
 * ---------------------------------------------------------------
 * Synthetic data layer for the EduSpots Spot Health & MEL Dashboard.
 *
 * In production this file is replaced by a fetch to the EduSpots App
 * API / export (Spots, Catalysts, attendance logs, safeguarding
 * training records). Everything downstream (app.js, charts.js) reads
 * from the same shape returned by `generateNetworkData()`, so swapping
 * the source later means changing ONE function, not the whole app.
 *
 * Deliberately modelled on EduSpots' real structure:
 *   - Spots run by volunteer Catalysts, grouped into RC clusters
 *   - Four learner strands: EduKidz, DigiLit, EcoSTEM, Ignite Equity
 *   - Safeguarding ("Keeping Spots Safe") training compliance
 *   - Weekly activity logging via the EduSpots App
 * ---------------------------------------------------------------
 */

// Seeded RNG (mulberry32) so the demo is reproducible run to run.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260702);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min, max) => rand() * (max - min) + min;

const STRANDS = ["EduKidz", "DigiLit", "EcoSTEM", "Ignite Equity"];

// Real Spot names and RC roster, scraped from eduspots.org — see real-data.js
const SPOT_NAME_ROOTS = window.EduSpotsRealData.spotNames;

function buildRegionalCoordinators() {
  return window.EduSpotsRealData.regionalCoordinators.map((rc, i) => ({
    id: `rc-${i + 1}`,
    name: rc.name,
    region: rc.region,
  }));
}

function generateWeeklyEngagement(baselineActivity) {
  // 12 weeks of "sessions logged" as a proxy engagement signal.
  const weeks = [];
  let value = baselineActivity;
  for (let w = 0; w < 12; w++) {
    // Small random walk, with an occasional dip to simulate real churn.
    const shock = rand() < 0.12 ? randFloat(-0.5, -0.2) : randFloat(-0.12, 0.14);
    value = Math.max(0, value * (1 + shock));
    weeks.push(Math.round(value));
  }
  return weeks;
}

function trendDeltaPct(weeklyValues) {
  const last4 = weeklyValues.slice(-4);
  const prev4 = weeklyValues.slice(-8, -4);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const lastAvg = avg(last4);
  const prevAvg = avg(prev4) || 1;
  return ((lastAvg - prevAvg) / prevAvg) * 100;
}

/**
 * Status rules (mirrors the "AI flags, RC decides" split from the
 * operations design doc): thresholds are simple and auditable on
 * purpose, so an RC can see exactly *why* a Spot was flagged.
 */
function computeStatus(spot) {
  const reasons = [];

  if (spot.lastActivityDaysAgo > 14) reasons.push(`No activity logged in ${spot.lastActivityDaysAgo} days`);
  if (spot.safeguardingComplianceRate < 0.8) reasons.push(`Safeguarding compliance at ${Math.round(spot.safeguardingComplianceRate * 100)}%`);
  if (spot.engagementDeltaPct <= -30) reasons.push(`Engagement down ${Math.abs(Math.round(spot.engagementDeltaPct))}% over 4 weeks`);

  if (reasons.length > 0) return { level: "at-risk", reasons };

  const watchReasons = [];
  if (spot.lastActivityDaysAgo > 7) watchReasons.push(`No activity logged in ${spot.lastActivityDaysAgo} days`);
  if (spot.safeguardingComplianceRate < 0.95) watchReasons.push(`Safeguarding compliance at ${Math.round(spot.safeguardingComplianceRate * 100)}%`);
  if (spot.engagementDeltaPct <= -15) watchReasons.push(`Engagement down ${Math.abs(Math.round(spot.engagementDeltaPct))}% over 4 weeks`);

  if (watchReasons.length > 0) return { level: "watch", reasons: watchReasons };

  return { level: "healthy", reasons: [] };
}

function generateSpots(rcs, count = SPOT_NAME_ROOTS.length) {
  const spots = [];
  for (let i = 0; i < count; i++) {
    const rc = rcs[i % rcs.length];
    const type = rand() < 0.25 ? "school-based" : "community-based";
    const catalystCount = randInt(3, 11);
    const activeStrands = STRANDS.filter(() => rand() < 0.65);
    if (activeStrands.length === 0) activeStrands.push(pick(STRANDS));

    const baseline = randInt(15, 60);
    const weeklyEngagement = generateWeeklyEngagement(baseline);
    const engagementDeltaPct = trendDeltaPct(weeklyEngagement);

    const lastActivityDaysAgo = rand() < 0.14
      ? randInt(15, 45)
      : rand() < 0.25
        ? randInt(8, 14)
        : randInt(0, 6);

    const safeguardingComplianceRate = rand() < 0.12
      ? randFloat(0.4, 0.79)
      : rand() < 0.2
        ? randFloat(0.8, 0.94)
        : randFloat(0.95, 1);

    const sparksReached = randInt(40, 260);

    const spot = {
      id: `spot-${i + 1}`,
      name: `${SPOT_NAME_ROOTS[i % SPOT_NAME_ROOTS.length]} Spot`,
      isRealName: true, // Spot name is real (eduspots.org); fields below this line are synthetic
      region: rc.region,
      rcId: rc.id,
      type,
      catalystCount,
      activeStrands,
      weeklyEngagement,
      engagementDeltaPct,
      lastActivityDaysAgo,
      safeguardingComplianceRate,
      sparksReached,
    };

    spot.status = computeStatus(spot);
    spots.push(spot);
  }
  return spots;
}

function generateNetworkData() {
  const regionalCoordinators = buildRegionalCoordinators();
  const spots = generateSpots(regionalCoordinators, 52);

  const real = window.EduSpotsRealData.networkTotals;
  const totals = {
    totalSpots: real.totalSpots,       // real figure (eduspots.org), not spots.length
    totalCatalysts: real.totalCatalysts, // real figure — per-Spot breakdown is synthetic
    totalSparks: real.totalSparks,       // real figure — per-Spot breakdown is synthetic
    atRisk: spots.filter((s) => s.status.level === "at-risk").length,
    watch: spots.filter((s) => s.status.level === "watch").length,
    healthy: spots.filter((s) => s.status.level === "healthy").length,
    avgCompliance:
      spots.reduce((sum, s) => sum + s.safeguardingComplianceRate, 0) / spots.length,
  };

  // Network-wide weekly engagement = sum across all spots, per week.
  const networkWeeklyEngagement = Array.from({ length: 12 }, (_, w) =>
    spots.reduce((sum, s) => sum + s.weeklyEngagement[w], 0)
  );

  // Strand participation snapshot (how many spots currently run each strand).
  const strandParticipation = STRANDS.map((strand) => ({
    strand,
    spotCount: spots.filter((s) => s.activeStrands.includes(strand)).length,
  }));

  return {
    generatedAt: new Date().toISOString(),
    regionalCoordinators,
    spots,
    totals,
    networkWeeklyEngagement,
    strandParticipation,
    strands: STRANDS,
  };
}

// Exposed as a global for this dependency-free static build.
window.EduSpotsData = { generateNetworkData };
