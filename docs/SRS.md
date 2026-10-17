# StrideGrid Software Requirements Specification

## 1. Purpose and problem

StrideGrid is a web-based territory game for recreational runners. Ordinary run trackers record distance but give little reason to revisit and explore local routes. StrideGrid makes a completed route change a shared map by claiming, challenging, defending, or capturing grid cells.

The first version targets individual runners in one local area. It is a course project, not a safety, health, or competition-grade tracking service.

## 2. Users and scope

**Runner:** creates an account, records a run, sees public territory and leaderboard data, and reviews their own run history. A runner can never access another runner's raw GPS points.

**Must have:** authentication, GPS capture while page remains open, server-side validation, territory rules, map, run history, leaderboard, responsive layout, and safe error states.

**Later:** teams, badges, notifications, background tracking, anti-spoof attestation, and multi-city scaling.

## 3. User stories and acceptance criteria

| ID | Story | Acceptance criteria |
| --- | --- | --- |
| US-01 | As a new runner, I want an account so that my territory is saved. | A valid name, email, and password create an account. Duplicate email returns 409. Password hashes and secrets are never returned. |
| US-02 | As a runner, I want to start and finish a run so that I can claim ground. | Location permission is requested only after Start. The page displays GPS sample count and accuracy. A qualifying submitted run appears in My Runs without manual refresh. |
| US-03 | As a runner, I want invalid routes rejected so that the game is fairer. | Short, inaccurate, badly ordered, or repeatedly implausible routes return a clear 400 response and do not score. Exact duplicate submissions return 409. |
| US-04 | As a runner, I want to contest a rival cell so that I can capture it. | First valid visit starts a seven-day challenge; a later visit by the same challenger captures it; an owner visit during the window clears the challenge. |
| US-05 | As a runner, I want to see my ground on a map. | Own, rival, and contested cells use distinct colors. An empty map remains usable. The map works on phone and desktop widths. |
| US-06 | As a runner, I want a leaderboard so that I can compare progress. | Ranking counts currently owned cells and updates after a completed scoring run. Empty state is shown before any run. |
| US-07 | As a runner, I want my route private. | Public endpoints return cell bounds and names, never raw run samples. My Runs requires a valid session and returns only that user's records. |

## 4. Functional requirements

1. The system shall register and authenticate runners using an HttpOnly session cookie.
2. The browser shall collect latitude, longitude, accuracy, and timestamp only after the runner starts a run and grants permission.
3. The API shall validate all run input independently of the client.
4. The API shall reject exact route replay and routes that fail minimum duration, distance, accuracy, ordering, or plausible-speed checks.
5. The server shall calculate visited cells and apply claim, challenge, defense, and capture rules.
6. The UI shall show loading, success, empty, and error states for remote data.
7. The system shall expose only public cell geometry and runner names in map and leaderboard responses.

## 5. Non-functional requirements

- **Security:** hash passwords; keep the JWT secret and MongoDB URI out of Git; rate-limit auth routes; validate body size and GPS input.
- **Privacy:** limit public location data to territory cells; never display another runner's precise route. Use non-personal demo accounts and routes for screenshots.
- **Usability:** clear mobile navigation and labeled inputs; map color differences accompanied by a legend; readable errors and retry controls.
- **Compatibility:** modern mobile browsers with Geolocation support. The app requires HTTPS in production.
- **Maintainability:** separate React UI, API routes, Mongoose models, and pure game-rule functions.

## 6. Data model

- `User`: `name`, unique `email`, `passwordHash`, timestamps.
- `Run`: runner reference, private location samples, route hash, status, distance, duration, territory result counts, start/end times.
- `Territory`: unique cell key and grid coordinates, owner reference, optional challenger reference and challenge expiry, capture time.

`User` to `Run` is one-to-many. `User` to `Territory` is one-to-many for ownership. A territory has at most one active challenger.

## 7. Main screens

1. Overview and explanation of the rules
2. Sign up and sign in
3. Explore map with territory legend and run control
4. Run result state
5. Leaderboard
6. My Runs history

Each screen will be checked at a mobile width and a desktop width. The main journey is: register → open map → start and finish a valid run → inspect claimed cells → see the updated leaderboard and run history.

## 8. API contract

The endpoint list is in `README.md`. All responses are JSON. Errors use `{ "error": "User-readable message" }` and appropriate HTTP status codes. `POST /api/runs` accepts `{ "points": [{ "lat", "lng", "accuracy", "timestamp" }] }`; on success it returns HTTP 201 with `run` and `counts`.

## 9. Verification plan

- Unit test route validation and cell projection.
- Unit test every territory state transition and expired challenges.
- Test each API with valid, invalid, and missing-auth requests.
- Test the complete two-runner challenge and defense flow against MongoDB.
- Test real GPS on a phone over HTTPS, including permission denied and poor signal.
- Test mobile navigation, no-data states, API outage, and refreshing a deep link.

## 10. Known constraints

Browser GPS data is not proof of running and can be manipulated. Foreground location tracking can stop if the browser is closed or suspended. Multi-document territory scoring is not yet transactional. These are explicit limits of the first version and should be addressed before any high-stakes competition.
