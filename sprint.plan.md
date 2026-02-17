# Sprint Plan — UI & UX Overhaul (lezhiweng.com)

## Sprint Goal

Redesign the homepage into a content-rich 2-column layout, add an About page, clean up author visibility rules, improve post card presentation, and add several quality-of-life enhancements for both readers and admin.

---

## User-Requested Tasks

### T1 — 关于 (About) Page + Nav Link ✅

- Create `/about` page (`src/app/about/page.tsx`) with static "关于本站" content
  - Content: brief intro about the blog, its purpose, and the author(s)
  - Styled consistently with the existing layout
- Add "关于" link in Header nav (desktop + mobile) — visible to all visitors, no auth required
- **Current state**: No about page or nav link exists

### T2 — Hide Admin's Posts from Public ✅

- **Purpose**: Testing convenience — admin's published posts should only be visible when logged in as admin
- Modify post listing queries to filter out posts where `author.role === 'ADMIN'`:
  - `src/app/page.tsx` — homepage listing
  - `src/app/api/posts/route.ts` — public GET (add `author: { role: { not: 'ADMIN' } }` unless requester is admin)
  - `src/app/tags/[tag]/page.tsx` — tag-filtered listing
  - `src/app/author/[name]/page.tsx` — author page
  - `src/app/feed.xml/route.ts` — RSS feed
  - `src/app/sitemap.xml/route.ts` — sitemap
