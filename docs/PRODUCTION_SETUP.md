# Going Live: Production Setup Checklist

A step-by-step checklist for moving Event Horizon from "works on my machine" to "the whole team uses shared data."
Tick boxes off (`[ ]` → `[x]`) as you go.

**Who does what**
- 🧑 **You:** needs a browser, a dashboard, a decision, or a real person signing in.
- 🤖 **Claude:** code changes and terminal commands. Ask Claude to do these.

**Where things stand (2026-10-10)**
- The app runs on Convex and WorkOS in **development** only.
- Production doesn't exist yet. There is no production database, no production sign-in setup, and no app build that points at production.
- The migration script has been rehearsed on a copy of the production data. Every record matched.

**Order matters.** Do the phases top to bottom. Each one depends on the one before it.

---

## Phase 0: Check the migrated data (before anything else)

The production copy is loaded into this worktree's local database, so you can look at it in the app first.

- [x] 🧑 In this worktree, run `npm run dev` and sign in.
- [x] 🧑 Open 4–5 events you know well, including at least one with food, beverages, carts and a tournament.
- [x] 🧑 For each one, open the **Estimate**, **BEO** and **Timeline** PDFs, and compare them with the old app.
- [x] 🧑 Check the contacts directory: names, organisations, and the roles linked to events.
- [x] 🧑 Note anything wrong or missing, and tell Claude.
- [x] 🧑 Say "data looks good" to move on.

> Four food items had a blank service style in the old app. They still show as blank (not set). If you'd rather they became **Buffet**, tell Claude before Phase 6.

---

## Phase 1: Code changes needed before production 🤖

Production sign-in can't work without these.

- [x] 🤖 **Change the sign-in return address** from `http://localhost:42070/callback` to `http://127.0.0.1:42070/callback`.
  - *Why:* WorkOS production refuses `localhost` addresses. Its one exception is `http://127.0.0.1` for desktop apps.
- [x] 🤖 **Update the dev WorkOS environment's redirect list** to match. `127.0.0.1` is now the default. The old `localhost` entry stays until this PR is merged, so `main` keeps signing in. Remove it after the merge.
- [x] 🤖 **Add the production WorkOS client ID** (`client_01M4GQCAWTANP82H2RZ0Y5MV37`) to `src/electron/services/authConfig.ts`. It's public, not a secret.
- [x] 🤖 Run the tests (1,342 passed), lint and build.
- [ ] 🧑 Re-test sign-in in this worktree (`npm run dev` → **Sign in**). The browser should return to `127.0.0.1:42070` and the app should sign in.
- [ ] 🧑 Review and merge the pull request. Claude doesn't merge into `main`.
- [ ] 🤖 After the merge, remove `http://localhost:42070/callback` from the dev WorkOS redirect list.

> The WorkOS connection Claude uses can change the sandbox (dev) environment, but **not** Production. Phase 3 has to be done in the dashboard.

---

## Phase 2: Google Cloud Console, i.e. letting WorkOS use "Sign in with Google" 🧑

WorkOS production can't use WorkOS's shared demo Google login. It needs your company's own Google OAuth credentials.

