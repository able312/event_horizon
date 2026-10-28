# Google Calendar Setup

How to connect Event Horizon's **Add to Google Calendar** button to the venue's shared Google Calendar. Do this once per Google account setup; steps 6–7 repeat per Convex deployment.

**How it works.** The button calls a Convex action (`convex/googleCalendar.ts`). Convex signs in to Google as the **Clubhouse** account (`@westlinks.ca`) with a saved refresh token and creates or updates the event on the shared calendar. **Remove from Google Calendar** deletes the linked Google event and clears the link, and deleting an event in Event Horizon deletes its linked Google event first. If Google refuses, the event is kept. Deployments without these env vars (local and worktree databases) skip the Google step when deleting an event. Nothing Google-related ships with the desktop app; the client ID, client secret, refresh token and calendar ID live only in Convex deployment env vars.

**Why not a service account?** The Workspace doesn't allow sharing calendars outside `westlinks.ca`, and a service account is outside the domain. So the app acts as a real in-domain account instead.

**Do every step signed in as the Clubhouse account.** Use a separate browser profile or a private window so you don't create things under your own account by mistake.

You'll need: the Clubhouse account's password, a terminal in the Event Horizon main checkout (Node 22, `npm install` done), and Convex access for the project.

---

## 1. Calendar access and calendar ID

