# CollabSpace

A Notion-style collaborative workspace: rich-text pages with real-time co-editing, templates, comments, version history, sharing, tasks, a personal To-Do List and an AI chat.

## Features

- **Auth:** email and password sign-up and login (bcrypt), signed session cookie (JWT, 7 days).
- **Workspaces:** members with roles, nested pages, favorites, recents, search, notifications.
- **Editor (Tiptap + Yjs):** headings, lists, checklists, quotes, code blocks, tables, calendar, images, dividers, callouts, toggle lists, links, emoji, `/` command menu, icon-based toolbar with an Insert menu.
- **Real-time collaboration:** a separate WebSocket server syncs edits, presence and cursors, with Postgres persistence and Redis fan-out.
- **Page covers:** upload an image or paste a URL, with preview; presets available. Uploaded covers are stored in the database.
- **Templates:** gallery with categories, search, banner covers, live content thumbnails, Preview and Use Template. Save any page as your own template (cover included).
- **Sharing:** per-user permissions, link access, publish a page to the web, comments, version history.
- **Tasks:** workspace tasks (list and board views).
- **To-Do List (`/todos`):** personal, per-user tasks with To Do and Done tabs, due dates, descriptions, edit and delete. Seven example tasks are created once per user on first visit.
- **AI chat:** configurable provider (Groq, Gemini or Anthropic) through environment keys.
- **Settings:** profile, password, preferences, sidebar customization.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend and API | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Editor | Tiptap (ProseMirror) with Yjs |
| Collaboration server | Node.js, `ws`, `y-protocols`, `ioredis` |
| Database | PostgreSQL with Prisma ORM |
| Cache and fan-out | Redis |
| Validation and auth | zod, bcryptjs, jose |

## Project structure

```
app/
  (auth)/             login, register
  (app)/              dashboard, pages, templates, todos, library, workspaces, settings, updates, ai
  api/                REST routes (JSON)
  p/                  public published pages
components/           Editor, EditorToolbar, CoverPicker, TemplateGallery, TodoList, Sidebar, ...
collaboration-server/ Yjs WebSocket server
lib/                  auth, permissions, templates, todos, blocks, covers, schema helpers
prisma/               schema.prisma and migrations
tests/                tests
```

## Getting started

**Prerequisites:** Node.js 18+ (20+ recommended), PostgreSQL, Redis (used by the collaboration server).

1. Install dependencies:
   ```
   npm install
   ```
2. Create a `.env` file (see below).
3. Set up the database:
   ```
   npx prisma migrate deploy
   npx prisma generate
   ```
4. Run the app:
   ```
   npm run dev
   ```
5. Run the collaboration server in a second terminal. Check the `scripts` in `package.json` for the exact command (for example `npx tsx collaboration-server/server.ts`).

Open http://localhost:3000. The collaboration server defaults to port 1234.

On Windows PowerShell 5, run commands on separate lines or separate them with `;` instead of `&&`.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Secret used to sign session tokens (must match on app and collab server) |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app, for example `http://localhost:3000` |
| `NEXT_PUBLIC_COLLABORATION_URL` | WebSocket URL of the collab server, for example `ws://localhost:1234` |
| `COLLABORATION_PORT` | Port for the collab server (default 1234) |
| `REDIS_URL` | Redis connection string for the collab server |
| `COOKIE_DOMAIN` | Optional; parent domain (for example `.example.com`) so the session cookie reaches both services |
| `GROQ_API_KEY`, `GROQ_MODEL` | Optional AI provider |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional AI provider |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Optional AI provider |

`NEXT_PUBLIC_*` values are baked in at build time; rebuild after changing them.

## API overview

All routes live under `/api`, use JSON and require the session cookie unless public. Errors return `{ "error": "message" }`.

| Area | Routes |
|---|---|
| Auth and account | `/auth/register`, `/auth/login`, `/auth/logout`, `/account`, `/account/settings`, `/account/password` |
| Workspaces | `/workspaces`, `/workspaces/[id]`, `/workspaces/[id]/members`, `/workspaces/[id]/pages`, `/workspaces/[id]/tasks` |
| Pages | `/pages/[id]`, `/duplicate`, `/favorite`, `/share`, `/permissions`, `/people`, `/comments`, `/versions`, `/uploads` |
| Templates | `/templates`, `/templates/[id]`, `/templates/[id]/cover`, `/template-cover/[key]` |
| To-Do | `GET, POST /todos`, `PATCH, DELETE /todos/[id]` |
| Other | `/tasks/[id]`, `/comments/[id]`, `/versions/[id]`, `/uploads/[id]`, `/notifications`, `/search`, `/ai/chat` |

Every To-Do query is filtered by the logged-in user's id, so users can only see and change their own tasks.

## Data model

Main Prisma models: `User`, `Workspace`, `WorkspaceMember`, `Page`, `PagePermission`, `Comment`, `DocumentVersion`, `DocumentUpdate`, `Task`, `Favorite`, `Notification`, `PageVisit`, `UserSettings`, `Upload`, `CustomTemplate`, `TemplateStat`, `Todo`.

Images, covers and template covers are stored as bytes in PostgreSQL, so back up the database.

## Deployment

The app needs a platform that can run two long-lived Node services (Next.js and the WebSocket collab server) plus PostgreSQL and Redis, such as Render.

1. Create PostgreSQL and Redis.
2. Web service 1 (Next.js): build `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`, start `npm start`.
3. Web service 2 (collab server): same repo, start command from your `package.json`.
4. Put both services on subdomains of one custom domain and set `COOKIE_DOMAIN` so the login cookie works for the WebSocket server.
5. Never run `prisma migrate reset` against production data.

Serverless-only hosts such as Vercel cannot run the collab server.

## Notes

- Built-in templates live in `lib/templates.ts` and ship with the code; saved templates, todos and uploads live in the database.
- Images inside a saved template point at the original page's uploads, so deleting that page breaks them.
- A pasted cover URL is stored as a link; if the remote image is removed it will stop loading.