**Sign in to [console.cloud.google.com](https://console.cloud.google.com) with your `westlinks.ca` Google Workspace account.** Use a Workspace account, not a personal Gmail.

### 2a. Create a project
- [ ] Use the project dropdown (top left) → **New Project**.
- [ ] Name it something like `Event Horizon Sign-in`.
- [ ] Make sure **Organization** is `westlinks.ca`. This is what allows "Internal" in step 2b.
- [ ] Click **Create**, then select the new project.

### 2b. Set up the consent screen (what people see when they sign in)
- [ ] Open the menu (☰) → **APIs & Services** → **OAuth consent screen**. Newer consoles call this the **Google Auth Platform**. Click **Get started** if asked.
- [ ] **App name:** `Event Horizon`.
- [ ] **User support email:** your email.
- [ ] **Audience:** choose **Internal**.
  - Only people with a `westlinks.ca` account can sign in. Google blocks everyone else before they reach the app.
  - There's no Google review process and nothing to publish.
  - If **Internal** is greyed out, the project isn't under the `westlinks.ca` organisation. Go back to 2a.
- [ ] **Contact email:** your email.
- [ ] Agree to the policy and click **Create**.
- [ ] **Data Access** or **Scopes:** only `openid`, `email` and `profile` are needed. These are the defaults, so nothing extra to add.

### 2c. Get the redirect address from WorkOS (keep this tab open)
- [ ] In a second tab, open the [WorkOS dashboard](https://dashboard.workos.com) and switch the environment (top left) to **Production**.
- [ ] Go to **Authentication** → **OAuth providers** → **Google** → **Manage**.
- [ ] Choose **Your app's credentials**.
- [ ] Copy the **Redirect URI** it shows. It looks like `https://api.workos.com/sso/oauth/google/.../callback`.

### 2d. Create the OAuth client
- [ ] Back in Google: **Clients** (or **Credentials**) → **Create client** (or **Create credentials → OAuth client ID**).
- [ ] **Application type:** **Web application**. This is correct even though Event Horizon is a desktop app, because Google talks to WorkOS, not to the app.
- [ ] **Name:** `WorkOS – Event Horizon Production`.
- [ ] **Authorized redirect URIs** → **Add URI** → paste the WorkOS Redirect URI from 2c.
- [ ] Click **Create**.
- [ ] **Copy the Client ID and Client Secret right away.** Google may not show the secret again.
  - Paste them straight into WorkOS (next phase). Don't save them in a file, email or chat.

> Google can take up to 5 minutes to activate a new client. If the first sign-in test fails with a Google error, wait a few minutes and try again.

---

## Phase 3: WorkOS production environment 🧑

All in the [WorkOS dashboard](https://dashboard.workos.com), with the environment switcher set to **Production**. Double-check this, because dev is called **Event Horizon Dev**.

### 3a. Connect Google
- [ ] **Authentication** → **OAuth providers** → **Google** → **Manage**, in the same dialog as 2c.
- [ ] Choose **Your app's credentials**.
- [ ] Paste the **Client ID** and **Client Secret** from 2d.
- [ ] Turn Google **on**, then click **Save**.

### 3b. Turn everything else off
- [ ] **Authentication** → **Methods**: turn **off** Email + Password, Magic Auth and Passkeys.
- [ ] **Authentication** → **OAuth providers**: turn **off** everything except Google, including Apple, GitHub and Microsoft.
- [ ] If there's an **SSO** setting, leave it off.

### 3c. Tell WorkOS where to send people after sign-in
- [ ] **Redirects** → **Redirect URIs** → add `http://127.0.0.1:42070/callback`.
  - It must be exactly this, with `127.0.0.1` and not `localhost`. Phase 1 changes the app to match.
- [ ] Make it the **default**.

### 3d. Put the email address in the sign-in token
The database checks every request for a `westlinks.ca` email. Without this step, every request is rejected as "Forbidden."
- [ ] **Authentication** → **Sessions** → **JWT Template**. It may be under **Sessions → Configure**.
- [ ] Set the template to exactly:
  ```json
  { "email": {{ user.email }} }
  ```
- [ ] **Save**.

> Claude can check 3a–3d for you afterwards through the WorkOS connection. Ask it to "verify the WorkOS production settings."

---

## Phase 4: Convex production database

### 4a. Create the production deployment and push the code
Run these from the **main checkout**, not a worktree, after Phase 1 is merged.
- [ ] 🤖 Point production at the WorkOS production environment. Claude runs:
  ```
  npx convex env set WORKOS_CLIENT_ID client_01M4GQCAWTANP82H2RZ0Y5MV37 --prod
  ```
- [ ] 🧑 Approve, then 🤖 run `npx convex deploy`.
  - This creates the production database tables and functions. It starts empty.
  - It asks for confirmation before touching production.
- [ ] 🧑 In the [Convex dashboard](https://dashboard.convex.dev), open the **event-horizon** project → **Production**. Check that the tables and functions are there, and that no table has data yet.
- [ ] 🧑 Copy the production URL from **Settings → URL & Deploy Key** (`https://<name>.convex.cloud`) and give it to Claude.

### 4b. Backups: decision needed 🧑
Convex **automatic** (scheduled) backups need the **Convex Pro plan** (paid). Choose one:
- [ ] **Option A: upgrade to Pro.** Then open **Production → Settings → Backups** and tick **Backup automatically**.
  - Daily backups are kept for 7 days. Weekly backups are kept for 14 days.
- [ ] **Option B: stay on the free plan.** Take a manual backup (**Backups → Backup now**) before risky changes. Claude can also set up a scheduled `npx convex export` that saves a copy to your Mac on a timer.

Whichever you choose:
- [ ] 🧑 Take one manual backup right after the import in Phase 6.

---

## Phase 5: Build an app that talks to production

- [ ] 🤖 In the main checkout's `.env.local`, add `VITE_CONVEX_PRODUCTION_URL=<URL from 4a>`.
  - This file is never committed.
  - Installed builds refuse to start without it, which stops them pointing at dev by accident.
- [ ] 🤖 Build a macOS test version (`npm run dist:mac`). No release is published at this step.
- [ ] 🧑 Install it and click **Sign in**.
  - [ ] Google shows the account chooser, and your `westlinks.ca` account works.
  - [ ] A personal Gmail account is **refused**.
  - [ ] The app opens with an empty event list, as expected before the import.
  - [ ] Create a test event, then delete it. Ask Claude to confirm the production tables are empty again before Phase 6, since the import needs an empty database.

---

## Phase 6: Move the real data across (the switch-over)

Choose a quiet time. After this, the old app's data is frozen and production becomes the source of truth.

- [ ] 🧑 Tell the team (or yourself) **not to edit anything** in the old app from now on.
- [ ] 🧑 Quit the old Event Horizon app completely.
- [ ] 🧑 Make a fresh copy of the live database:
  `~/Library/Application Support/Event Horizon/app.sqlite` → somewhere safe, e.g. `~/Documents/Coding/app-final-YYYY-MM-DD.sqlite`.
  - Keep this copy permanently. It's your fallback.
- [ ] 🤖 **Dry run**, which only reads and changes nothing:
  `npm run legacy-import -- --sqlite <copy> --dry-run`
  - It should end with "All references resolve and every row matches the Convex schema."
- [ ] 🧑 Approve the real import, then 🤖 run:
  `npm run legacy-import -- --sqlite <copy> --target prod`
  - It should end with "Every row, field and reference matches."
- [ ] 🧑 Take a **manual backup** in the Convex dashboard (Production → Backups → Backup now).
- [ ] 🧑 Open the production build and spot-check a few events and their PDFs again.

> **If something goes wrong:** the old app and its `app.sqlite` are untouched, so you can keep using the old app. A failed import rolls itself back, so you can simply run it again. If the script is interrupted, 🤖 `npm run legacy-import -- --reset --target prod` empties production (it refuses if anything was created in the app), and then the import can be re-run.

---

## Phase 7: Remove the old database code 🤖

Do this only after Phase 6 is confirmed good.

- [ ] 🤖 Remove SQLite (`better-sqlite3`), the old main-process database code and its IPC handlers.
- [ ] 🤖 Remove the one-off import script once you're happy it's no longer needed.
- [ ] 🤖 Update `docs/PROJECT.md` to describe the new setup (shared Convex database, WorkOS sign-in).

---

## Phase 8: Windows build and rollout to the team

- [ ] 🤖 Add the Windows installer build and make sure sign-in works on Windows.
- [ ] 🤖 Set up auto-update for both macOS and Windows from GitHub Releases.
- [ ] 🧑 **Decision:** Windows builds won't be paid-signed, so choose one:
  - [ ] Unsigned installer. Each person clicks **More info → Run anyway** the first time.
  - [ ] Self-signed certificate installed on each of the 4 Windows PCs, like the Mac setup.
- [ ] 🧑 On one Windows PC:
  - [ ] Install.
  - [ ] Sign in.
  - [ ] See the shared events.
  - [ ] Edit one and watch it update on your Mac.
  - [ ] Receive an update.
- [ ] 🧑 Roll out to the other 3 Windows users and any other Mac users.
- [ ] 🧑 Archive the old app's `app.sqlite` somewhere safe and stop using the old version.

---

## Quick reference

| Thing | Development | Production |
|---|---|---|
| WorkOS environment | Event Horizon Dev (sandbox) | Production |
| WorkOS client ID | `client_01M4EEGGBMS165EF8347V9N9MG` | `client_01M4GQCAWTANP82H2RZ0Y5MV37` |
| Google login credentials | WorkOS demo credentials | Your own (Phase 2) |
| Sign-in redirect | `http://127.0.0.1:42070/callback` (after Phase 1) | `http://127.0.0.1:42070/callback` |
| Convex database | Cloud dev (main checkout) / local (worktrees) | Convex Production |
| App reads URL from | `VITE_CONVEX_URL` | `VITE_CONVEX_PRODUCTION_URL` |

**Sources:**
- [WorkOS: redirect URI rules](https://workos.com/docs/sso/redirect-uris) and the [127.0.0.1 exception for native apps](https://workos.com/blog/redirect-uris-for-local-staging-and-production)
- [WorkOS: Google OAuth setup](https://workos.com/docs/integrations/google-oauth)
- [Convex: backups](https://docs.convex.dev/database/backup-restore)
