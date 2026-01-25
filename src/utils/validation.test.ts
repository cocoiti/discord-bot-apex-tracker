import { describe, it, expect } from "vitest";
import {
  validatePlayerName,
  validatePlatform,
  ValidationError,
} from "./validation.js";

describe("validation", () => {
  describe("validatePlayerName", () => {
    it("有効なプレイヤー名を受け入れる", () => {
      expect(validatePlayerName("Player123")).toBe("Player123");
      expect(validatePlayerName("Test_Player")).toBe("Test_Player");
      expect(validatePlayerName("Pro-Gamer")).toBe("Pro-Gamer");
      expect(validatePlayerName("a")).toBe("a");
    });

    it("日本語のプレイヤー名を受け入れる", () => {
      expect(validatePlayerName("プレイヤー")).toBe("プレイヤー");
      expect(validatePlayerName("日本語名テスト")).toBe("日本語名テスト");
      expect(validatePlayerName("Player_日本語")).toBe("Player_日本語");
    });

    it("前後の空白をトリムする", () => {
      expect(validatePlayerName("  Player  ")).toBe("Player");
      expect(validatePlayerName("\tName\n")).toBe("Name");
    });

    it("空文字列を拒否する", () => {
      expect(() => validatePlayerName("")).toThrow(ValidationError);
      expect(() => validatePlayerName("   ")).toThrow(ValidationError);
    });

    it("ValidationErrorが正しいメッセージを持つ", () => {
      try {
        validatePlayerName("");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain("プレイヤー名");
      }
    });
  });

  describe("validatePlatform", () => {
    it("有効なプラットフォームを受け入れる", () => {
      expect(validatePlatform("PC")).toBe("PC");
      expect(validatePlatform("PS4")).toBe("PS4");
      expect(validatePlatform("X1")).toBe("X1");
      expect(validatePlatform("SWITCH")).toBe("SWITCH");
    });

    it("無効なプラットフォームを拒否する", () => {
      expect(() => validatePlatform("PS5")).toThrow(ValidationError);
      expect(() => validatePlatform("pc")).toThrow(ValidationError); // 小文字
      expect(() => validatePlatform("")).toThrow(ValidationError);
      expect(() => validatePlatform("XBOX")).toThrow(ValidationError);
    });
  });
});
