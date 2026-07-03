export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

type JournalEventType = 'meal' | 'drink' | 'symptom' | 'checkin';

type CreateEventPayload = {
  eventDate?: string;
  eventTime?: string;
  eventType?: JournalEventType;
  title?: string;
  details?: string;
  rating?: number | null;
  quantityMl?: number | null;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return json({ ok: true, app: 'Health Journal' });
      }

      if (request.method === 'GET' && url.pathname === '/api/drinks') {
        const drinks = await env.DB.prepare(
          'SELECT id, name, emoji, default_quantity_ml AS defaultQuantityMl FROM drink_options ORDER BY id'
        ).all();

        return json({ drinks: drinks.results ?? [] });
      }

      if (request.method === 'GET' && url.pathname === '/api/events') {
        const requestedDate = url.searchParams.get('date') ?? todayIsoDate();
        const events = await env.DB.prepare(
          `SELECT
            id,
            event_date AS eventDate,
            event_time AS eventTime,
            event_type AS eventType,
            title,
            details,
            rating,
            quantity_ml AS quantityMl,
            created_at AS createdAt
          FROM journal_events
          WHERE event_date = ?
          ORDER BY event_time ASC, id ASC`
        ).bind(requestedDate).all();

        const drinkTotals = await env.DB.prepare(
          `SELECT title, SUM(COALESCE(quantity_ml, 0)) AS quantityMl
          FROM journal_events
          WHERE event_date = ? AND event_type = 'drink'
          GROUP BY title
          ORDER BY title`
        ).bind(requestedDate).all();

        const symptoms = await env.DB.prepare(
          `SELECT title, MAX(COALESCE(rating, 0)) AS highestRating
          FROM journal_events
          WHERE event_date = ? AND event_type = 'symptom'
          GROUP BY title
          ORDER BY highestRating DESC, title ASC`
        ).bind(requestedDate).all();

        return json({
          date: requestedDate,
          events: events.results ?? [],
          summary: {
            drinkTotals: drinkTotals.results ?? [],
            symptoms: symptoms.results ?? [],
          },
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/events') {
        const payload = await request.json<CreateEventPayload>();
        const eventDate = payload.eventDate || todayIsoDate();
        const eventTime = payload.eventTime || currentTime();
        const eventType = payload.eventType;
        const title = tidy(payload.title);
        const details = tidy(payload.details);
        const rating = numberOrNull(payload.rating);
        const quantityMl = numberOrNull(payload.quantityMl);

        if (!eventType || !['meal', 'drink', 'symptom', 'checkin'].includes(eventType)) {
          return json({ error: 'Choose a valid journal entry type.' }, 400);
        }

        if (!title) {
          return json({ error: 'Add a title for this journal entry.' }, 400);
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
          return json({ error: 'Use a date in YYYY-MM-DD format.' }, 400);
        }

        if (!/^\d{2}:\d{2}$/.test(eventTime)) {
          return json({ error: 'Use a time in HH:MM format.' }, 400);
        }

        if (rating !== null && (rating < 0 || rating > 10)) {
          return json({ error: 'Ratings must be between 0 and 10.' }, 400);
        }

        const result = await env.DB.prepare(
          `INSERT INTO journal_events
            (event_date, event_time, event_type, title, details, rating, quantity_ml)
          VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(eventDate, eventTime, eventType, title, details, rating, quantityMl).run();

        return json({ ok: true, id: result.meta.last_row_id }, 201);
      }

      const deleteMatch = url.pathname.match(/^\/api\/events\/(\d+)$/);
      if (request.method === 'DELETE' && deleteMatch) {
        const id = Number(deleteMatch[1]);
        await env.DB.prepare('DELETE FROM journal_events WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentTime(): string {
  return new Date().toISOString().slice(11, 16);
}

function tidy(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
