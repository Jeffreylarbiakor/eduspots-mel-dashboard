/**
 * app.js
 * ---------------------------------------------------------------
 * Renders the dashboard from window.EduSpotsData and wires up
 * navigation, filters, and the Spot detail modal.
 *
 * Design principle carried over from the ops design doc: AI/automation
 * only ever *flags and summarizes*. The "Acknowledge" action in the
 * Anomalies view is the human (RC) taking ownership of a flagged
 * Spot — nothing here auto-resolves anything.
 * ---------------------------------------------------------------
 */

const STATUS_LABEL = {
  healthy: "Healthy",
  watch: "Watch",
  "at-risk": "At risk",
};

let state = {
  network: null,
  gridStatusFilter: "all",
  gridClusterFilter: "all",
  acknowledged: new Set(), // spot ids the RC has acknowledged, in-memory only
};

function fmtNumber(n) {
  return n.toLocaleString("en-US");
}

function fmtPct(n) {
  return `${Math.round(n * 100)}%`;
}

function rcById(id) {
  return state.network.regionalCoordinators.find((rc) => rc.id === id);
}

/* ---------------------------- Navigation ---------------------------- */

function initNav() {
  const links = document.querySelectorAll("[data-view-link]");
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.getAttribute("data-view-link");
      switchView(view);
    });
  });
}

function switchView(view) {
  document.querySelectorAll("[data-view-link]").forEach((l) => {
    l.classList.toggle("active", l.getAttribute("data-view-link") === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `view-${view}`);
  });
}

/* ------------------------------ Overview ----------------------------- */

function renderKpis() {
  const { totals } = state.network;
  const kpiEl = document.getElementById("kpi-row");
  const items = [
    { label: "Active Spots", value: fmtNumber(totals.totalSpots) },
    { label: "Catalysts network-wide", value: fmtNumber(totals.totalCatalysts) },
    { label: "Sparks reached (est.)", value: fmtNumber(totals.totalSparks) },
    { label: "Spots needing RC follow-up", value: fmtNumber(totals.atRisk + totals.watch), flag: true },
    { label: "Avg. safeguarding compliance", value: fmtPct(totals.avgCompliance) },
  ];
  kpiEl.innerHTML = items
    .map(
      (item) => `
      <div class="kpi-card ${item.flag ? "kpi-card--flag" : ""}">
        <div class="kpi-value">${item.value}</div>
        <div class="kpi-label">${item.label}</div>
      </div>`
    )
    .join("");
}

function renderOverviewCharts() {
  window.EduSpotsCharts.renderTrendChart("trend-chart", state.network.networkWeeklyEngagement);
  window.EduSpotsCharts.renderStrandChart("strand-chart", state.network.strandParticipation);
}

/* ------------------------------ Spot grid ----------------------------- */

function populateClusterFilter() {
  const select = document.getElementById("cluster-filter");
  const options = state.network.regionalCoordinators
    .map((rc) => `<option value="${rc.id}">${rc.name} — ${rc.region}</option>`)
    .join("");
  select.innerHTML = `<option value="all">All clusters</option>${options}`;
}

function filteredSpots() {
  return state.network.spots.filter((s) => {
    const statusOk = state.gridStatusFilter === "all" || s.status.level === state.gridStatusFilter;
    const clusterOk = state.gridClusterFilter === "all" || s.rcId === state.gridClusterFilter;
    return statusOk && clusterOk;
  });
}

function renderSpotGrid() {
  const grid = document.getElementById("spot-grid");
  const spots = filteredSpots();

  if (spots.length === 0) {
    grid.innerHTML = `<p class="empty-state">No Spots match these filters.</p>`;
    return;
  }

  grid.innerHTML = spots
    .map(
      (s) => `
      <button class="spot-tile spot-tile--${s.status.level}" data-spot-id="${s.id}" title="${s.name}">
        <span class="spot-tile__name">${s.name.replace(" Spot", "")}</span>
        <span class="spot-tile__region">${s.region}</span>
      </button>`
    )
    .join("");

  grid.querySelectorAll(".spot-tile").forEach((tile) => {
    tile.addEventListener("click", () => openSpotModal(tile.getAttribute("data-spot-id")));
  });

  document.getElementById("grid-count").textContent = `${spots.length} of ${state.network.spots.length} Spots`;
}

