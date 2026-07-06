/**
 * real-data.js
 * ---------------------------------------------------------------
 * Facts scraped from eduspots.org's public pages. Only values that
 * are actually publicly stated live here — see notPublic[] at the
 * bottom for what deliberately stays synthetic in data.js, and why.
 * Sources cited per section so any figure can be traced and re-checked.
 * ---------------------------------------------------------------
 */

const REAL_NETWORK_TOTALS = {
  totalSpots: 52,          // source: eduspots.org homepage
  totalCatalysts: 412,     // source: eduspots.org homepage
  totalSparks: 12000,      // source: eduspots.org homepage ("annual learners")
  asOf: "2024/2025 reporting period",
  source: "https://eduspots.org/",
};

const REAL_SPOT_NAMES = [
  "Aboabo No.4", "Abofour", "Abutia", "Agbledomi", "Ahenkro", "Akumadan",
  "Ameyaw", "Asemasa", "Atanve", "Banda Kabrono", "Bimbilla", "Bono Manso",
  "Bosomadwe", "Dadwen", "Dodome Awuiasu", "Donkorkrom", "Dulugu",
  "Ejisu-Besease", "Ejura", "Ekawso", "Ekumfi", "Elmina", "Funkoe",
  "Gambibgo", "Gomoa-Manso", "Ho-Kpenoe", "Joska Kenya", "Kalpohin",
  "Katanga-Zuarungu", "Kato Berekum", "Kejabil", "Kotokoli Zongo",
  "Kumbungu Zamigu", "Metsrikasa", "Mpatano", "New Ebu", "Nkonya", "Piisi",
  "Posmonu", "Sakasaka", "Sanzule-Krisan", "Savelugu", "Sefwi Asanteman",
  "Soko", "Takuve", "Teshie", "Wodome", "Yamfo", "Zangbalun",
]; // source: eduspots.org — 49 individually named Spots (network total is 52; 3 are unnamed on the public site)

const REAL_REGIONAL_COORDINATORS = [
  { name: "Cynthia Mawuena Tetteh", region: "Volta Region" },
  { name: "Getrude Akunlibe", region: "Northern Region" },
  { name: "Abdul Wadud Suleiman", region: "Central/Western Regions" },
  { name: "Abdul-Malik Iddrisu", region: "New Spots" },
]; // source: https://eduspots.org/about-us/team/

// Deliberately NOT included — not publicly stated, stays synthetic in data.js:
const NOT_PUBLIC = [
  "per-Spot weekly attendance/engagement",
  "per-Spot safeguarding compliance rate",
  "Spot-to-RC cluster assignment",
  "per-Spot Sparks count",
  "per-Spot Catalyst count / active strands",
];

window.EduSpotsRealData = {
  networkTotals: REAL_NETWORK_TOTALS,
  spotNames: REAL_SPOT_NAMES,
  regionalCoordinators: REAL_REGIONAL_COORDINATORS,
  notPublic: NOT_PUBLIC,
};