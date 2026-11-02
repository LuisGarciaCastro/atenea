# Atenea

**A personal hub that builds itself through chat.** Message a Telegram bot, the bot opens a GitHub issue, Claude Code implements it (a commit or a PR), and you get a Telegram notification with buttons to approve or reject the PR.

*[Versión en español (full docs)](README.es.md)*

```
Telegram ──▶ /api/telegram-webhook ──▶ expense · event · GitHub issue
                                                       │
                       GitHub Actions + Claude Code ◀──┘
                                  │
                  commit / PR ──▶ Vercel ──▶ Telegram notice (Approve / Reject)
```

## What it does

- **Knowledge.** YouTube videos summarized into highlights, topics and people, plus saved links.
- **Expenses.** Sent by Telegram or an iOS Shortcut, then categorized hourly by an agent.
- **Events.** A message like "dinner Friday at 9pm" ends up in Google Calendar.
- **Triathlon coach.** Every morning and evening it reads WHOOP and Garmin, computes training load and adjusts the plan.
- **"Ask me" chat.** An orchestrator agent routes questions to finance, books and sports sub-agents that answer from your own data.
- **Books, notes and tasks**, all in one place.

## Engineering highlights

- **Agentic self-extension loop** built on GitHub Actions and Claude Code, with versioned agent skills and a `CLAUDE.md` that steers the agent.
- **Multi-agent chat**: an orchestrator plus specialised sub-agents, built on the Anthropic SDK.
- **Scheduled agents and crons** (finance, calendar, coach, content), with failure alerts through a custom GitHub Action.
- **Feature-based architecture.** Each module has `lib/<module>/{types,db}.ts`, `app/api/<module>/` and `app/<module>/`. Client code never imports server-only DB code.
- **Security.** Session middleware covers the whole app. Cron routes use per-module service tokens, and the Telegram webhook is verified with a secret.
- **Design system.** CSS tokens, shared UI primitives and an iPhone/iPad layout that uses container queries.
- **Quality gates**: strict TypeScript, ESLint, Prettier and `npm run check`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Postgres (Neon) · Vercel · Anthropic SDK · Claude Code · GitHub Actions · Telegram Bot API · Zod

## Get started

This repo is a **template**. Click **Use this template** and create a *private* repo, since it will hold personal data. Then follow [docs/instalacion.md](docs/instalacion.md).

```bash
npm install
cp .env.example .env.local
npm run dev
npm run check   # typecheck + lint + format
```

The code and docs are in Spanish. MIT licensed.
