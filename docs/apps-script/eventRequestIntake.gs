/**
 * Event Horizon — website event request intake (Google Apps Script)
 *
 * Lives in the website request form's response Sheet (Extensions → Apps Script).
 * For each new form response it:
 *   1. emails the team (Reply goes straight to the client),
 *   2. emails the client a short confirmation,
 *   3. POSTs the answers to Event Horizon (Convex `POST /event-requests`), where the
 *      request waits in the Inbox,
 * and records the outcome on an "Event Horizon sync" tab. Anything unfinished is
 * retried every 15 minutes; the owner is emailed if a response keeps failing.
 *
 * This copy is kept in the repo for reference (docs/apps-script/). It holds no
 * secrets: the URL, secret and addresses live in Script Properties.
 *
 * ── Install ──────────────────────────────────────────────────────────────────
 * Do every step signed in as the shared owner account: triggers run as whoever
 * created them, and stop if that account goes away.
 *
 * 1. Paste this file into the Sheet's Apps Script project (replace Code.gs).
 * 2. Project Settings → Script Properties:
 *      CONVEX_URL            https://<deployment>.convex.site/event-requests
 *                            (.convex.site, not .convex.cloud)
 *      EVENT_REQUEST_SECRET  the same secret set on that Convex deployment
 *      TEAM_EMAILS           comma-separated team addresses
 *    Optional:
 *      VENUE_NAME            sender name on emails (default "Westlinks")
 *      CLIENT_REPLY_TO       where client replies go (default: first TEAM_EMAILS address)
 *      ALERT_EMAIL           who gets failure alerts (default: the owner account)
 * 3. In the form, give "Estimated guests" Response validation → Number → Whole
 *    number, between 1 and 10000 (or make it a list of whole numbers). Event Horizon
 *    rejects anything else, and Apps Script can't read that setting to check it.
 * 4. Run `checkSetup` and read the log. It checks the properties, the form's
 *    questions, and that Event Horizon accepts the secret (it sends an empty test
 *    body, which creates nothing).
 * 5. Run `setup`. Approve Google's permission prompt ("unverified app" is expected
 *    for your own script: Advanced → Go to project). It creates the sync tab and
 *    the two triggers. Only responses submitted after the first `setup` are sent.
 *
 * ── Day to day ───────────────────────────────────────────────────────────────
 * - The sync tab shows each response's Status: Synced, Failed: <reason> (retried),
 *   or Rejected: <reason>.
 * - Rejected means Event Horizon refused the answers themselves (e.g. a guest count
 *   that isn't a number, or answers too long to accept), so retrying can't help: the owner is emailed at once and
 *   it isn't retried. The team email still went out, so add the request by hand if
 *   needed. If the cause was the form (see below), fix it and clear the Status to
 *   send it again.
 * - To stop retrying a Failed response, change its Status to "Skip".
 * - Renaming or removing a question in QUESTIONS below breaks the mapping, and
 *   Event Horizon rejects the response. Adding a question is safe: it arrives as an
 *   extra answer.
 * - Changing the secret: update Convex and EVENT_REQUEST_SECRET together. Rows that
 *   fail in between are retried.
 */

/**
 * Question titles Event Horizon reads. Must match convex/lib/eventRequestPayload.ts
 * and the form exactly. Only used by checkSetup and the emails; every answer is sent.
 */
const QUESTIONS = {
  eventName: 'Event name',
  firstName: 'First name',
  lastName: 'Last name',
  organizationName: 'Organization (if any)',
  phone: 'Phone',
  eventType: 'Event type',
  preferredDate: 'Preferred date',
  alternateDate: 'Alternate date',
  startTime: 'Approximate start time',
  guestCount: 'Estimated guests',
  details: 'Tell us about your event',
  referralSource: 'How did you hear about us?',
};
const REQUIRED_QUESTIONS = ['firstName', 'lastName', 'phone', 'eventType', 'guestCount'];
const EVENT_TYPE_CHOICES = ['Golf Tournament', 'Wedding', 'Other Event'];
/**
 * Event Horizon only accepts yyyy-MM-dd dates and HH:mm times, which Forms produces
 * only for these question types. Anything else lets respondents type free text.
 */
