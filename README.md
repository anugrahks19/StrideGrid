# StrideGrid

StrideGrid is a MERN capstone project that turns outdoor runs into a territory game. Runners record a GPS route in a mobile browser, claim unowned map cells, challenge another runner's cells, defend their own cells, and compare territory on a leaderboard.

**Current status:** The first playable version and signed-in dashboard are implemented. Local development can run without an external MongoDB service; production needs a MongoDB connection and a real outdoor GPS test. No hosted URL or public GitHub repository has been created yet.

## Stack

- React and Vite client, with React Leaflet for the map
- Node.js and Express REST API
- MongoDB and Mongoose for users, private runs, and territories
- Browser Geolocation API for foreground run tracking
- JWT session in an HttpOnly cookie; passwords hashed with bcrypt

The game, data, API, and user interface are MERN. Leaflet displays the map; it is not an additional application backend.

## MVP rules

1. A run needs at least five samples, eight minutes, and one kilometer. Samples with poor accuracy are excluded; implausible GPS jumps are rejected or filtered.
2. The route is divided into 150-meter projected grid cells. A cell counts when the accepted route covers at least 35 meters inside it. A run can affect at most 30 cells.
3. The first runner to visit an unowned cell claims it.
4. Visiting a rival's cell starts a seven-day challenge. A second qualifying run through that cell by the same challenger captures it.
5. The owner can defend a contested cell by running through it during the challenge period.
6. The leaderboard ranks runners by currently owned cells.

These checks reduce GPS mistakes and basic replay attempts; they do not prove that a person physically ran. Exact routes are private to the runner. Other users see claimed cells and public names.

## Run locally

Requirements: Node.js and npm. MongoDB is optional for local development: without `MONGODB_URI`, the server starts a local MongoDB instance and stores its data in the ignored `.local-data/` folder. The first run downloads a MongoDB binary, which can take a while.

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to Express on port 5000. For production, copy the example environment files, set `MONGODB_URI` in `server/.env`, and replace `JWT_SECRET` with a random secret of at least 24 characters.

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

To build for production:

```powershell
npm run build
npm start
```

In production Express serves the built React app from the same origin. Configure `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, and `PORT` on the host. Serve the app over HTTPS: browsers require a secure context and user permission for Geolocation. Test a full run on the deployed URL; localhost UI testing alone does not verify GPS behavior.

## API

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Create runner account | No |
| POST | `/api/auth/login` | Start session | No |
| POST | `/api/auth/logout` | End session | No |
| GET | `/api/auth/me` | Current runner | Yes |
| GET | `/api/territories` | Public territory cells | No |
| GET | `/api/leaderboard` | Top ten by cells | No |
| GET | `/api/activity` | Recent completed runs without private routes | No |
| GET | `/api/events` | Live completed-run event stream | No |
| GET | `/api/runs` | Current runner's completed runs | Yes |
| POST | `/api/runs` | Submit, validate, and score a run | Yes |
| GET | `/api/health` | API health | No |

Successful run submission returns distance, duration, and counts of claimed, contested, captured, and defended cells. Validation errors return `400`; missing auth returns `401`; a duplicate route returns `409`. After sign-in, runners land on `/dashboard`. A completed run announces an event so open dashboards can refresh; a 30-second poll provides a fallback.

## Project structure

```text
client/src/             React pages, dashboard, map, and API client
server/src/models/      Mongoose schemas
server/src/routes/      Authentication and game endpoints
server/src/lib/         GPS validation, cell geometry, game rules
docs/SRS.md             Requirements and acceptance criteria
```

## Test and review

```powershell
npm test
npm run build
```

Unit tests cover map cell conversion, route coverage, plausible and implausible GPS samples, and claim/challenge/defend/capture transitions. Before submission, test registration, login, the dashboard, a live outdoor run, route rejection, live leaderboard updates, mobile layout, and deep-link refresh against a deployed MongoDB-backed version. Use two runner accounts for the challenge/defense demonstration.

## Privacy and limitations

- The application stores raw GPS samples to audit a runner's own run. The public API never returns those points.
- GPS location can be spoofed; this is an academic MVP, not a prize-bearing competition.
- The browser must stay open during a run. Reliable background tracking would require a separate native app.
- A run updates several territory documents. Those updates are not yet one atomic transaction, so an interrupted write may leave a partial result. This is the main correctness improvement before a large launch.
- The public territory endpoint currently caps responses at 5,000 cells. Area-based querying is needed for larger use.
- `tile.openstreetmap.org` is configured for small-scale interactive use with visible attribution. Replace it with a suitable tile provider before significant traffic; the tile URL can be changed with `VITE_TILE_URL`. Follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Submission checklist

- [ ] Submit the SRS in the course assignment
- [ ] Create and share a public GitHub repository
- [ ] Deploy the built app and MongoDB-backed API over HTTPS
- [ ] Verify core flows on the hosted URL
- [ ] Add hosted and repository URLs to this README and the report
- [ ] Capture the overview, map, active run, run result, leaderboard, history, and mobile views
- [ ] Complete the project report using the course's required format
- [ ] Check repository history and screenshots for secrets or personal location data
