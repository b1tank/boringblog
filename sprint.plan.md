# Sprint Plan — Editor UX + Embed + E2E

## Sprint Scope

Fix core editor interaction issues (link input wrapping, media button styling, save-time alignment, configurable table size, and YouTube embed reliability), and add critical-path Playwright automation coverage (non-trivial cases).

## Prioritized Task List

- [x] **T1** Fix wrapping for “Confirm/Cancel” buttons in the link bubble (single-line compact layout)
- [x] **T2** Improve visual style of image/video insert buttons (use existing theme tokens, no new design system)
- [x] **T3** Fix vertical alignment of “Last saved xx:xx:xx” in editor header
- [x] **T4** Support configurable table rows/columns (not fixed at 3x3)
- [x] **T5** Fix root cause of YouTube “refused to connect” (normalize watch/share URLs to embed URLs)
- [x] **T6** Add critical-path Playwright tests:
  - Create a new article (title, body, tags)
  - Save draft flow
  - Publish flow
  - Insert table (non-default size)
  - Insert image (upload behavior covered with Playwright route mock)
  - Insert video (YouTube URL normalization)
- [x] **T7** Run build and test validation (build + Playwright)
- [x] **T8** Commit atomically and push current branch

## Hiccups & Notes

- Initial Playwright runs connected to an existing local service on `:3000` (not this project). Default `PLAYWRIGHT_BASE_URL` was changed to `http://127.0.0.1:3300`, with env override support.
- An existing `next dev` process held `.next/dev/lock`; during validation, tests were run against the active server via `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3210`.
- Local seeded admin credentials differed from defaults; execution used `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` overrides.
- Image upload behavior can vary by local storage/processing chain; critical-path tests mock `/api/upload` to keep coverage focused on editor image insertion and downstream publish flow.