const QUESTION_TYPES = { preferredDate: 'DATE', alternateDate: 'DATE', startTime: 'TIME' };
const QUESTION_TYPE_NAMES = { DATE: 'Date', TIME: 'Time' };

const SYNC_SHEET_NAME = 'Event Horizon sync';
const SYNC_HEADERS = ['Response ID', 'Submitted', 'Client', 'Team emailed', 'Client emailed', 'Status', 'Attempts', 'Last attempt', 'Owner alerted'];
const COL = { id: 0, submitted: 1, client: 2, teamEmailed: 3, clientEmailed: 4, status: 5, attempts: 6, lastAttempt: 7, ownerAlerted: 8 };
const SYNC_FROM_PROPERTY = 'SYNC_FROM';
/**
 * First owner alert after this many failed runs (~45 minutes), then once a day. An
 * alert that fails to send is tried again on the next run.
 */
const ALERT_AFTER_ATTEMPTS = 3;
const ALERT_REPEAT_MS = 24 * 60 * 60 * 1000;
/**
 * Event Horizon refused the request body itself (malformed, too large, or answers
 * that fail validation). The same answers would be refused again, so these aren't retried.
 */
const REJECTED_CODES = [400, 413, 422];
/**
 * Stay well inside Apps Script's 6-minute limit; the next run picks up the rest.
 * Counted from the start of the run, so time spent waiting for the lock is included.
 */
const RUN_BUDGET_MS = 4.5 * 60 * 1000;
const LOCK_WAIT_MS = 2 * 60 * 1000;

// ── Triggers and menu-run functions ─────────────────────────────────────────

/** Spreadsheet trigger: On form submit. */
function onFormSubmit() {
  processResponses_();
}

/** Time-driven trigger: every 15 minutes. */
function retryUnsynced() {
  processResponses_();
}

