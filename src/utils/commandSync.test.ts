import { describe, it, expect } from "vitest";
import { commandsMatch } from "./commandSync.js";

const desired = [
  {
    name: "rank",
    description: "Apex Legendsのランク情報を表示します",
    options: [
      { name: "player", description: "プレイヤー名", type: 3, required: false },
      {
        name: "platform",
        description: "プラットフォーム",
        type: 3,
        required: false,
        choices: [
          { name: "PC", value: "PC" },
          { name: "PlayStation", value: "PS4" },
        ],
      },
    ],
  },
  { name: "version", description: "Botのバージョン情報を表示します" },
];

describe("commandsMatch", () => {
  it("同じ内容なら一致する", () => {
    expect(commandsMatch(structuredClone(desired), desired)).toBe(true);
  });

  it("API応答の付加フィールドは無視する", () => {
    const existing = [
      {
        id: "1",
        application_id: "app",
        guild_id: "g",
        version: "123",
        default_member_permissions: null,
        dm_permission: true,
        nsfw: false,
        ...structuredClone(desired[0]),
      },
      { id: "2", application_id: "app", version: "456", ...structuredClone(desired[1]) },
    ];
    expect(commandsMatch(existing, desired)).toBe(true);
  });

  it("required の省略は false と同じとみなす", () => {
    const existing = structuredClone(desired);
    delete (existing[0].options![0] as { required?: boolean }).required;
    expect(commandsMatch(existing, desired)).toBe(true);
  });

  it("options が未定義と空配列は同じとみなす", () => {
    const existing = structuredClone(desired);
    (existing[1] as { options?: unknown[] }).options = [];
    expect(commandsMatch(existing, desired)).toBe(true);
  });

  it("コマンドの並び順が違っても一致する", () => {
    expect(commandsMatch([...structuredClone(desired)].reverse(), desired)).toBe(true);
  });

  it("説明文が変わったら不一致", () => {
    const existing = structuredClone(desired);
    existing[1].description = "変更後の説明";
    expect(commandsMatch(existing, desired)).toBe(false);
  });

  it("コマンドが足りなければ不一致", () => {
    expect(commandsMatch([structuredClone(desired[0])], desired)).toBe(false);
  });

  it("コマンドが増えていれば不一致", () => {
    const existing = [...structuredClone(desired), { name: "extra", description: "余分" }];
    expect(commandsMatch(existing, desired)).toBe(false);
  });

  it("オプションの並び順が変わったら不一致", () => {
    const existing = structuredClone(desired);
    existing[0].options!.reverse();
    expect(commandsMatch(existing, desired)).toBe(false);
  });

  it("choices が変わったら不一致", () => {
    const existing = structuredClone(desired);
    existing[0].options![1].choices = [{ name: "PC", value: "PC" }];
    expect(commandsMatch(existing, desired)).toBe(false);
  });

  it("required が変わったら不一致", () => {
    const existing = structuredClone(desired);
    existing[0].options![0].required = true;
    expect(commandsMatch(existing, desired)).toBe(false);
  });

  it("入れ子のサブコマンドの変更も検出する", () => {
    const withSub = [
      {
        name: "register",
        description: "アカウント登録",
        options: [
          {
            name: "set",
            description: "登録する",
            type: 1,
            options: [{ name: "player", description: "プレイヤー名", type: 3, required: true }],
          },
        ],
      },
    ];
    const existing = structuredClone(withSub);
    existing[0].options[0].options[0].required = false;
    expect(commandsMatch(existing, withSub)).toBe(false);
    expect(commandsMatch(structuredClone(withSub), withSub)).toBe(true);
  });
});
