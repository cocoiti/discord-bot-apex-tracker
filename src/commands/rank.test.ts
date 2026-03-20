import { describe, it, expect, vi, beforeEach } from "vitest";
import { execute, data } from "./rank.js";
import * as apexApi from "../services/apexApi.js";
import * as resolvePlayerModule from "../utils/resolvePlayer.js";

// Mock apexApi
vi.mock("../services/apexApi.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/apexApi.js")>();
  return {
    ...actual,
    fetchPlayerStats: vi.fn(),
  };
});

// Mock resolvePlayer
vi.mock("../utils/resolvePlayer.js", () => ({
  resolvePlayer: vi.fn(),
}));

describe("rank command", () => {
  const mockInteraction = {
    options: {
      getString: vi.fn(),
    },
    user: { id: "123456" },
    deferReply: vi.fn(),
    editReply: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("data", () => {
    it("should have correct command name", () => {
      expect(data.name).toBe("rank");
    });

    it("should have player option as optional", () => {
      const playerOption = data.options.find(
        (opt) => opt.toJSON().name === "player"
      );
      expect(playerOption).toBeDefined();
      expect(playerOption?.toJSON().required).toBe(false);
    });

    it("should have platform option as optional", () => {
      const platformOption = data.options.find(
        (opt) => opt.toJSON().name === "platform"
      );
      expect(platformOption).toBeDefined();
      expect(platformOption?.toJSON().required).toBe(false);
    });
  });

  describe("execute", () => {
    it("should fetch player stats and reply with rank progress", async () => {
      vi.mocked(resolvePlayerModule.resolvePlayer).mockResolvedValue({
        playerName: "TestPlayer",
        platform: "PC",
        fromRegistration: false,
      });

      vi.mocked(apexApi.fetchPlayerStats).mockResolvedValue({
        name: "TestPlayer",
        platform: "PC",
        level: 500,
        currentRP: 10862,
        rankName: "Platinum",
        rankDiv: 2,
        kills: 5000,
      });

      await execute(mockInteraction as any);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(apexApi.fetchPlayerStats).toHaveBeenCalledWith("TestPlayer", "PC");
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("TestPlayer")
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("Platinum II")
      );
    });

    it("should use PC as default platform", async () => {
      vi.mocked(resolvePlayerModule.resolvePlayer).mockResolvedValue({
        playerName: "TestPlayer",
        platform: "PC",
        fromRegistration: false,
      });

      vi.mocked(apexApi.fetchPlayerStats).mockResolvedValue({
        name: "TestPlayer",
        platform: "PC",
        level: 500,
        currentRP: 5000,
        rankName: "Gold",
        rankDiv: 4,
        kills: 1000,
      });

      await execute(mockInteraction as any);

      expect(apexApi.fetchPlayerStats).toHaveBeenCalledWith("TestPlayer", "PC");
    });

    it("should show error when no player resolved", async () => {
      vi.mocked(resolvePlayerModule.resolvePlayer).mockResolvedValue(null);

      await execute(mockInteraction as any);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining("/register set")
      );
    });

    it("should handle API errors gracefully", async () => {
      vi.mocked(resolvePlayerModule.resolvePlayer).mockResolvedValue({
        playerName: "InvalidPlayer",
        platform: "PC",
        fromRegistration: false,
      });

      vi.mocked(apexApi.fetchPlayerStats).mockRejectedValue(
        new Error("Player not found")
      );

      await execute(mockInteraction as any);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        "エラー: Player not found"
      );
    });

    it("should handle unknown errors", async () => {
      vi.mocked(resolvePlayerModule.resolvePlayer).mockResolvedValue({
        playerName: "TestPlayer",
        platform: "PC",
        fromRegistration: false,
      });

      vi.mocked(apexApi.fetchPlayerStats).mockRejectedValue("Unknown error");

      await execute(mockInteraction as any);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        "エラー: 不明なエラーが発生しました"
      );
    });
  });
});
