## 🎯 BoringBlog

### 🧠 One-Line Definition

> **A dead-simple, self-hosted family blog where invite-only authors log in on the frontend, write with a rich-text editor (text, images, embedded video), and publish publicly — deployed on Azure with zero admin-panel complexity.**

### Top Principles

- **Dad-proof simplicity** — If it needs a manual, it's too complex. Login → Write → Publish, nothing else.
- **Quickest to ship** — Minimal moving parts; choose boring, proven tech over clever architecture.
- **Content-first design** — Clean, Medium-like reading experience optimized for Chinese typography.
- **Self-owned data** — All content lives in your own database on Azure; no vendor lock-in.
- **Math-friendly** — Math content supported via image upload (MVP), with visual equation editor planned for future.

---

### 1. Content Authoring

| Category | Feature | Support |
|----------|---------|---------|
| Editor | WYSIWYG rich-text editor (Tiptap-based) | ✅ |
| Editor | Bold, italic, headings, lists, blockquotes | ✅ |
| Editor | Inline image insertion (upload to Azure Blob Storage) | ✅ |
| Editor | Video embed (YouTube, Bilibili via URL paste) | ✅ |
| Editor | Video file upload & hosting | ❌ MVP / ✅ Future |
| Editor | Math content via image upload (photo/screenshot) | ✅ |
| Editor | Visual equation editor (MathLive — click symbols, no syntax) | ❌ MVP / ✅ Future |
| Editor | Code blocks with syntax highlighting | ✅ |
| Editor | Markdown source editing mode | ❌ |
| Editor | Tables | ✅ |
| Editor | Drag-and-drop image reordering | ❌ MVP / ✅ Future |
| Metadata | Post title | ✅ |
| Metadata | Free-form tags (create on the fly) | ✅ |
| Metadata | Cover image | ✅ |
| Metadata | Publish date (auto + manual override) | ✅ |
| Metadata | Draft / Published status toggle | ✅ |

### 2. Reading Experience

| Feature | Support |
|---------|---------|
| Public blog homepage with post list | ✅ |
| Individual post page with clean typography | ✅ |
| Chinese-optimized font stack (Noto Serif SC / Source Han Serif) | ✅ |
| Tag-based filtering / tag page | ✅ |
| Responsive design (mobile + desktop) | ✅ |
| Dark mode | ✅ |
| RSS feed | ✅ |
| Full-text search | ❌ MVP / ✅ Future |
| Table of contents for long posts | ✅ |
| Reading time estimate | ✅ |
| Social sharing meta tags (Open Graph) | ✅ |

### 3. Authentication & Authorization

| Feature | Support |
|---------|---------|
| User table in DB (supports N users, no artificial limit) | ✅ |
| Email + password login (bcrypt hashed) | ✅ |
| Login page on frontend — hidden, not linked in nav (`/login`) | ✅ |
| Session-based auth with secure HTTP-only cookies (iron-session) | ✅ |
| "写文章" button visible only when logged in | ✅ |
| Forgot password → email reset link (via Azure Communication Services) | ✅ |
| Two roles: admin (manage all + invite users) / author (manage own posts) | ✅ |
| Invite-only: admin adds authors via `/settings` page | ✅ |
| Author manages own posts; admin can manage all posts | ✅ |
| Post ownership: each post has an `authorId` FK | ✅ |
| Author name displayed on published posts | ✅ |
| Author profile page (`/author/[name]`) | ✅ |
| Initial admin seeded via CLI/seed script | ✅ |
| Rate limiting on login (5 attempts/min/IP) | ✅ |
| OAuth / social login | ❌ |
| Public registration / signup | ❌ |
| Self-service profile editing | ❌ MVP / ✅ Future |

### 4. Post Management

| Feature | Support |
|---------|---------|
| Create, edit, delete posts | ✅ |
| Draft system (save without publishing) | ✅ |
| Post list view for author (drafts + published) | ✅ |
| Auto-save while editing | ✅ |
| Post slug / URL customization | ✅ |
| Post pinning (sticky post at top) | ✅ |
| Bulk operations | ❌ |
| Post versioning / revision history | ❌ MVP / ✅ Future |

### 5. Media Management

| Feature | Support |
|---------|---------|
| Image upload to Azure Blob Storage | ✅ |
| Auto image compression / resize on upload | ✅ |
| Image alt-text support | ✅ |
| Video embed via URL (YouTube, Bilibili) | ✅ |
| Direct video upload | ❌ MVP / ✅ Future |
| Media library / gallery view | ❌ MVP / ✅ Future |
| Max upload size limit (configurable, default 10MB) | ✅ |

### 6. Technical / Infrastructure

