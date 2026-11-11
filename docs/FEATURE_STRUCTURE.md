# Renderer feature ownership

Keep code with the feature whose behavior it implements. Tests live beside their modules. A workspace can compose several features without owning all their implementation.

## Calendar

`src/features/calendar/` owns the event calendar and table, calendar navigation and search, ICS import, event create/edit forms, and workspace panel state. `CalendarWorkspace` still hosts the existing calendar and Inbox views at `/events`; the URL and shortcuts stay the same.

The shared holiday layer is calendar-owned too: `hooks/useMonthHolidays.ts` reads the month through `src/lib/data/holidays.ts`, `lib/calendarHolidays.ts` maps holidays to days and words the coverage notice, `components/CalendarHolidayMarker.tsx` is the flag and tooltip beside the day number, and `navigation/CalendarHolidayNotice.tsx` sits beside the month controls. Only the main month grid shows holidays; the sidebar and request mini calendars don't. See [HOLIDAYS.md](HOLIDAYS.md).

The page and panel orchestrators connect the Inbox to workspace navigation and the create-event review form. That integration stays here because it coordinates shared panels, draft previews and event navigation.

## Inbox

`src/features/inbox/` owns the Inbox experience:

- `InboxBody.tsx`: selected content and actions (a request or an event update; one at a time), with callbacks for workspace navigation and review forms.
- `components/`: sidebar search, request and update cards, and body header.
- `lib/inboxList.ts`: Inbox search for both item types and received-date formatting.
- `hooks/useInboxDesktopAlerts.ts`: mounted once by `App`; runs each item type's desktop alerts and keeps the dock badge at pending requests plus unread updates.

Inbox components receive selection and navigation callbacks instead of importing calendar panel state. Request-specific details and mutations come from `event-requests`; update-specific ones from `event-notifications`.

To add another Inbox item type, compose its list section, selected content and actions here, and add its alerts and badge count to `useInboxDesktopAlerts`. Keep the new type's domain behavior in its own feature.

## Event notifications

`src/features/event-notifications/` owns the Inbox's "Updates": teammates adding, deleting, or changing the name, date, type or status of an event.

- `hooks/useEventNotifications.ts`: the signed-in user's updates, with optimistic read, mark all read, and dismiss with Undo.
- `hooks/useEventNotificationAlerts.ts`: one desktop alert per batch of new unread updates; updates there at startup stay silent.
- `lib/eventNotificationText.ts`: card summaries ("Moved to …", "Status → Confirmed") and the body's before/after rows.
- `components/EventNotificationDetailView.tsx`: the selected update in the Inbox body.

Which fields notify, and how one person's quick follow-up edits fold into their earlier notification, live in `src/lib/events/eventChangeNotifications.ts`, shared with Convex.

## Event requests

`src/features/event-requests/` owns website request behavior:

- `components/`: request details and the requested-date availability calendar.
- `hooks/useEventRequests.ts`: pending requests, acceptance, optimistic dismissal and Undo.
- `hooks/useEventRequestNotifications.ts`: desktop alerts for new requests; mounted through `useInboxDesktopAlerts`. Startup and repeat alerts are suppressed by `src/lib/notifications/newIdDetection.ts`, shared with event updates.
- `lib/eventRequestPrefill.ts`: request presentation and conversion into create-form values.
- `lib/requestCalendar.ts`: requested dates and booking rules.

The availability calendar reuses calendar day markers, tooltips, date grouping and adjacent-month queries. The prefill adapter uses the create form's input type from `calendar/forms/createEventPrefill.ts`, a type-only module, so it does not depend on the form component. These are explicit dependencies on existing calendar functionality.

## Settings

`src/features/settings/` owns the Settings page at `/settings/:category` (opened from the gear in the sidebar footer, `components/SettingsButton.tsx`):

- `lib/settingsCategories.ts`: the category list, its groups and URL resolution. "Personal" categories belong to the signed-in user; "Venue" categories are shared by the whole team.
- `components/settingsCategoryContent.tsx`: maps each category ID to the component it renders. TypeScript requires an entry for every category.
- `SettingsWorkspace.tsx`, `components/`: the page shell (category nav in the sidebar, the selected category in the body) and the shared `SettingsSection` card.
- `profile/`: the Profile category. Users set the name the team sees (`users.preferredName`); email and sign-in come from their Google account and aren't editable. Name rules shared with Convex live in `src/lib/users/userName.ts`.

Settings owns the page, the nav and how each category is laid out, not the domain behavior a setting controls. When a setting is read elsewhere (a GST number on the invoice, menu templates in the event's food and beverage sections), keep its data in `src/lib/data` and its domain logic with the feature that uses it, and give Settings a category component that edits it. For example, the venue's default estimate terms already live in `venueSettings`; a future Venue category would edit them alongside a GST number, while the estimate and invoice keep reading them through `useVenueSettings`. Larger editors (food and beverage templates) can live in their own feature folder and export the component Settings maps to.

## Backend and desktop boundaries

Feature hooks continue to use `src/lib/data/eventRequests.ts` and shared query definitions. Desktop calls continue through `src/lib/ipc/eventRequestNotifications.ts`; IPC handlers stay in `src/electron/ipcRoutes/`. Convex functions and schema stay in `convex/`.

Future cleanup can extract shared event forms and mini-calendar primitives when another feature needs them independently. Keep using the existing modules until that separation is useful.
