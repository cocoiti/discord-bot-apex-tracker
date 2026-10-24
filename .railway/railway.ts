import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "discord-bot-apex-tracker";
export default defineRailway(() => {
  const discordBotApexTracker = service("discord-bot-apex-tracker", {
    source: github("cocoiti/discord-bot-apex-tracker", { branch: "main", checkSuites: false }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    start: "node dist/index.js",
    preDeploy: "node dist/db/migrate.js",
    replicas: { "us-east4-eqdc4a": 1 },
    // 再起動ポリシーは宣言しない。railway.toml では ON_FAILURE / 最大10回を
    // 指定していたが、これは Railway の既定値と同じで、プラットフォーム側は
    // 既定値を null として保持する。明示的に書くと apply 後も plan に差分が
    // 出続けてドリフト検知が機能しなくなるため、既定値に委ねる。
  });

  return project("discord-bot-apex-tracker", {
    variables: { managed: false },
    resources: [discordBotApexTracker],
  });
});
