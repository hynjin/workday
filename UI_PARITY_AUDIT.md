# Workday UI parity audit

`ui/index.html`, `ui/styles.css`, and `ui/app.js` are the visual source of truth.
Production data and server actions replace only the prototype's sample values.

## Shared shell and interaction rules

- [x] Workday cloud mark, sidebar order, search, language, and logout
- [x] Sky primary color with mint, lilac, peach, butter, and gray supporting palette
- [x] Borderless icon buttons and soft hover surfaces
- [x] Shared typography, spacing, radii, and compact control sizes
- [x] SVG icons replace text glyphs for close, chevrons, more, check, drag, calendar, list, board, and sort
- [x] Only one three-dot menu can remain open; outside click and Escape close it
- [x] Dialogs close on backdrop and Escape
- [x] Area/project rails collapse without a gray panel or border and reverse the chevron
- [x] Korean/English navigation and time/date units follow the active locale

## Schedule

- [x] Approved page header and helper copy
- [x] Day summary, task count, task rows, colored location dots, priority pills
- [x] Blue completion checkbox and clear completed state
- [x] Clicking an active task starts focus; no separate focus button or hover arrow
- [x] Compact calendar with localized weekdays, today, selected date, and recorded marker
- [x] Task edit and schedule controls remain connected to server actions

## Tasks and task dialog

- [x] Inbox, today, upcoming, unscheduled, and completed filters
- [x] Approved directory rows, schedule control, and SVG three-dot menu
- [x] One shared add-task dialog on every page
- [x] Floating searchable location dropdown and matching repeat dropdown
- [x] Optional estimate switch, hour/minute inputs without native steppers, presets
- [x] Full-width colored priority choices
- [x] No-date/date calendar choice and compact calendar
- [x] Edit dialog mirrors the add dialog and persists title, location, estimate, priority, date, and repeat

## Areas

- [x] Approved header, collapsible list rail, detail title, stats, projects, and direct tasks
- [x] Color is edited in the unified edit dialog, not exposed as a separate menu action
- [x] Plus-only section actions
- [x] Connect-existing/create-new project modes and searchable project list
- [x] Task scheduling and destructive actions use the shared interaction rules

## Projects

- [x] Approved header, collapsible rail, detail summary, and area dot
- [x] New/edit project dialog supports no area and the shared floating area dropdown
- [x] Compact color swatches including gray
- [x] List/board switch with approved icons
- [x] Plus-only task/section actions
- [x] Every board card and section has edit/archive/delete controls where applicable
- [x] Task and section drag reordering remains connected to server actions

## Reports

- [x] Weekly/monthly switch and previous/next period navigation
- [x] Goal, planned, and actual time with sky/butter/mint soft rules
- [x] Equal-width seven-day chart columns and localized duration labels
- [x] Area-colored stacked focus flow and selected-day donut
- [x] Area and project focus breakdowns
- [x] Monthly compact calendar with recorded and selected states
- [x] Monthly weekly goals
- [x] Task plan/actual comparison with reversible sort icon
- [x] Planned/completed counts by weekday or week

## Archive and focus

- [x] All/project/area/task archive filters
- [x] Restore and permanent delete appear on row hover
- [x] Focus screen uses the Workday mark, goal/no-goal ring, total time, and plain end-session button

## Prototype-only or intentionally deferred

- Prototype sample names, counts, dates, and durations are not copied as fixed data.
- The approved prototype did not define the custom-repeat editor. The schema can store
  interval, weekdays, month day, start, and end values, but the add/edit dialogs expose
  only none/daily/weekly/monthly until that screen is designed.
- Login, account callback, local guest storage/import, search results, and keyboard
  shortcuts are production-only flows. They use the same visual tokens but have no
  corresponding screen in the static prototype.
