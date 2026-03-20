import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleVoiceStateUpdate } from "./voiceStateUpdate.js";
import * as registration from "../services/registration.js";
import * as notificationSettings from "../services/notificationSettings.js";
import * as sessionStore from "../services/sessionStore.js";
import * as apexApi from "../services/apexApi.js";
import * as rpSnapshot from "../services/rpSnapshot.js";

vi.mock("../services/registration.js");
vi.mock("../services/notificationSettings.js");
vi.mock("../services/sessionStore.js");
vi.mock("../services/apexApi.js");
vi.mock("../services/rpSnapshot.js");

function makeVoiceState(channelId: string | null, channelName: string | null, userId = "user1") {
  return {
    id: userId,
    channel: channelId
      ? { id: channelId, name: channelName }
      : null,
  } as any;
}

function makeClient() {
  const sendFn = vi.fn();
  return {
    users: {
      fetch: vi.fn().mockResolvedValue({ send: sendFn }),
    },
    _sendFn: sendFn,
  } as any;
}

describe("voiceStateUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip when channel didn't change", async () => {
    const oldState = makeVoiceState("ch1", "Apex Ranked");
    const newState = makeVoiceState("ch1", "Apex Ranked");
    const client = makeClient();

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(registration.getRegistration).not.toHaveBeenCalled();
  });

  it("should skip for unregistered users", async () => {
    const oldState = makeVoiceState(null, null);
    const newState = makeVoiceState("ch1", "Apex Ranked");
    const client = makeClient();

    vi.mocked(registration.getRegistration).mockResolvedValue(null);

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(sessionStore.startDbSession).not.toHaveBeenCalled();
  });

  it("should skip non-Apex channels", async () => {
    const oldState = makeVoiceState(null, null);
    const newState = makeVoiceState("ch1", "General Voice");
    const client = makeClient();

    vi.mocked(registration.getRegistration).mockResolvedValue({
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
    });

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(sessionStore.startDbSession).not.toHaveBeenCalled();
    expect(sessionStore.endDbSession).not.toHaveBeenCalled();
  });

  it("should start session when joining Apex channel", async () => {
    const oldState = makeVoiceState(null, null);
    const newState = makeVoiceState("ch1", "Apex Ranked");
    const client = makeClient();

    vi.mocked(registration.getRegistration).mockResolvedValue({
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
    });
    vi.mocked(sessionStore.getActiveDbSession).mockResolvedValue(null);
    vi.mocked(apexApi.fetchPlayerStats).mockResolvedValue({
      name: "TestPlayer",
      platform: "PC",
      level: 500,
      currentRP: 5000,
      rankName: "Gold",
      rankDiv: 4,
      kills: 1000,
    });
    vi.mocked(notificationSettings.getNotificationConfig).mockResolvedValue({
      dmOnJoin: true,
      dmOnLeave: true,
    });

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(sessionStore.startDbSession).toHaveBeenCalledWith(
      "user1", "TestPlayer", "PC", 1000, 5000, "voice", "Apex Ranked"
    );
    expect(client._sendFn).toHaveBeenCalled();
  });

  it("should end session when leaving Apex channel", async () => {
    const oldState = makeVoiceState("ch1", "Apex Ranked");
    const newState = makeVoiceState(null, null);
    const client = makeClient();

    vi.mocked(registration.getRegistration).mockResolvedValue({
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
    });
    vi.mocked(sessionStore.getActiveDbSession).mockResolvedValue({
      id: 1,
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
      startTime: new Date(),
      startKills: 1000,
      startRp: 5000,
      endTime: null,
      endKills: null,
      endRp: null,
      rpChange: null,
      killsGained: null,
      source: "voice",
      channelName: "Apex Ranked",
    });
    vi.mocked(sessionStore.endDbSession).mockResolvedValue({
      id: 1,
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
      startTime: new Date(),
      startKills: 1000,
      startRp: 5000,
      endTime: new Date(),
      endKills: 1003,
      endRp: 5120,
      rpChange: 120,
      killsGained: 3,
      source: "voice",
      channelName: "Apex Ranked",
    });
    vi.mocked(apexApi.fetchPlayerStats).mockResolvedValue({
      name: "TestPlayer",
      platform: "PC",
      level: 500,
      currentRP: 5120,
      rankName: "Gold",
      rankDiv: 4,
      kills: 1003,
    });
    vi.mocked(notificationSettings.getNotificationConfig).mockResolvedValue({
      dmOnJoin: true,
      dmOnLeave: true,
    });

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(sessionStore.endDbSession).toHaveBeenCalledWith("user1", 1003, 5120);
    expect(rpSnapshot.recordSnapshot).toHaveBeenCalledWith(
      "user1", 5120, "Gold", 4, 1003
    );
    expect(client._sendFn).toHaveBeenCalled();
  });

  it("should continue session when moving between Apex channels", async () => {
    const oldState = makeVoiceState("ch1", "Apex Ranked");
    const newState = makeVoiceState("ch2", "Apex Casual");
    const client = makeClient();

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(registration.getRegistration).not.toHaveBeenCalled();
    expect(sessionStore.startDbSession).not.toHaveBeenCalled();
    expect(sessionStore.endDbSession).not.toHaveBeenCalled();
  });

  it("should not start session when fetchPlayerStats fails on join", async () => {
    const oldState = makeVoiceState(null, null);
    const newState = makeVoiceState("ch1", "Apex Ranked");
    const client = makeClient();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(registration.getRegistration).mockResolvedValue({
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
    });
    vi.mocked(sessionStore.getActiveDbSession).mockResolvedValue(null);
    vi.mocked(apexApi.fetchPlayerStats).mockRejectedValue(new Error("API timeout"));

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(sessionStore.startDbSession).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should not send DM when endDbSession returns null", async () => {
    const oldState = makeVoiceState("ch1", "Apex Ranked");
    const newState = makeVoiceState(null, null);
    const client = makeClient();

    vi.mocked(registration.getRegistration).mockResolvedValue({
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
    });
    vi.mocked(sessionStore.getActiveDbSession).mockResolvedValue({
      id: 1,
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
      startTime: new Date(),
      startKills: 1000,
      startRp: 5000,
      endTime: null,
      endKills: null,
      endRp: null,
      rpChange: null,
      killsGained: null,
      source: "voice",
      channelName: "Apex Ranked",
    });
    vi.mocked(apexApi.fetchPlayerStats).mockResolvedValue({
      name: "TestPlayer",
      platform: "PC",
      level: 500,
      currentRP: 5120,
      rankName: "Gold",
      rankDiv: 4,
      kills: 1003,
    });
    vi.mocked(sessionStore.endDbSession).mockResolvedValue(null);

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(client._sendFn).not.toHaveBeenCalled();
    expect(rpSnapshot.recordSnapshot).not.toHaveBeenCalled();
  });

  it("should log error but not throw when DM fails with non-50007 error", async () => {
    const oldState = makeVoiceState(null, null);
    const newState = makeVoiceState("ch1", "Apex Ranked");
    const client = makeClient();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(registration.getRegistration).mockResolvedValue({
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
    });
    vi.mocked(sessionStore.getActiveDbSession).mockResolvedValue(null);
    vi.mocked(apexApi.fetchPlayerStats).mockResolvedValue({
      name: "TestPlayer",
      platform: "PC",
      level: 500,
      currentRP: 5000,
      rankName: "Gold",
      rankDiv: 4,
      kills: 1000,
    });
    vi.mocked(notificationSettings.getNotificationConfig).mockResolvedValue({
      dmOnJoin: true,
      dmOnLeave: true,
    });
    // Simulate DM failure with non-50007 error
    client._sendFn.mockRejectedValue(Object.assign(new Error("Unknown error"), { code: 50013 }));

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(sessionStore.startDbSession).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should not DM when notifications are disabled", async () => {
    const oldState = makeVoiceState(null, null);
    const newState = makeVoiceState("ch1", "Apex Ranked");
    const client = makeClient();

    vi.mocked(registration.getRegistration).mockResolvedValue({
      discordId: "user1",
      playerName: "TestPlayer",
      platform: "PC",
    });
    vi.mocked(sessionStore.getActiveDbSession).mockResolvedValue(null);
    vi.mocked(apexApi.fetchPlayerStats).mockResolvedValue({
      name: "TestPlayer",
      platform: "PC",
      level: 500,
      currentRP: 5000,
      rankName: "Gold",
      rankDiv: 4,
      kills: 1000,
    });
    vi.mocked(notificationSettings.getNotificationConfig).mockResolvedValue({
      dmOnJoin: false,
      dmOnLeave: false,
    });

    await handleVoiceStateUpdate(oldState, newState, client);

    expect(sessionStore.startDbSession).toHaveBeenCalled();
    expect(client._sendFn).not.toHaveBeenCalled();
  });
});