1. Open [Google Calendar](https://calendar.google.com) as Clubhouse.
2. If Clubhouse doesn't own the shared calendar, have the owner open the calendar's **Settings and sharing** → **Share with specific people or groups** → add the Clubhouse address with **Make changes to events**. If Clubhouse owns it, skip this.
3. As Clubhouse, open **Settings** (gear) → click the shared calendar in the left list → scroll to **Integrate calendar** → copy the **Calendar ID**. It looks like `…@group.calendar.google.com` (or an email address for a primary calendar).
4. For testing, create a second calendar owned by Clubhouse (e.g. "Event Horizon Test") and copy its Calendar ID too. The dev deployment will write there.

## 2. Google Cloud project and API

1. Go to [console.cloud.google.com](https://console.cloud.google.com) as Clubhouse.
2. Project picker → **New project**. Name it e.g. `event-horizon-calendar`. Set **Organization** (may be labelled **Location**) to `westlinks.ca`. Create it and make sure it's selected.
3. **APIs & Services** → **Library** → search **Google Calendar API** → **Enable**.

## 3. Consent screen: Internal, with the calendar.events scope

Google has renamed this area; it may be labelled **Google Auth Platform** or **OAuth consent screen**.

1. Open it and click **Get started** if prompted. App name: `Event Horizon`. Support and contact email: the Clubhouse address.
2. **Audience** (may be labelled **User type**): choose **Internal**.
   - Internal apps can only be used by `westlinks.ca` accounts, so Google doesn't require app review.
   - An **External** app left in "Testing" issues refresh tokens that expire after 7 days, which would break the button every week. Internal avoids that.
   - If Internal isn't offered, the project isn't under the `westlinks.ca` organization. Go back to step 2.
3. **Data Access** (may be labelled **Scopes**) → **Add or remove scopes** → add `https://www.googleapis.com/auth/calendar.events` (shown as "View and edit events on all your calendars") → **Update** → **Save**.

## 4. Create the OAuth client

1. **Clients** (may be under **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**).
2. Application type: **Desktop app**. Name: `Event Horizon Convex`.
3. Create, then copy the **Client ID** and **Client secret** somewhere temporary (a password manager). Newer consoles may only show the secret once; if you lose it, add a new secret to the same client.

No redirect URIs are needed: Desktop app clients accept `http://127.0.0.1:<any port>`.

## 5. Get the refresh token

In the Event Horizon main checkout:

```sh
npm run google-calendar:auth
```

1. Paste the client ID and secret when asked. (Or set `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` in the shell first.)
2. A browser tab opens on Google's consent page. If it doesn't, copy the printed URL into the browser where Clubhouse is signed in.
3. Pick the **Clubhouse** account and **Allow**. The tab says you can close it.
4. The terminal prints the refresh token and the `npx convex env set GOOGLE_CALENDAR_REFRESH_TOKEN …` commands.

The script listens on `127.0.0.1` only, gives up after 5 minutes, and writes nothing to disk. Don't save the token in a file, commit it, or paste it in chat.

## 6. Set the env vars on each deployment

From the main checkout. Without `--prod` the command targets the dev deployment in `.env.local`; with `--prod` it targets production.

**Dev** (points at the test calendar):

```sh
npx convex env set GOOGLE_CALENDAR_CLIENT_ID <client ID>
npx convex env set GOOGLE_CALENDAR_CLIENT_SECRET <client secret>
npx convex env set GOOGLE_CALENDAR_REFRESH_TOKEN <refresh token>
npx convex env set GOOGLE_CALENDAR_ID <test calendar ID>
```

**Production** (points at the shared calendar):

```sh
npx convex env set GOOGLE_CALENDAR_CLIENT_ID <client ID> --prod
npx convex env set GOOGLE_CALENDAR_CLIENT_SECRET <client secret> --prod
npx convex env set GOOGLE_CALENDAR_REFRESH_TOKEN <refresh token> --prod
npx convex env set GOOGLE_CALENDAR_ID <shared calendar ID> --prod
```

The same client and refresh token work for both; only the calendar ID differs. Check with `npx convex env list` (add `--prod` for production). A local worktree deployment needs the same four commands run from that worktree if you want to test there.

## 7. Test it

1. `npm run dev`, sign in, open an event that has a start and end date/time.
2. On the event's **Overview**, click **Add** in the **Google Calendar** strip. The event appears on the **test** calendar, and the strip's **Open** button (or the toast's) shows it in Google Calendar.
3. Change the event (e.g. the title) and click **Update**. The same Google event updates; no duplicate appears.
4. Repeat once in the installed app against production, then use **Remove from Google Calendar** in the strip's menu if you don't want that test event on the shared calendar. **Disconnect** in the same menu unlinks an event and leaves the Google event in place.

---

## Troubleshooting

Messages are what the app shows. Convex logs (dashboard → **Logs**) have Google's exact error.

| Message | Cause | Fix |
|---|---|---|
| "Google Calendar isn't set up on this deployment yet…" | One or more of the 4 env vars is missing on this deployment. The log names which. | Step 6 for that deployment (`--prod` for the installed app). |
| "…access to Google Calendar has expired or was removed. Ask an admin to sign it in again." | The refresh token was revoked (Clubhouse removed the app's access, the token went unused for 6 months, the client secret was deleted/rotated) or the client ID/secret is wrong. | Re-run step 5 and set the new `GOOGLE_CALENDAR_REFRESH_TOKEN` on each deployment. If the client changed, set its ID and secret too. |
| "Google Calendar refused the change. Check that the Clubhouse account can make changes to events…" | Clubhouse lost **Make changes to events** on that calendar, `GOOGLE_CALENDAR_ID` is wrong, or the Calendar API isn't enabled. | Step 1 (permission and calendar ID), step 2 (API enabled). |
| "The linked Google Calendar event isn't on the shared calendar…" | The linked event was deleted for good, or it lives on a different calendar. | In the **Google Calendar** strip on the event's Overview, open **⋯** → **Remove from Google Calendar**, then **Add** again (or **⋯** → **Link existing event…** with the right one). |
| "The linked Google Calendar ID isn't one Event Horizon recognises…" | The stored link isn't an event ID, iCalUID, `eid` or event URL. | In the **Google Calendar** strip, open **⋯** → **Change linked event…** or **Remove from Google Calendar**, then try again. |
| "Set both start and end date/time…" | The event has no start or end. | Fill both in. |
| "Google Calendar didn't accept the change. Try again in a minute." | Google error or rate limit. | Retry; check Convex logs if it persists. |

**Consent page says the app is blocked by your admin** (or the script reports `admin_policy_enforced` / `access_denied`): a Workspace admin restricts third-party apps. In the [Admin console](https://admin.google.com) → **Security** → **Access and data control** → **API controls**, tick **Trust internal, domain-owned apps** (or mark the Event Horizon client as **Trusted** under **Manage Third-Party App Access**). Then re-run step 5.

**Script says no refresh token was returned:** Google only issues one on a fresh consent. Remove Event Horizon at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) as Clubhouse, then re-run step 5.

**Token leaked or you want to rotate it:** as Clubhouse, remove Event Horizon at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) (this revokes every token for the app), then re-run step 5 and set the new token on every deployment.
