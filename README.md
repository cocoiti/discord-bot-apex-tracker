# Discord Bot Apex Tracker

Apex LegendsのRP（ランクポイント）をトラッキングするDiscord Bot。

## Features

- `/rank <PlayerName>` コマンドで現在のRPと目標ランクまでの進捗を表示
- スプリット終了日までに必要な1日あたりのRPを計算
- ティア単位（Platinum → Diamond → Master）での目標表示

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

`.env` に以下を設定:

- `DISCORD_TOKEN` - Discord Bot Token
- `APEX_API_KEY` - [Apex Legends Status API](https://apexlegendsapi.com) のAPIキー

### 3. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## CLI Testing

Discord無しでランクコマンドをテスト:

```bash
npm run rank -- <PlayerName> [Platform]
```

Platform: `PC`（デフォルト）, `PS4`, `X1`, `SWITCH`

## Docker

```bash
npm run build
docker compose up -d
```

## Configuration

`config/season.json` でスプリット終了日とランクRP閾値を管理。`activeSeason` で現在のシーズンを切り替え。

## License

MIT
