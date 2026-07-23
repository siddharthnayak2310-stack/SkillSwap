# SkillSwap — Product Requirements Doc

## Original Problem Statement
A platform where students & professionals exchange skills without money. If Rahul knows React and Priya knows UI/UX, they teach each other. Peer-to-peer, free, and community driven.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT auth (bcrypt hashed passwords) with cookie + Bearer support. All routes under `/api`. Emergent Object Storage wired for profile photos.
- **Frontend**: React 19 + React Router + Tailwind + Shadcn UI, Neo-Brutalist Soft aesthetic (Cabinet Grotesk + Figtree), iconoir-react for icons.
- **Chat**: HTTP polling (3s interval) — no persistent websocket needed.

## User Personas
- **College Student** — wants low-cost peer learning, matches by skill/college.
- **Working professional** — teaches specialty in exchange for cross-skills.
- **Admin** — moderates users, reviews platform stats.

## Core Requirements (v1 — DONE)
- Register/Login (JWT) with seeded admin (admin@skillswap.com / admin123)
- Profile: name, bio, college, experience level, skills known, skills wanted, category
- Discover: search + filter (skill/category/college), online-only toggle
- Skill Exchange Requests: send / accept / reject / complete
- Chat: polling-based messages, only after request accepted
- Reviews: 1–5 stars + comment, only after exchange completed, shown on profile
- Dashboard: skills taught, skills learned, active swaps, avg rating
- Notifications: request/accept/reject/message/review — with unread badge + Mark all read
- Admin Panel: user list, delete user, live stats (users, exchanges, messages, reviews, active/pending/completed counts)

## Implemented (2026-07)
- Full backend routes for auth, users, exchanges, messages, reviews, notifications, admin, dashboard
- Full frontend: Landing, Login, Register, Dashboard, Discover, Profile, EditProfile, Requests, Chat, Notifications, Admin
- Auth guards + admin guard on routes
- Data-testid attributes on all interactive elements
- Neo-Brutalist theme with pastel palette + black borders + offset shadows

## Backlog (P1 / P2)
- P1: Profile photo upload UI (backend endpoint `/api/upload/photo` ready — needs FE picker + display via `/api/files/*`)
- P1: Session scheduling (calendar) for accepted exchanges — `scheduled_at` field already exists on model
- P1: File sharing in chat (attach small files) + emoji picker
- P2: Password reset flow (forgot/reset endpoints)
- P2: Real-time chat via WebSocket / Socket.io
- P2: Category taxonomy dropdown instead of free-text
- P2: Match suggestions (auto-recommend users based on complementary skills)
- P2: Email notifications
- P2: Report/flag spam users for admin queue