/** Creates the sync tab and (re)creates both triggers. Safe to run again. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getForm_();
  getSyncSheet_();

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(SYNC_FROM_PROPERTY)) {
    props.setProperty(SYNC_FROM_PROPERTY, new Date().toISOString());
  }

  for (const trigger of ScriptApp.getProjectTriggers()) {
    const handler = trigger.getHandlerFunction();
    if (handler === 'onFormSubmit' || handler === 'retryUnsynced') ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('retryUnsynced').timeBased().everyMinutes(15).create();

  const { problems } = readConfig_();
  if (problems.length) console.warn(`Triggers are installed, but fix these first:\n- ${problems.join('\n- ')}`);
  console.log(`Ready. Responses submitted from ${props.getProperty(SYNC_FROM_PROPERTY)} on will be sent.`);
}

/** Read-only checks. Run before setup, and after changing the form or properties. */
function checkSetup() {
  const problems = [];
  const config = readConfig_();
  problems.push(...config.problems);

  let form = null;
  try {
    form = getForm_();
  } catch (error) {
    problems.push(errorMessage_(error));
  }
  if (form) problems.push(...checkForm_(form));

  if (config.convexUrl && config.secret) {
    const result = postToEventHorizon_(config, {});
    // An empty body passes the secret check and then fails validation, so 422 means
    // the URL and secret are right. Nothing is stored.
    if (result.code !== 422) problems.push(`Event Horizon connection: ${result.reason}`);
  }

  if (problems.length) {
    console.warn(`Found ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  } else {
    console.log('All checks passed: properties, form questions, and the Event Horizon connection.');
  }
}

// ── Processing ──────────────────────────────────────────────────────────────

function processResponses_() {
  const startedAt = Date.now();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    console.warn('Another run is still working; the next retry will pick these up.');
    return;
  }
  try {
    const syncFrom = PropertiesService.getScriptProperties().getProperty(SYNC_FROM_PROPERTY);
    if (!syncFrom) throw new Error('Run setup first.');

    const config = readConfig_();
    const sheet = getSyncSheet_();
    const rows = readSyncRows_(sheet);

    for (const response of getForm_().getResponses(new Date(syncFrom))) {
      if (Date.now() - startedAt > RUN_BUDGET_MS) break;
      const id = response.getId();
      let row = rows.get(id);
      if (!row) {
        row = appendSyncRow_(sheet, response);
        rows.set(id, row);
      }
      if (isFinished_(row.values)) continue;
      try {
        processResponse_(config, response, row.values);
      } catch (error) {
        // Keep going with the other responses; this one is retried next run.
        row.values[COL.status] = cellText_(`Failed: ${errorMessage_(error)}`);
        row.values[COL.attempts] = Number(row.values[COL.attempts] || 0) + 1;
        row.values[COL.lastAttempt] = new Date();
      }
      writeSyncRow_(sheet, row);
    }
  } finally {
    lock.releaseLock();
  }
}

function isFinished_(values) {
  const status = String(values[COL.status]);
  if (/^skip/i.test(status)) return true;
  return isDelivered_(status) && values[COL.teamEmailed] instanceof Date && isClientEmailDone_(values[COL.clientEmailed]);
}

/** Event Horizon has answered for good: stored it, or refused the answers themselves. */
function isDelivered_(status) {
  return status === 'Synced' || /^Rejected/.test(String(status));
}

function isClientEmailDone_(value) {
  return value instanceof Date || value === 'No address';
}

/** Does whatever is still outstanding for one response and updates its row values. */
function processResponse_(config, response, values) {
  const request = readResponse_(response);
  const failures = [];

  if (!(values[COL.teamEmailed] instanceof Date)) {
    try {
      sendTeamEmail_(config, request);
      values[COL.teamEmailed] = new Date();
    } catch (error) {
      values[COL.teamEmailed] = cellText_(`Failed: ${errorMessage_(error)}`);
      failures.push(`Team email: ${errorMessage_(error)}`);
    }
  }

  if (!isClientEmailDone_(values[COL.clientEmailed])) {
    if (!looksLikeEmail_(request.respondentEmail)) {
      values[COL.clientEmailed] = 'No address';
    } else {
      try {
        sendClientConfirmation_(config, request);
        values[COL.clientEmailed] = new Date();
      } catch (error) {
        values[COL.clientEmailed] = cellText_(`Failed: ${errorMessage_(error)}`);
        failures.push(`Client confirmation: ${errorMessage_(error)}`);
      }
    }
  }

  let rejectedReason = null;
  if (!isDelivered_(values[COL.status])) {
    const result = postToEventHorizon_(config, request.payload);
    if (result.ok) {
      values[COL.status] = 'Synced';
    } else if (REJECTED_CODES.includes(result.code)) {
      // It only becomes Rejected (no more retries) once the owner has been told.
      rejectedReason = result.reason;
      values[COL.status] = cellText_(`Failed: ${result.reason} (owner not alerted yet)`);
      failures.push(`Event Horizon rejected the answers: ${result.reason}`);
    } else {
      values[COL.status] = cellText_(`Failed: ${result.reason}`);
      failures.push(`Event Horizon: ${result.reason}`);
    }
  }

  values[COL.lastAttempt] = new Date();
  if (!failures.length) return;
  const attempts = Number(values[COL.attempts] || 0) + 1;
  values[COL.attempts] = attempts;
  const lastAlert = values[COL.ownerAlerted];
  const alertDue = attempts >= ALERT_AFTER_ATTEMPTS && !(lastAlert instanceof Date && Date.now() - lastAlert.getTime() < ALERT_REPEAT_MS);
  if (rejectedReason === null && !alertDue) return;
  if (!sendOwnerAlert_(config, request, attempts, failures, rejectedReason !== null)) return;
  values[COL.ownerAlerted] = new Date();
  if (rejectedReason !== null) values[COL.status] = cellText_(`Rejected: ${rejectedReason}`);
}

// ── Reading a form response ─────────────────────────────────────────────────

/**
 * Builds the Event Horizon payload `{ responseId, submittedAt, respondentEmail, answers }`.
 * Answers are keyed by question title, in form order. Forms already gives dates as
 * yyyy-MM-dd and times as HH:mm, which is what Event Horizon expects.
 */
function readResponse_(response) {
  const answers = {};
  const seen = new Map();
  for (const itemResponse of response.getItemResponses()) {
    const value = answerValue_(itemResponse.getResponse());
    if (value === null) continue;
    // Two questions with the same title would overwrite each other. The first keeps the
    // title Event Horizon reads; later ones arrive as "Title (2)" (checkSetup flags them).
    const title = itemResponse.getItem().getTitle().trim();
    const count = (seen.get(title) || 0) + 1;
    seen.set(title, count);
    answers[count === 1 ? title : `${title} (${count})`] = value;
  }
  const respondentEmail = String(response.getRespondentEmail() || answers.Email || '').trim();
  const text = (key) => (typeof answers[QUESTIONS[key]] === 'string' ? answers[QUESTIONS[key]] : '');
  return {
    answers,
    respondentEmail,
    firstName: text('firstName'),
    clientName: [text('firstName'), text('lastName')].filter(Boolean).join(' '),
    title: text('eventName') || [text('organizationName') || text('lastName'), text('eventType')].filter(Boolean).join(' '),
    eventType: text('eventType'),
    preferredDate: text('preferredDate'),
    guestCount: text('guestCount'),
    payload: {
      responseId: response.getId(),
      submittedAt: response.getTimestamp().toISOString(),
      respondentEmail,
      answers,
    },
  };
}

/** Text stays text, checkboxes stay a list, grid rows become "a, b" lines. */
function answerValue_(value) {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return String(value);
  const items = value
    .map((item) => (Array.isArray(item) ? item.filter(Boolean).join(', ') : item))
    .filter((item) => item !== null && item !== undefined && item !== '')
    .map(String);
  return items.length ? items : null;
}

// ── Event Horizon ───────────────────────────────────────────────────────────

/** Returns { ok, code, reason }. Never throws, and never logs the secret. */
function postToEventHorizon_(config, payload) {
  if (!config.convexUrl) return { ok: false, code: 0, reason: 'CONVEX_URL is not set correctly' };
  if (!config.secret) return { ok: false, code: 0, reason: 'EVENT_REQUEST_SECRET is not set' };

  let response;
  try {
    response = UrlFetchApp.fetch(config.convexUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${config.secret}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects: false,
    });
  } catch (error) {
    return { ok: false, code: 0, reason: `Could not reach Event Horizon: ${errorMessage_(error)}` };
  }

  const code = response.getResponseCode();
  let body = {};
  try {
    body = JSON.parse(response.getContentText());
  } catch (error) {
    // Not JSON (e.g. a wrong URL); the status code says enough.
  }
  if (code === 200) return { ok: true, code, reason: body.status || 'created' };

  const detail = Array.isArray(body.problems) ? body.problems.join('; ') : body.error || '';
  const hint = {
    401: ' (EVENT_REQUEST_SECRET does not match the deployment)',
    404: ' (check CONVEX_URL: it should end in .convex.site/event-requests)',
    413: ' (the answers are too long for Event Horizon)',
    503: ' (the secret is not set on this Convex deployment)',
  }[code] || '';
  return { ok: false, code, reason: truncate_(`HTTP ${code}${hint}${detail ? `: ${detail}` : ''}`, 450) };
}

// ── Emails ──────────────────────────────────────────────────────────────────

function sendTeamEmail_(config, request) {
  if (!config.teamEmails.length) throw new Error('TEAM_EMAILS is not set');
  const rows = [['Email', request.respondentEmail || '(not given)']].concat(
    Object.keys(request.answers).map((title) => [title, displayAnswer_(request.answers[title])]),
  );
  const intro = 'A new event request came in through the website. Review it in Event Horizon → Inbox (⌘L / Ctrl+L).';
  const subjectDetails = [request.eventType, request.preferredDate || 'no date', request.guestCount && `${request.guestCount} guests`];

  const options = {
    to: config.teamEmails.join(','),
    subject: singleLine_(`New event request: ${request.title || request.clientName} (${subjectDetails.filter(Boolean).join(', ')})`, 200),
    name: `${config.venueName} website`,
    body: `${intro}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nReply to this email to answer the client.`,
    htmlBody:
      `<p>${escapeHtml_(intro)}</p><table cellpadding="6" style="border-collapse:collapse">` +
      rows
        .map(([label, value]) =>
          `<tr><th align="left" valign="top" style="border-bottom:1px solid #ddd">${escapeHtml_(label)}</th>` +
          `<td style="border-bottom:1px solid #ddd;white-space:pre-wrap">${escapeHtml_(value)}</td></tr>`)
        .join('') +
      '</table><p>Reply to this email to answer the client.</p>',
  };
  if (looksLikeEmail_(request.respondentEmail)) options.replyTo = request.respondentEmail;
  MailApp.sendEmail(options);
}

/**
 * Goes to whatever address the client typed, so it only repeats their first name and
 * answers the form constrains (type, date, guests), never free text: the form can't
 * be used to send arbitrary messages from the venue's account.
 */
function sendClientConfirmation_(config, request) {
  const name = singleLine_(request.firstName, 40);
  const summary = [
    request.eventType && `Event type: ${request.eventType}`,
    request.preferredDate && `Preferred date: ${request.preferredDate}`,
    request.guestCount && `Estimated guests: ${request.guestCount}`,
  ].filter(Boolean);
  const paragraphs = [
    `Hi ${name || 'there'},`,
    `Thank you for your interest in hosting your event at ${config.venueName}. We've received your request and a member of our events team will be in touch soon.`,
    summary.join('\n'),
    `If anything changes in the meantime, just reply to this email.`,
    `${config.venueName} Events Team`,
  ].filter(Boolean);

  const options = {
    to: request.respondentEmail,
    subject: `We've received your event request | ${config.venueName}`,
    name: config.venueName,
    body: paragraphs.join('\n\n'),
    htmlBody: paragraphs.map((p) => `<p style="white-space:pre-wrap">${escapeHtml_(p)}</p>`).join(''),
  };
  if (config.clientReplyTo) options.replyTo = config.clientReplyTo;
  MailApp.sendEmail(options);
}

/** Returns whether the alert was sent. */
function sendOwnerAlert_(config, request, attempts, failures, rejected) {
  try {
    const to = config.alertEmail || Session.getEffectiveUser().getEmail();
    const url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    const intro = rejected
      ? 'Event Horizon rejected the answers to a website event request, so it is not in the Inbox and will not be retried.'
      : `A website event request has failed ${attempts} times. It is retried every 15 minutes.`;
    const next = rejected
      ? 'The team email still went out, so add the request in Event Horizon by hand if needed. If the form caused it ' +
        '(a renamed question, or no number validation on the guest count), fix the form and clear its Status to send it again.'
      : 'Fix the cause (Script Properties, the Convex secret, or the form question titles) and the next retry ' +
        'will send it. To stop retrying, set its Status to "Skip".';
    MailApp.sendEmail({
      to,
      subject: singleLine_(`Event request not delivered: ${request.title || request.clientName}`, 200),
      name: 'Event Horizon intake',
      body:
        `${intro}\n\n` +
        `Client: ${request.clientName} <${request.respondentEmail}>\nResponse ID: ${request.payload.responseId}\n\n` +
        `${failures.join('\n')}\n\nSync tab: ${url}\n\n${next}`,
    });
    return true;
  } catch (error) {
    console.error(`Could not send the failure alert: ${errorMessage_(error)}`);
    return false;
  }
}

// ── Sync tab ────────────────────────────────────────────────────────────────

function getSyncSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SYNC_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SYNC_SHEET_NAME);
    sheet.setFrozenRows(1);
  }
  const headers = sheet.getRange(1, 1, 1, SYNC_HEADERS.length);
  if (headers.getValues()[0].join('\u0000') !== SYNC_HEADERS.join('\u0000')) {
    // New tab, or one made by an older copy of this script with fewer columns.
    headers.setValues([SYNC_HEADERS]).setFontWeight('bold');
  }
  return sheet;
}

