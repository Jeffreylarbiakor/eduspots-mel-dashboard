# EduSpots Network Data Contract (v1)

Defines the interface between the EduSpots App backend and any downstream
reporting tool (this dashboard, and future ones). This is the ONE boundary
that needs to exist — everything on the dashboard side already expects this
shape (see `generateNetworkData()` in js/data.js).

## 1. Delivery model: scheduled pull, not real-time push

Given intermittent Spot-level connectivity, the backend itself is only ever
"as fresh as the last sync" — so a webhook/push model would be solving a
problem that doesn't exist yet. Simplest and most honest approach:

- Backend runs a nightly (or every-6-hours) aggregation job that produces a
  network snapshot.
- Dashboard polls a single read endpoint on a matching interval.
- A manual "refresh now" button on the dashboard calls the same endpoint
  on demand — for an RC who just finished a Spot visit and doesn't want to
  wait for the next scheduled run.

## 2. Endpoint

```
GET /api/v1/network-snapshot
Host: internal-api.eduspots.org
Authorization: Bearer <service-account-token>
Accept: application/json
```

- **Auth**: a long-lived service-account token scoped read-only to this one
  endpoint, issued to the dashboard as a backend secret (never exposed
  client-side, never in the dashboard's own repo). Rotated quarterly.
- **Access**: internal network / VPN only, or IP-allowlisted — this endpoint
  returns safeguarding compliance data, so it is never public, unlike the
  eduspots.org marketing site.
- **Rate limit**: 1 request per 5 minutes is generous for this use case;
  reject anything more frequent with `429`.

## 3. Response shape

```json
{
  "contractVersion": "1.0",
  "generatedAt": "2026-07-06T09:00:00Z",
  "networkTotals": {
    "totalSpots": 52,
    "totalCatalysts": 412,
    "totalSparks": 12000
  },
  "regionalCoordinators": [
    { "id": "rc-1", "name": "Cynthia Mawuena Tetteh", "region": "Volta Region" }
  ],
  "spots": [
    {
      "id": "spot-014",
      "name": "Abofour",
      "rcId": "rc-1",
      "type": "community-based",
      "catalystCount": 6,
      "activeStrands": ["EduKidz", "EcoSTEM"],
      "sparksReached": 118,
      "lastActivityLoggedAt": "2026-07-04T16:20:00Z",
      "weeklySessionsLogged": [22, 19, 24, 18, 20, 21, 17, 19, 15, 16, 14, 15],
      "safeguarding": {
        "trainingCompliant": true,
        "lastRenewedAt": "2026-02-10"
      }
    }
  ]
}
```

## 4. Field-level notes

| Field | Notes |
|---|---|
| `contractVersion` | Dashboard checks this before parsing; mismatched major version = show a "data format changed" error, not a silent crash. |
| `generatedAt` | When the backend produced this snapshot — this becomes the dashboard's "Last synced" timestamp, not the request time. |
| `safeguarding.trainingCompliant` | Boolean or percentage only — never raw case notes, incident detail, or anything naming a specific concern. This endpoint is monitoring-only; safeguarding case data lives in a separate, more restricted system entirely. |
| `weeklySessionsLogged` | Aggregated count, not individual attendance records — no Spark-identifying data leaves the backend through this endpoint. |
| `lastActivityLoggedAt` | Real timestamp, replaces the prototype's synthetic `lastActivityDaysAgo` (dashboard computes the "days ago" client-side). |

## 5. Versioning rule

Additive changes (new optional field) — no version bump needed.
Renaming, removing, or changing a field's type — bump to `2.0` and support
both versions for one release cycle so nothing breaks silently.

## 6. Failure handling

If the endpoint is unreachable or returns an error, the dashboard keeps
showing the last successful snapshot, with a visible banner: *"Showing data
from [last synced time] — sync failed, retrying."* Never fail silently, and
never show stale data without saying it's stale.