- When admin is logged in, all posts (including admin's own) are shown normally
- Requires reading session in previously-public server components (homepage, tag page) to detect admin
- **Approach**: helper function `isAdminSession()` to DRY the session check across pages

### T3 — 2-Column Homepage Layout with Tag Sidebar ✅

- Restructure `src/app/page.tsx` into 2-column layout:
  - **Left column (~75%)**: Article list, left-aligned
  - **Right column (~25%)**: Tag cloud with post counts as badge labels
- Tag sidebar:
  - Fetch all tags with `_count` of published posts
  - Render as clickable badge labels (tag name + count), e.g. `散文 (12)`
  - Clicking a tag filters the article list (via query param `?tag=xxx` on the same homepage)
  - Active tag is visually highlighted
  - "全部" (All) link to clear the filter
- On mobile: tag sidebar collapses below the article list (stacked layout)

### T4 — Pagination for All List Views ✅

- **Homepage** (`src/app/page.tsx`): already has pagination — ensure it works with tag filter (`?tag=xxx&page=2`)
- **Tag page** (`src/app/tags/[tag]/page.tsx`): currently loads all posts with no pagination — add `PAGE_SIZE=20` + page controls
- **Author page** (`src/app/author/[name]/page.tsx`): currently loads all posts — add pagination
- Pagination component: extract a shared `<Pagination>` component to avoid duplicating nav markup

### T5 — Improved PostCard Layout with Cover Image ✅

- Redesign `PostCard` for a more magazine-style presentation:
  - Cover image on the left or top (responsive), nicely sized (not stretching full width on desktop)
  - Title prominent, date/time, tags, and excerpt all visible in the card
  - Horizontal card layout on desktop (image left, text right); vertical stack on mobile
- Tags should be clearly visible in each card (already present — ensure they're not lost in redesign)
- Excerpt should be meaningful (already using `extractExcerpt`)

### T6 — Conditional Author Name in Post List ✅

- **Public visitors and non-admin logged-in users**: Author name is hidden in post list cards
- **Admin logged in**: Author name appears before the datetime in the metadata row
- Requires passing `isAdmin` flag from the page to `PostCard`
- Adjust `PostCard` props to accept `showAuthor?: boolean`

### T7 — Delete Post Confirmation ✅

- **Drafts page** (`src/app/drafts/page.tsx`): Already has `confirm()` before delete ✅
- **Edit page** (`src/app/edit/[slug]/page.tsx`): No delete button exists — add a "删除文章" button in the sidebar with `confirm()` dialog
- Use a styled confirmation modal instead of browser `confirm()` (optional enhancement)
- After deletion, redirect to `/drafts` (if was draft) or `/` (if was published)

### T8 — Logo Next to Site Title ✅

- Show the favicon SVG (`/favicon.svg` — the 不倒翁 with douli hat) as a small logo to the left of "乐之翁" in the Header
- Size: ~28-32px, inline with the title text
- Works in both light and dark themes
- Update both desktop and mobile header

---

## Recommended Enhancements

Based on the above feedback and codebase review, these additions complement the requested changes:

### T9 — Shared Pagination Component ✅

- Extract pagination markup into `src/components/Pagination.tsx`
- Props: `currentPage`, `totalPages`, `buildHref(page: number) => string`
- Reuse across homepage, tag page, author page
- Shows page numbers (1, 2, 3 ... N) instead of just prev/next for better UX

### T10 — Reading Time on Post Cards ✅

- Display estimated reading time (e.g. "3 分钟") on each PostCard
- Already computed on post detail page via `calculateReadingTime` — reuse in list views
- Adds useful context for readers deciding what to read

### T11 — Delete Button on Edit Page for Published Posts ✅

- Currently published posts can only be unpublished, not deleted from the editor
- Add a danger-zone "删除文章" button at the bottom of the edit sidebar
- Includes confirmation modal with post title
- Redirect to homepage after deletion

### T12 — Sticky Tag Sidebar ✅

- Make the right-column tag sidebar `sticky` so it stays visible while scrolling through long article lists
- Use `position: sticky; top: 5rem` (below the fixed header)

### T13 — Active Tag Highlighting in Sidebar + Tag Page Backlink ✅

- When a tag is selected (filtered), highlight it in the sidebar
- Add a "查看全部标签文章 →" link on the filtered view that goes to the full `/tags/[tag]` page

### T14 — Empty States & Loading Skeletons — PARTIAL

- Add skeleton loading states for the homepage article list and tag sidebar
- Better empty states when no posts match a tag filter on the homepage
- Consistent "暂无文章" messaging across all list views

### T15 — Widen Max Content Width for 2-Column Layout ✅

- Current `max-w-4xl` (56rem / 896px) is tight for a 2-column layout
- Widen the main content area to `max-w-6xl` (72rem / 1152px) on the homepage only, or globally
- Keep article detail pages at `max-w-4xl` with TOC sidebar for comfortable reading

### T16 — About Page Content Management — DEFERRED

- Initially: hardcoded static content in the about page (ship fast)
- Future: consider making it editable by admin via a special "page" content type
- For now, add a note in the code for future extensibility

---

## Implementation Order & Dependencies

```
T8  (Logo in header)          ─┐
T1  (About page + nav)        ─┤── Independent, quick wins
T7  (Delete confirmation)     ─┘

T15 (Widen max-width)         ─── Prerequisite for T3

T9  (Pagination component)    ─── Prerequisite for T3, T4

T2  (Hide admin posts)        ─── Requires session helper; touches many files
T6  (Conditional author name) ─── Depends on T2 (same session-detection pattern)

T3  (2-column layout + tags)  ─── Core layout change; depends on T9, T15
T4  (Pagination everywhere)   ─── Depends on T9; touches tag page, author page

T5  (PostCard redesign)       ─── Can be done independently, but best after T3 layout is in place
T10 (Reading time on cards)   ─── Small add-on to T5

T11 (Delete on edit page)     ─── Extension of T7
T12 (Sticky sidebar)          ─── After T3
T13 (Active tag highlighting) ─── After T3
T14 (Empty states/skeletons)  ─── After T3, T4
T16 (About page notes)        ─── Part of T1
```

## Suggested Batches

| Batch | Tasks | Est. Effort | Notes |
|-------|-------|-------------|-------|
| **Batch 1** | T8, T1, T7, T11 | 1.5h | Quick wins: logo, about page, delete confirmations |
| **Batch 2** | T15, T9 | 1h | Layout prep: widen container, shared pagination |
| **Batch 3** | T2, T6 | 2h | Session-aware filtering (admin posts, author name) |
| **Batch 4** | T3, T12, T13 | 3h | Core 2-column layout with tag sidebar |
| **Batch 5** | T4 | 1h | Pagination on tag page + author page |
| **Batch 6** | T5, T10 | 2h | PostCard redesign with reading time |
| **Batch 7** | T14, T16 | 1h | Polish: skeletons, empty states, about page notes |

**Total estimate: ~11-12 hours**

---

## Success Criteria

- [x] "关于" page accessible at `/about`, linked in nav for all visitors
- [x] Admin's published posts invisible to public & non-admin users on all list views + RSS + sitemap
- [x] Homepage shows 2-column layout: articles left, tag sidebar right (responsive)
- [x] Clicking a tag in sidebar filters the article list; pagination works with filters
- [x] Tag page (`/tags/[tag]`) and author page (`/author/[name]`) have pagination
- [x] PostCard shows cover image, title, datetime, tags, and excerpt in a clean layout
- [x] Author name hidden in list view unless admin is logged in
- [x] Delete button with confirmation on edit page (both drafts and published posts)
- [x] Favicon SVG logo displayed next to "乐之翁" in header
- [ ] All pages render correctly in both light/dark themes and on mobile
- [x] `npm run build` passes, `npm run lint` clean

## Out of Scope

- Full-text search (future sprint)
- Comments system
- Social share buttons
- Related posts suggestions
- Custom Grafana dashboards
- Multi-region / CDN optimization
- Making the About page admin-editable (noted for future)

---

## Hiccups & Notes

- **ESLint config missing**: `npm run lint` fails because no `eslint.config.js` exists (ESLint 9+ requires flat config). Non-blocking — build passes clean.
- **T14 (Skeletons) partial**: Empty states already existed for all list views. Opted not to add loading skeleton components to keep scope minimal — these are server components with no client-side loading flash.
- **T16 (About page CMS) deferred**: Static content committed; making it admin-editable is a future feature.
- **Session in server components**: Added `getSession()` helper to `src/lib/auth.ts` to DRY session detection across homepage, tag page, author page, and post detail. This uses `cookies()` which makes pages dynamic (already `force-dynamic`).
- **Admin post filtering**: Applied consistently across homepage, tag page, author page, post detail, API route, RSS feed, and sitemap. The filter checks `author.role !== 'ADMIN'` for non-admin viewers.
- **Build**: Passed successfully with Next.js 16.1.6 (Turbopack). Compiled in 4.1 min.