/** Map of response ID → { rowNumber, values }. */
function readSyncRows_(sheet) {
  const rows = new Map();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return rows;
  sheet
    .getRange(2, 1, lastRow - 1, SYNC_HEADERS.length)
    .getValues()
    .forEach((values, index) => {
      if (values[COL.id]) rows.set(String(values[COL.id]), { rowNumber: index + 2, values });
    });
  return rows;
}

function appendSyncRow_(sheet, response) {
  const request = readResponse_(response);
  const values = [response.getId(), response.getTimestamp(), cellText_(request.clientName), '', '', 'Pending', 0, '', ''];
  sheet.appendRow(values);
  return { rowNumber: sheet.getLastRow(), values };
}

function writeSyncRow_(sheet, row) {
  sheet.getRange(row.rowNumber, 1, 1, SYNC_HEADERS.length).setValues([row.values]);
}

// ── Setup helpers ───────────────────────────────────────────────────────────

function readConfig_() {
  const props = PropertiesService.getScriptProperties();
  const get = (key) => String(props.getProperty(key) || '').trim();
  const problems = [];

  let convexUrl = get('CONVEX_URL');
  // Only a Convex HTTP host gets the secret, so a typo can't send it somewhere else.
  if (!/^https:\/\/[a-z0-9-]+\.convex\.site\/event-requests$/i.test(convexUrl)) {
    problems.push('CONVEX_URL must look like https://<deployment>.convex.site/event-requests');
    convexUrl = '';
  }
  const secret = get('EVENT_REQUEST_SECRET');
  if (!secret) problems.push('EVENT_REQUEST_SECRET is not set');
  const teamEmails = get('TEAM_EMAILS').split(',').map((email) => email.trim()).filter(Boolean);
  if (!teamEmails.length) problems.push('TEAM_EMAILS is not set');
  teamEmails.filter((email) => !looksLikeEmail_(email)).forEach((email) => problems.push(`TEAM_EMAILS has an invalid address: ${email}`));
  // A bad optional address falls back to its default rather than breaking every send.
  const optionalEmail = (key) => {
    const value = get(key);
    if (value && !looksLikeEmail_(value)) {
      problems.push(`${key} is not a valid address: ${value}`);
      return '';
    }
    return value;
  };
  const clientReplyTo = optionalEmail('CLIENT_REPLY_TO');
  const alertEmail = optionalEmail('ALERT_EMAIL');

  return {
    problems,
    convexUrl,
    secret,
    teamEmails,
    venueName: get('VENUE_NAME') || 'Westlinks',
    clientReplyTo: clientReplyTo || teamEmails.find(looksLikeEmail_) || '',
    alertEmail,
  };
}