function initGridFilters() {
  document.getElementById("status-filter").addEventListener("change", (e) => {
    state.gridStatusFilter = e.target.value;
    renderSpotGrid();
  });
  document.getElementById("cluster-filter").addEventListener("change", (e) => {
    state.gridClusterFilter = e.target.value;
    renderSpotGrid();
  });
}

/* ------------------------------ Spot modal ----------------------------- */

function openSpotModal(spotId) {
  const spot = state.network.spots.find((s) => s.id === spotId);
  if (!spot) return;
  const rc = rcById(spot.rcId);

  const modal = document.getElementById("spot-modal");
  modal.querySelector(".modal__body").innerHTML = `
    <div class="modal__header">
      <h3>${spot.name}</h3>
      <span class="status-pill status-pill--${spot.status.level}">${STATUS_LABEL[spot.status.level]}</span>
    </div>
    <p class="modal__meta">${spot.region} &middot; ${spot.type} &middot; RC: ${rc ? rc.name : "Unassigned"}</p>

    <div class="modal__stats">
      <div><span class="stat-label">Catalysts</span><span class="stat-value">${spot.catalystCount}</span></div>
      <div><span class="stat-label">Sparks reached</span><span class="stat-value">${fmtNumber(spot.sparksReached)}</span></div>
      <div><span class="stat-label">Last activity logged</span><span class="stat-value">${spot.lastActivityDaysAgo}d ago</span></div>
      <div><span class="stat-label">4-week trend</span><span class="stat-value">${spot.engagementDeltaPct >= 0 ? "+" : ""}${Math.round(spot.engagementDeltaPct)}%</span></div>
      <div><span class="stat-label">Safeguarding compliance</span><span class="stat-value">${fmtPct(spot.safeguardingComplianceRate)}</span></div>
    </div>

    <p class="modal__label">Active strands</p>
    <div class="chip-row">${spot.activeStrands.map((s) => `<span class="chip">${s}</span>`).join("") || `<span class="chip chip--muted">None active</span>`}</div>

    ${
      spot.status.reasons.length
        ? `<p class="modal__label">Why this was flagged</p><ul class="reason-list">${spot.status.reasons.map((r) => `<li>${r}</li>`).join("")}</ul>`
        : `<p class="modal__note">No flags — this Spot is within healthy thresholds.</p>`
    }
  `;
  modal.classList.remove("hidden");
}

function initModal() {
  const modal = document.getElementById("spot-modal");
  modal.querySelector(".modal__backdrop").addEventListener("click", () => modal.classList.add("hidden"));
  modal.querySelector(".modal__close").addEventListener("click", () => modal.classList.add("hidden"));
}

/* ------------------------------ Clusters ----------------------------- */

function renderClusters() {
  const body = document.getElementById("clusters-table-body");
  const rows = state.network.regionalCoordinators.map((rc) => {
    const spots = state.network.spots.filter((s) => s.rcId === rc.id);
    const atRisk = spots.filter((s) => s.status.level === "at-risk").length;
    const watch = spots.filter((s) => s.status.level === "watch").length;
    const healthy = spots.filter((s) => s.status.level === "healthy").length;
    const compliance = spots.reduce((sum, s) => sum + s.safeguardingComplianceRate, 0) / (spots.length || 1);

    return `
      <tr>
        <td>${rc.name}</td>
        <td>${rc.region}</td>
        <td>${spots.length}</td>
        <td><span class="badge badge--healthy">${healthy}</span></td>
        <td><span class="badge badge--watch">${watch}</span></td>
        <td><span class="badge badge--at-risk">${atRisk}</span></td>
        <td>${fmtPct(compliance)}</td>
      </tr>`;
  });
  body.innerHTML = rows.join("");
}