| Feature | Support |
|---------|---------|
| Framework: Next.js (App Router) | ✅ |
| Database: PostgreSQL (Azure Database for PostgreSQL Flexible Server) | ✅ |
| ORM: Prisma | ✅ |
| Image storage: Azure Blob Storage | ✅ |
| Deployment: Azure App Service or Azure Static Web Apps | ✅ |
| CI/CD: GitHub Actions → Azure | ✅ |
| Custom domain + HTTPS | ✅ |
| SEO: sitemap.xml, robots.txt, structured data | ✅ |
| Performance: Static generation for public pages (ISR) | ✅ |
| Server-side rendering for editor pages | ✅ |
| Environment-based configuration (.env) | ✅ |
| Docker support | ✅ |

### 7. UI / UX Principles

| Principle | Description |
|-----------|-------------|
| Medium-like reading | Clean, spacious layout. Content is king — no sidebars, no clutter on post pages. |
| Invisible when not needed | Editor toolbar appears on text selection or via slash commands, not a permanent toolbar wall. |
| Chinese typography first | Proper line height (1.8–2.0), paragraph spacing, punctuation kerning for Chinese text. Noto Serif SC as primary font. |
| Math via images (MVP) | Dad uploads photos of whiteboard / screenshots from Word. Visual equation editor (MathLive) added later — no LaTeX syntax needed. |
| One-click publish | Draft → Published is a single toggle, not a multi-step wizard. |
| Progressive disclosure | Basic features upfront; advanced options (slug, cover image, tags) in a collapsible panel. |
| Mobile-friendly reading | Blog looks great on phones. Editing is desktop-optimized (acceptable on tablet, not phone). |

### 8. Platform / Scope

| Platform | Priority |
|----------|----------|
| Azure (App Service / Static Web Apps) | Primary |
| Modern browsers (Chrome, Firefox, Safari, Edge) | Primary |
| Mobile browsers (reading only) | Primary |
| Desktop browsers (reading + writing) | Primary |
| Tablet (reading + basic writing) | Supported |
| Mobile writing/editing | Future |
| Other cloud providers (AWS, GCP) | Not planned |

### 9. Explicit Non-Goals

| Feature | Reason |
|---------|--------|
| ❌ Public registration / open signup | Invite-only family blog, not a platform. |
| ❌ Comments system | Keep it simple; built-in lightweight comments planned for future. |
| ❌ Newsletter / email subscriptions | Not needed for personal blog. |
| ❌ Paid subscriptions / monetization | This is not a business. |
| ❌ Analytics dashboard | Use Azure Application Insights or external tool if curious. |
| ❌ Full admin panel | Minimal `/settings` for invite only — no dashboards, no WordPress-style admin. |
| ❌ Internationalization (i18n) | Chinese only. UI labels in Chinese. |
| ❌ Plugin / extension system | Fixed feature set, no plugin architecture. |
| ❌ Themes / template switching | One design, one look. Customization via code only. |
| ❌ Real-time collaboration | Single author, no need. |
| ❌ Mobile app | Web-only. |
| ❌ Import from WordPress/Ghost/etc. | Fresh start; dad's first blog. |
| ❌ Social login (Google, GitHub, WeChat) | Overkill for family scope. |
| ❌ Markdown editing mode | Dad doesn't want to learn markup syntax. |
| ❌ LaTeX / KaTeX math syntax | Dad doesn't know English; visual editor deferred to future. |
| ❌ AI writing assistance | Keep it boring and honest. |

---

## Market Context

### Competitors Analyzed

| Product | Strengths | Why Not Fit |
|---------|-----------|-------------|
| **Ghost** | Excellent editor, open source, self-hostable | Overkill — newsletters, memberships, subscriptions. Complex to deploy and maintain. |
| **WordPress** | Huge ecosystem, Gutenberg editor | Bloated, security maintenance burden, plugin hell. Too much for one person's blog. |
| **Medium** | Beautiful reading experience | No self-hosting, no data ownership, no custom domain (free tier), no math support. |
| **Typlog** | Simple, good design, podcast support | Markdown-only editor, paid service ($9/mo), no math support. |
| **Bear Blog** | Ultra-minimal, fast | Text-only — no images, no video, no rich editor. |
| **Substack** | Clean writing UX, free to start | Newsletter-first, no self-hosting, no math, no Chinese typography optimization. |

### Differentiation

- **Simplest possible self-hosted blog**: invite-only family authors, one editor, one design.
- **Chinese typography optimized**: proper fonts, spacing, punctuation handling.
- **Math-friendly**: image upload for MVP, visual equation editor (MathLive) planned — no English syntax required.
- **Azure-native**: designed for Azure from day one, not retrofitted.
- **Zero admin overhead**: no admin panel to learn, no plugins to update, no themes to manage.

---

## MVP Scope Summary

The MVP delivers:
1. Public blog with clean Chinese-optimized reading experience
2. Invite-only multi-author with email login + password reset (admin/author roles)
3. Rich-text editor with images, video embeds, and math via image upload
4. Tag-based organization + author attribution
5. Draft/publish workflow (authors manage own posts, admin manages all)
6. Azure Blob Storage for images
7. Deployed on Azure with CI/CD

Everything marked "❌ MVP / ✅ Future" is deferred to post-launch iterations.
