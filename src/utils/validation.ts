// プレイヤー名の検証
// 日本語名も許可するため、空文字チェックのみ

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validatePlayerName(name: string): string {
  if (!name || name.trim().length === 0) {
    throw new ValidationError("プレイヤー名を入力してください。");
  }

  // トリムした名前を返す
  return name.trim();
}

const VALID_PLATFORMS = ["PC", "PS4", "X1", "SWITCH"] as const;
export type Platform = (typeof VALID_PLATFORMS)[number];

export function validatePlatform(platform: string): Platform {
  if (!VALID_PLATFORMS.includes(platform as Platform)) {
    throw new ValidationError(
      `無効なプラットフォームです。PC, PS4, X1, SWITCH のいずれかを指定してください。`
    );
  }
  return platform as Platform;
}
