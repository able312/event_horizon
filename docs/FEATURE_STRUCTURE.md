# Renderer feature ownership

Keep code with the feature whose behavior it implements. Tests live beside their modules. A workspace can compose several features without owning all their implementation.

## Calendar

`src/features/calendar/` owns the event calendar and table, calendar navigation and search, ICS import, event create/edit forms, and workspace panel state. `CalendarWorkspace` still hosts the existing calendar and Inbox views at `/events`; the URL and shortcuts stay the same.

The page and panel orchestrators connect the Inbox to workspace navigation and the create-event review form. That integration stays here because it coordinates shared panels, draft previews and event navigation.

## Inbox

`src/features/inbox/` owns the Inbox experience:

- `InboxBody.tsx`: selected content and actions, with callbacks for workspace navigation and review forms.
- `components/`: sidebar search, request cards and body header.
- `lib/inboxList.ts`: Inbox search and received-date formatting.

Inbox components receive selection and navigation callbacks instead of importing calendar panel state. Request-specific details and mutations come from `event-requests`.

To add another Inbox item type, compose its list section, selected content and actions here. Keep the new type's domain behavior in its own feature. The current Inbox only handles event requests; there is no generic notification model or registry yet.

## Event requests

`src/features/event-requests/` owns website request behavior:

- `components/`: request details and the requested-date availability calendar.
- `hooks/useEventRequests.ts`: pending requests, acceptance, optimistic dismissal and Undo.
- `hooks/useEventRequestNotifications.ts`: desktop alerts and pending-request badge updates; mounted once by `App` across routes.
- `lib/eventRequestPrefill.ts`: request presentation and conversion into create-form values.
- `lib/requestCalendar.ts`: requested dates and booking rules.
- `lib/newRequestDetection.ts`: session tracking that suppresses startup and repeat alerts.

The availability calendar reuses calendar day markers, tooltips, date grouping and adjacent-month queries. The prefill adapter uses the create form's input type from `calendar/forms/createEventPrefill.ts`, a type-only module, so it does not depend on the form component. These are explicit dependencies on existing calendar functionality.

## Backend and desktop boundaries

Feature hooks continue to use `src/lib/data/eventRequests.ts` and shared query definitions. Desktop calls continue through `src/lib/ipc/eventRequestNotifications.ts`; IPC handlers stay in `src/electron/ipcRoutes/`. Convex functions and schema stay in `convex/`.

Future cleanup can extract shared event forms and mini-calendar primitives when another feature needs them independently. Keep using the existing modules until that separation is useful.
