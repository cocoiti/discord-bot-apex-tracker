# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apex LegendsのRP（ランクポイント）をトラッキングするDiscord Bot。スプリット終了日までに目標ランクに到達するために必要な1日あたりのRPを計算して表示する。

## Tech Stack

- Node.js + TypeScript (ESM)
- discord.js v14
- Apex Legends Status API (https://apexlegendsapi.com)

## Commands

```bash
# Install dependencies
npm install

# Development - run Discord bot
npm run dev

# Development - test rank command via CLI
npm run rank -- <PlayerName> [Platform]

# Build for production
npm run build

# Run production build
npm start
```

## Architecture

```
src/
├── index.ts              # Discord bot entry point
├── commands/rank.ts      # /rank slash command
├── cli/rank.ts           # CLI version of rank command
├── services/apexApi.ts   # Apex Legends API client
└── utils/rankCalculator.ts # RP calculation logic

config/
└── season.json           # Split end date & rank thresholds (Git managed)
```

## Configuration

- `config/season.json` - スプリット終了日とランクRP閾値を手動編集
- `.env` - APIキー（DISCORD_TOKEN, APEX_API_KEY）

## API

Apex Legends Status API (`https://api.mozambiquehe.re/bridge`) を使用してプレイヤーのRP情報を取得。Platform指定は `PC`, `PS4`, `X1`, `SWITCH`, `ANY`。