/* ---------------------------- Safeguarding ---------------------------- */

function renderSafeguarding() {
  const list = document.getElementById("safeguarding-list");
  const belowThreshold = [...state.network.spots]
    .filter((s) => s.safeguardingComplianceRate < 0.95)
    .sort((a, b) => a.safeguardingComplianceRate - b.safeguardingComplianceRate);

  document.getElementById("safeguarding-summary").textContent =
    `${belowThreshold.length} of ${state.network.spots.length} Spots are below the 95% training-compliance target.`;

  list.innerHTML = belowThreshold
    .map((s) => {
      const rc = rcById(s.rcId);
      return `
      <div class="list-row">
        <div>
          <strong>${s.name}</strong>
          <span class="list-row__meta">${s.region} &middot; RC: ${rc ? rc.name : "Unassigned"}</span>
        </div>
        <div class="compliance-bar-wrap">
          <div class="compliance-bar"><div class="compliance-bar__fill" style="width:${fmtPct(s.safeguardingComplianceRate)}"></div></div>
          <span>${fmtPct(s.safeguardingComplianceRate)}</span>
        </div>
      </div>`;
    })
    .join("") || `<p class="empty-state">All Spots meet the safeguarding compliance target.</p>`;
}

/* ------------------------------ Anomalies ----------------------------- */

function renderAnomalies() {
  const list = document.getElementById("anomalies-list");
  const flagged = state.network.spots
    .filter((s) => s.status.level !== "healthy")
    .sort((a, b) => (a.status.level === "at-risk" ? -1 : 1) - (b.status.level === "at-risk" ? -1 : 1));

  document.getElementById("anomalies-summary").textContent =
    `${flagged.length} Spots auto-flagged this cycle. This list is generated for RC review — nothing here is auto-resolved.`;

  if (flagged.length === 0) {
    list.innerHTML = `<p class="empty-state">No anomalies detected this cycle.</p>`;
    return;
  }

  list.innerHTML = flagged
    .map((s) => {
      const rc = rcById(s.rcId);
      const acked = state.acknowledged.has(s.id);
      return `
      <div class="anomaly-card anomaly-card--${s.status.level}">
        <div class="anomaly-card__top">
          <div>
            <strong>${s.name}</strong>
            <span class="status-pill status-pill--${s.status.level}">${STATUS_LABEL[s.status.level]}</span>
          </div>
          <span class="list-row__meta">RC: ${rc ? rc.name : "Unassigned"}</span>
        </div>
        <ul class="reason-list">${s.status.reasons.map((r) => `<li>${r}</li>`).join("")}</ul>
        <button class="ack-button ${acked ? "ack-button--done" : ""}" data-ack-id="${s.id}" ${acked ? "disabled" : ""}>
          ${acked ? "Acknowledged by RC" : "Acknowledge for follow-up"}
        </button>
      </div>`;
    })
    .join("");

  list.querySelectorAll("[data-ack-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.acknowledged.add(btn.getAttribute("data-ack-id"));
      renderAnomalies();
    });
  });
}

/* -------------------------------- Init -------------------------------- */

function refreshAll() {
  renderKpis();
  renderOverviewCharts();
  populateClusterFilter();
  renderSpotGrid();
  renderClusters();
  renderSafeguarding();
  renderAnomalies();
  document.getElementById("synced-at").textContent = new Date(state.network.generatedAt).toLocaleString();
}

function init() {
  state.network = window.EduSpotsData.generateNetworkData();
  initNav();
  initGridFilters();
  initModal();
  refreshAll();

  document.getElementById("refresh-button").addEventListener("click", () => {
    state.network = window.EduSpotsData.generateNetworkData();
    state.acknowledged = new Set();
    refreshAll();
  });
}

document.addEventListener("DOMContentLoaded", init);
