/**
 * charts.js
 * ---------------------------------------------------------------
 * Thin wrapper around Chart.js for the two network-level charts.
 * Kept separate from app.js so the charting library could be swapped
 * (e.g. for Recharts in a future React port) without touching the
 * data or rendering logic.
 * ---------------------------------------------------------------
 */

let _trendChart = null;
let _strandChart = null;

const CHART_COLORS = {
  forest: "#1F5C3D",
  gold: "#D9A62E",
  sky: "#3E7CB1",
  clay: "#B54834",
  ink: "#1A1A16",
  grid: "rgba(26, 26, 22, 0.08)",
};

function renderTrendChart(canvasId, weeklyValues) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = weeklyValues.map((_, i) => `W${i + 1}`);

  if (_trendChart) _trendChart.destroy();
  _trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Sessions logged network-wide",
          data: weeklyValues,
          borderColor: CHART_COLORS.forest,
          backgroundColor: "rgba(31, 92, 61, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: CHART_COLORS.gold,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.ink } },
        y: {
          beginAtZero: true,
          grid: { color: CHART_COLORS.grid },
          ticks: { color: CHART_COLORS.ink },
        },
      },
    },
  });
}

function renderStrandChart(canvasId, strandParticipation) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (_strandChart) _strandChart.destroy();
  _strandChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: strandParticipation.map((s) => s.strand),
      datasets: [
        {
          label: "Spots running this strand",
          data: strandParticipation.map((s) => s.spotCount),
          backgroundColor: [
            CHART_COLORS.forest,
            CHART_COLORS.sky,
            CHART_COLORS.gold,
            CHART_COLORS.clay,
          ],
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.ink } },
        y: {
          beginAtZero: true,
          grid: { color: CHART_COLORS.grid },
          ticks: { color: CHART_COLORS.ink, precision: 0 },
        },
      },
    },
  });
}

window.EduSpotsCharts = { renderTrendChart, renderStrandChart };