function getForm_() {
  const formUrl = SpreadsheetApp.getActiveSpreadsheet().getFormUrl();
  if (!formUrl) throw new Error('This spreadsheet is not linked to a form (Form → Responses → Link to Sheets).');
  return FormApp.openByUrl(formUrl);
}

function checkForm_(form) {
  const problems = [];
  const items = new Map();
  for (const item of form.getItems()) {
    if (!asQuestion_(item)) continue;
    const title = item.getTitle().trim();
    if (items.has(title)) {
      problems.push(`Two questions are titled "${title}"; give each a different title`);
    } else {
      items.set(title, item);
    }
  }

  for (const key of Object.keys(QUESTIONS)) {
    const item = items.get(QUESTIONS[key]);
    if (!item) {
      if (REQUIRED_QUESTIONS.includes(key)) problems.push(`Required question "${QUESTIONS[key]}" is missing from the form`);
      continue;
    }
    if (REQUIRED_QUESTIONS.includes(key) && !asQuestion_(item).isRequired()) {
      problems.push(`"${QUESTIONS[key]}" must be a required question (turn on Required)`);
    }
    const expectedType = QUESTION_TYPES[key];
    if (expectedType && String(item.getType()) !== expectedType) {
      problems.push(`"${QUESTIONS[key]}" must be a ${QUESTION_TYPE_NAMES[expectedType]} question`);
      continue;
    }
    if (item.getType() === FormApp.ItemType.DATE && !item.asDateItem().includesYear()) {
      problems.push(`"${QUESTIONS[key]}" must include the year (question settings → Include year)`);
    }
  }

  const eventType = items.get(QUESTIONS.eventType);
  if (eventType && eventType.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
    const choices = eventType.asMultipleChoiceItem().getChoices().map((choice) => choice.getValue());
    const unknown = choices.filter((choice) => !EVENT_TYPE_CHOICES.includes(choice));
    if (unknown.length) problems.push(`"${QUESTIONS.eventType}" has options Event Horizon won't accept: ${unknown.join(', ')}`);
    if (eventType.asMultipleChoiceItem().hasOtherOption()) {
      problems.push(`"${QUESTIONS.eventType}" must not have an "Other" option (respondents could type any event type)`);
    }
  } else if (eventType) {
    problems.push(`"${QUESTIONS.eventType}" should be a multiple choice question`);
  }

  const collectsEmail = typeof form.getEmailCollectionType === 'function'
    ? form.getEmailCollectionType() !== FormApp.EmailCollectionType.DO_NOT_COLLECT
    : form.collectsEmail();
  if (!collectsEmail) problems.push('The form does not collect email addresses (Settings → Responses → Collect email addresses)');
  return problems;
}

