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

## Deploy

mainブランチにpushすると自動的にデプロイされる。

## Docker（ローカル開発用）

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

## シーズン更新手順

新シーズン・新スプリットの対応時は以下の順序で行うこと。

1. **情報収集**: Web検索でシーズン名、開始日、終了日、スプリット日程を調査する
2. **`config/season.json` を更新**: 新シーズンのエントリを追加する
3. **RP閾値の検証**: `npm run rank -- <PlayerName>` でAPIを叩き、返ってくるランク名・RPと設定の閾値が整合するか確認する。Webの情報だけを信用しない
4. **テスト実行**: `npm run test:run` で全テスト通過を確認する。`config/season.json` の変更はテストに影響する
5. **コミット & プッシュ**: テスト通過後にコミット・プッシュする（mainへのpushで自動デプロイされる）

### 注意事項

- RP閾値はシーズンごとに変更される可能性がある。過去シーズンと同じとは限らない
- スプリット終了日が未確定の場合は推定値で設定し、コミットメッセージに明記する
- **push前にテストを必ず実行する**。設定ファイルのみの変更でもテストが壊れることがある

## API

Apex Legends Status API (`https://api.mozambiquehe.re/bridge`) を使用。
Platform: `PC`（デフォルト）, `PS4`, `X1`, `SWITCH`
