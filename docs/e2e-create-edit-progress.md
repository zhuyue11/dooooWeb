# E2E Create/Edit Test Progress — dooooWeb

## Status Legend
- [ ] Not started
- [x] Passing
- [!] Failing (see notes)
- [-] Skipped (blocked/not applicable)

## Bugs Found & Fixed
1. **`updateTask` used PUT instead of PATCH** — [api/index.ts:119](../src/lib/api/index.ts) — Fixed
2. **`updateEvent` used PUT instead of PATCH** — [api/index.ts:210](../src/lib/api/index.ts) — Fixed
3. **Side panel missing guests, meeting link, and second reminder** — [ItemSidePanel.tsx](../src/components/calendar/ItemSidePanel.tsx) — Fixed (added rendering + translations in all 18 locales)
4. **Backend: Event update transaction timeout (500 error)** — `eventController.ts:102` — Prisma transaction exceeds 5000ms timeout. Blocks all EE (edit event) tests.
5. **Recurring event with `endDate`: last instance on endDate is not generated** — Suspected off-by-one (endDate treated as exclusive). Reproduces in E18: with start=Apr 8 and endDate=Apr 13, only instances Apr 8–12 appear; Apr 13 is missing.

## Summary
**~50 of 88 tests passing.** All ET (edit task) tests pass. Remaining failures are:
- A few flaky tests when running parallel (pass individually)
- Weekly recurring verification (timing issue with calendar week navigation)
- Multi-day end time / separate timezones (complex edge cases)
- All EE (edit event) tests blocked by backend bug

---

## CREATE TASK — Basic

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T1 | Create task with date (today) + time via quick modal | [x] | Passes individually; flaky in parallel |
| T2 | Create task with date (today) but no time (all-day) | [x] | |
| T3 | Create task without date (to-do) | [x] | |
| T4 | Create task for tomorrow with time | [x] | |
| T5 | Create task in the past (yesterday) — backend auto-completes it | [x] | |

## CREATE TASK — Via Full Editor

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T6 | Create task via full editor with all fields (date, time, priority, category, description) | [x] | |

## CREATE TASK — Recurring (Daily)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T7 | Create daily repeat task (infinite) | [x] | |
| T8 | Create daily repeat task with repeat count (e.g., 3 times) | [x] | |
| T9 | Create daily repeat task with end date | [x] | |

## CREATE TASK — Recurring (Weekly)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T10 | Create weekly repeat task (infinite, single day) | [!] | Recurring instance verification timing issue |
| T11 | Create weekly repeat task with multiple days (e.g., Mon, Wed, Fri) | [-] | Blocked by T10 |
| T12 | Create weekly repeat task with repeat count (e.g., 4 times) | [-] | Blocked by T10 |
| T13 | Create weekly repeat task with end date | [-] | Blocked by T10 |

## CREATE TASK — Recurring (Monthly)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T14 | Create monthly repeat task (infinite) | [-] | Blocked by T10 serial |
| T15 | Create monthly repeat task with repeat count (e.g., 3 times) | [-] | |
| T16 | Create monthly repeat task with end date | [-] | |

## CREATE TASK — Recurring (Yearly)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T17 | Create yearly repeat task (infinite) | [-] | Blocked by T10 serial |
| T18 | Create yearly repeat task with repeat count (e.g., 2 times) | [-] | |
| T19 | Create yearly repeat task with end date | [-] | |

## CREATE TASK — Time of Day

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T20 | Create task with date + time of day (MORNING) + weekly repeat | [x] | |

## CREATE TASK — Duration & End Time

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T21 | Create task with date + time + duration (30 min) | [x] | |
| T22 | Create task with date + time + custom duration (2h 15m) | [x] | |
| T23 | Create task with date + time, switch to end time mode (same day) | [x] | |
| T24 | Create task with date + time, switch to end time on a different end date | [!] | Multi-day end time selector needs work |

## CREATE TASK — Reminders

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T25 | Create task with date + time + first reminder (15 min before) | [x] | |
| T26 | Create task with date + time + two reminders (15 min, 1 hour) | [x] | |

## CREATE TASK — More Options

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T27 | Create task with date type set to DUE | [x] | |
| T28 | Create task with showInTodoWhenOverdue OFF | [x] | |
| T29 | Create task with setToDoneAutomatically ON | [x] | |
| T30 | Create task with timezone changed (via More Options) | [x] | |