/** The typed item for questions that take an answer; null for headers, images and page breaks. */
function asQuestion_(item) {
  const cast = {
    CHECKBOX: 'asCheckboxItem',
    CHECKBOX_GRID: 'asCheckboxGridItem',
    DATE: 'asDateItem',
    DATETIME: 'asDateTimeItem',
    DURATION: 'asDurationItem',
    GRID: 'asGridItem',
    LIST: 'asListItem',
    MULTIPLE_CHOICE: 'asMultipleChoiceItem',
    PARAGRAPH_TEXT: 'asParagraphTextItem',
    RATING: 'asRatingItem',
    SCALE: 'asScaleItem',
    TEXT: 'asTextItem',
    TIME: 'asTimeItem',
  }[String(item.getType())];
  return cast && typeof item[cast] === 'function' ? item[cast]() : null;
}

// ── Small helpers ───────────────────────────────────────────────────────────

function displayAnswer_(value) {
  return Array.isArray(value) ? value.join(', ') : value;
}

function looksLikeEmail_(value) {
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(String(value || ''));
}

function singleLine_(value, max) {
  return truncate_(String(value || '').replace(/\s+/g, ' ').trim(), max);
}

function truncate_(value, max) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Stops text that starts with = + - @ being read as a formula in the sync tab. */
function cellText_(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function errorMessage_(error) {
  return error && error.message ? error.message : String(error);
}
