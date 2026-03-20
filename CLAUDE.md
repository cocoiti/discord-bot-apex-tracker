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

## Database & Migrations

- ORM: Drizzle ORM (PostgreSQL)
- マイグレーションファイル: `drizzle/` ディレクトリ
- スナップショット: `drizzle/meta/` ディレクトリ
- マイグレーションはBot起動時に自動実行（`src/db/migrate.ts`）

### マイグレーション作成手順

1. `src/db/schema.ts` にスキーマ変更を記述
2. `drizzle/` に SQL マイグレーションファイルを作成（例: `0002_session_no_fk.sql`）
3. `drizzle/meta/_journal.json` に新しいエントリを追加（idx, tag, when を設定）
4. `drizzle/meta/` に対応するスナップショット JSON を作成

### リリース時の注意事項

- マイグレーションはBot起動時に自動実行されるため、**破壊的変更（カラム削除、型変更等）はデータ移行を先に行うこと**
- FK制約の削除・追加はデータ不整合に注意。既存データが制約を満たすか事前確認が必要
- ロールバックが必要な場合は逆方向のマイグレーションSQLを手動で実行する（Drizzleには自動ロールバック機能がない）
- Docker環境ではDBボリュームが永続化されているか確認してからデプロイする
- 大きなスキーマ変更時は段階的にリリースする（例: 1. カラム追加 → 2. コード変更 → 3. 旧カラム削除）

## API

Apex Legends Status API (`https://api.mozambiquehe.re/bridge`) を使用。
Platform: `PC`（デフォルト）, `PS4`, `X1`, `SWITCH`
