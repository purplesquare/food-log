# Health Journal

Health Journal is a symptom-focused food and drink journal for noticing personal patterns over time. It is intentionally not a weight-loss or calorie-tracking app.

The first milestone focuses on quick daily logging for:

- Meals
- Drinks: Water, Black Tea, Rooibos, and Coffee
- Symptoms such as bloating, sluggishness, brain fog, reflux, headache, or anything else you want to track
- Daily check-ins for wellbeing, sleep, stress, energy, and notes

The app is designed to deploy cheaply on Cloudflare using Workers, D1, and static assets.

## Project structure

```text
public/          Static frontend files
src/             Cloudflare Worker API
migrations/      D1 database migrations
wrangler.jsonc   Cloudflare configuration
```

## Local setup

Install dependencies:

```bash
npm install
```

Create a D1 database:

```bash
npm run db:create
```

Copy the `database_id` from Cloudflare's output into `wrangler.jsonc`.

Apply migrations locally:

```bash
npm run db:migrate:local
```

Run the app locally:

```bash
npm run dev
```

Open the local Wrangler URL shown in your terminal.

## Deploy to Cloudflare

Apply the D1 migration to the remote database:

```bash
npm run db:migrate:remote
```

Deploy the Worker and static assets:

```bash
npm run deploy
```

## API

### `GET /api/drinks`

Returns configured drink options.

### `GET /api/events?date=YYYY-MM-DD`

Returns the selected day's timeline plus drink and symptom summaries.

### `POST /api/events`

Creates a journal entry.

Supported `eventType` values:

- `meal`
- `drink`
- `symptom`
- `checkin`

### `DELETE /api/events/:id`

Deletes a journal entry.

## Philosophy

Health Journal helps answer: "What helps me feel my best?"

It records observations from your own day-to-day life and should not be treated as medical advice or diagnosis.
