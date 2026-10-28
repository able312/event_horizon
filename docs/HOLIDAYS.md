# Shared Canadian holidays

The main monthly calendar shows a small flag beside dates in Google's public "Holidays in Canada" calendar. Hovering or focusing the flag lists every name for that date. Holidays are read-only context: they are never events, have no client or status, and don't appear in availability, search or PDFs.

## How it works

- **Source:** `https://calendar.google.com/calendar/ical/en.canadian%23holiday%40group.v.calendar.google.com/public/basic.ics`, fixed in `convex/lib/holidayFeed.ts`. Nothing takes a URL from a caller, and the renderer never contacts Google.
- **Refresh:** `convex/crons.ts` runs the internal action `holidays:refresh` every Monday at 09:00 UTC. It downloads the feed (20 s timeout, 2 MB limit) and parses all of it before anything is written. Then one mutation (`holidays:recordRefresh`) replaces the cache.
- **Storage:** two independent tables. Neither changes any existing table.
  - `holidayCache`: one document holding every entry the feed supplied (all years), plus the first and last year it covered.
  - `holidaySync`: one document with the last attempt, last success and last error.
- **Reads:** `holidays:forMonth` (a `companyQuery`) returns the month's entries, the years covered and whether the last refresh failed. It is a live query, so a refresh reaches every open calendar.
- **Dates** stay as `YYYY-MM-DD` with an exclusive end, as in the feed. They never pass through a timestamp, so the day doesn't depend on anyone's time zone.

### Failure rules

- A failed refresh records the error and keeps the cache. Failures include a network error, HTTP error, oversized, malformed or truncated response, fewer than 20 entries, more than 2,000, no entries for the current year, or a feed that lost more than half the cached entries.
- An unchanged feed only updates `holidaySync`; the cache document is not rewritten.
- Every run is ordered by its start time. If a refresh finishes after a newer one, it is discarded, so an old response can't overwrite newer data.
- The calendar never blocks on holidays. A single line beside the month controls covers the exceptions:
  - "Holidays couldn't be loaded." (with Retry)
  - "Holiday dates aren't available yet." (nothing has been cached)
  - "Holiday dates aren't available for this year yet." (the year is past the feed's last year)
  - "Holidays may be out of date." (the last refresh failed)

## Deploying and the one-time bootstrap

The new tables are additive, so existing documents still satisfy the schema and no data migration is needed. Without a bootstrap, an empty deployment shows "Holiday dates aren't available yet." until the first Monday run.

From the **main checkout**, after the change is merged:

1. Take a manual backup (Convex dashboard → Production → Backups → Backup now), as for any production deploy.
2. `npx convex deploy`. This adds the two tables, the `holidays` functions and the weekly cron.
3. `npx convex run --prod holidays:bootstrap`
   - Expect `{ "status": "updated" }`.
   - It is safe to repeat: once a cache exists it returns `{ "status": "skipped" }` without fetching.
   - If it returns `{ "status": "failed", "message": … }`, nothing was cached. Run it again later, or let the cron fill the cache.
4. In the dashboard, check that `holidayCache` has one document, about 430 entries spanning 2021–2031 as of October 2026, and that **Cron Jobs** lists "refresh Canadian holidays".

The development deployment works the same way without `--prod`. New worktree databases (`npm run convex:worktree`) run the bootstrap during setup. If they have no network, setup still completes.

**Operator refresh** (fetch now, e.g. after Google corrects a date): `npx convex run --prod holidays:refresh`. There's no in-app button, because the calendar has no settings or overflow menu to put one in. Internal functions need deployment admin access, so no cooldown is needed.

## What the feed contains (checked 2026-10-28)

- About 200 KB, with 433 all-day entries across 2021–2031 (37–43 a year). There are no recurring entries, multi-day spans or cancellations. 2027 and 2028 are complete, e.g. Easter Monday 2027-03-29, Thanksgiving 2027-10-11 and Victoria Day 2028-05-22.
- It is a national calendar of **public holidays and observances**. About half are observances, such as Valentine's Day, Groundhog Day, Halloween and the Daylight Saving Time changes.
- Titles mark scope. Examples are "(regional holiday)", "(Yukon)" and "Heritage Day (Alberta)". The app shows them exactly as given and doesn't call anything an Ontario statutory holiday.
- **Missing for the venue:** the feed has **no Family Day** (Ontario, third Monday of February). Islander Day, Louis Riel Day and Saint-Jean-Baptiste Day are also absent. The calendar won't flag Family Day.
- Substitute days off are listed as separate entries. Examples are Boxing Day on 2027-12-27 and 2027-12-28, and "Canada Day Holiday" on 2028-07-03. They show on the dates the feed gives them; the app adds none of its own.
- Coverage only means the years the feed supplied entries for. It doesn't promise that Google lists every holiday in those years.

## Cost

One ~200 KB download a week, about 1 MB a month before retries. The cache is about 60 KB, and each calendar month view reads that one document, which Convex caches until it changes. This should stay within the included allowance, but check the current plan limits; it isn't guaranteed to be free.
