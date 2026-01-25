# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apex LegendsのRP（ランクポイント）をトラッキングするDiscord Bot。スプリット終了日までに目標ランク（ティア単位: Platinum → Diamond → Master）に到達するために必要な1日あたりのRPを計算して表示する。

## Tech Stack

- Node.js 22 + TypeScript (ESM)
- discord.js v14
- Vitest (testing)
- Docker

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Run Discord bot (development)
npm run rank -- <PlayerName> [Platform]  # Test rank command via CLI
npm run build        # Build for production
npm start            # Run production build
npm test             # Run tests (watch mode)
npm run test:run     # Run tests once
```

## Docker

```bash
npm run build
docker compose up -d
docker compose logs -f
```

## Architecture

```
src/
├── index.ts              # Discord bot entry point
├── commands/rank.ts      # /rank slash command
├── cli/rank.ts           # CLI version of rank command
├── services/apexApi.ts   # Apex Legends API client
└── utils/
    ├── rankCalculator.ts      # RP calculation logic
    └── rankCalculator.test.ts # Unit tests

config/
└── season.json           # Split end date & rank thresholds (Git managed)
```

## Configuration

- `config/season.json` - スプリット終了日とランクRP閾値（`activeSeason` でシーズン切り替え）
- `.env` - APIキー（DISCORD_TOKEN, APEX_API_KEY）

## API

Apex Legends Status API (`https://api.mozambiquehe.re/bridge`) を使用。
Platform: `PC`（デフォルト）, `PS4`, `X1`, `SWITCH`