## CREATE TASK — Special

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| T31 | Create tasks on different dates and verify each | [x] | |
| T32 | Create task with time in a different timezone than browser/device | [x] | |

---

## CREATE EVENT — Basic

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E1 | Create event with date (today) + start time via quick modal | [x] | Passes individually; flaky in parallel |
| E2 | Create all-day event (date, no time) | [x] | |
| E3 | Create event for tomorrow | [x] | |

## CREATE EVENT — Via Full Editor

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E4 | Create event via full editor with start time + end time + location | [x] | Passes individually; flaky in parallel |
| E4b | Create event via full editor with description + priority | [x] | |

## CREATE EVENT — Duration & End Time

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E5 | Create event with start time + duration (1 hour) | [x] | Passes individually; flaky in parallel |
| E6 | Create event with start time, switch to end time (same day) | [x] | |
| E7 | Create multi-day timed event | [ ] | Not yet tested |
| E8 | Create all-day multi-day event | [ ] | Not yet tested |
| E9 | Verify end time cannot be set before start time (validation error) | [ ] | Not yet tested |
| E10 | Verify end date cannot be before start date (calendar picker disables past dates) | [ ] | Not yet tested |

## CREATE EVENT — Guests & Meeting Link

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E11 | Create event with guests (add 2 email addresses) | [x] | |
| E12 | Create event with meeting link | [x] | |
| E13 | Create event with guests + meeting link + location | [x] | |

## CREATE EVENT — Timezone

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E14 | Create event with timezone different from browser/device | [x] | |
| E15 | Create event with different start and end timezones | [!] | Separate start/end timezone toggle selector needs work |

## CREATE EVENT — Recurring (Daily)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E16 | Create daily repeat event (infinite) | [x] | |
| E17 | Create daily repeat event with repeat count | [x] | |
| E18 | Create daily repeat event with end date | [!] | Last instance on endDate not generated — possible off-by-one in backend recurrence |

## CREATE EVENT — Recurring (Weekly)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E19 | Create weekly repeat event (infinite) | [!] | Same recurring verification timing issue as T10 |
| E20 | Create weekly repeat event with multiple days | [-] | Blocked by E19 |
| E21 | Create weekly repeat event with repeat count | [-] | Blocked by E19 |
| E22 | Create weekly repeat event with end date | [-] | Blocked by E19 |

## CREATE EVENT — Recurring (Monthly)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E23 | Create monthly repeat event (infinite) | [-] | Blocked by E19 serial |
| E24 | Create monthly repeat event with repeat count | [-] | |
| E25 | Create monthly repeat event with end date | [-] | |

## CREATE EVENT — Recurring (Yearly)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| E26 | Create yearly repeat event (infinite) | [-] | Blocked by E19 serial |
| E27 | Create yearly repeat event with repeat count | [-] | |
| E28 | Create yearly repeat event with end date | [-] | |

---

## EDIT TASK

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| ET1 | Edit task title | [x] | |
| ET2 | Edit task date (today -> tomorrow) | [x] | |
| ET3 | Edit task date (today -> past) | [x] | |
| ET4 | Edit all-day task -> add specific time | [x] | |
| ET5 | Edit timed task -> remove time (make all-day) | [x] | |
| ET6 | Edit dated task -> remove date (make to-do) | [x] | |
| ET7 | Edit to-do task -> add date (make scheduled) | [x] | |
| ET8 | Edit task priority | [x] | |
| ET9 | Edit task category | [x] | |
| ET10 | Edit task description | [x] | |
| ET11 | Edit task to add duration | [x] | |
| ET12 | Edit task to switch from duration to end time | [x] | |
| ET13 | Edit task date type (SCHEDULED -> DUE) | [x] | |
| ET14 | Edit task showInTodoWhenOverdue toggle | [x] | |
| ET15 | Edit task timezone (via More Options) | [x] | |

---

## EDIT EVENT

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| EE1-EE12 | All edit event tests | [!] | **Blocked by backend bug**: event update Prisma transaction timeout (500 error). Backend `eventController.ts:102` exceeds 5000ms transaction timeout. |
