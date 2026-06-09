import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import * as soundPlayer from "../soundPlayer";

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(async () => {}),
}));

jest.mock("@/src/constants/sounds", () => ({
  SOUNDS: {
    pop: 1,
    pup: 2,
  },
}));

type MockSoundPlayer = {
  volume: number;
  playing: boolean;
  seekTo: jest.Mock<Promise<void>, [number]>;
  play: jest.Mock<void, []>;
  pause: jest.Mock<void, []>;
};

const makePlayer = (): MockSoundPlayer => {
  const player: MockSoundPlayer = {
    volume: 1,
    playing: false,
    seekTo: jest.fn(async (_seconds: number) => {}),
    play: jest.fn(() => {
      player.playing = true;
    }),
    pause: jest.fn(() => {
      player.playing = false;
    }),
  };
  return player;
};

const mockedCreateAudioPlayer = jest.mocked(createAudioPlayer);
const mockedSetAudioModeAsync = jest.mocked(setAudioModeAsync);

let player: MockSoundPlayer;

describe("soundPlayer", () => {
  beforeEach(() => {
    player = makePlayer();
    mockedCreateAudioPlayer.mockReset();
    mockedCreateAudioPlayer.mockReturnValue(
      player as unknown as ReturnType<typeof createAudioPlayer>
    );
    mockedSetAudioModeAsync.mockClear();
    soundPlayer.setFeedbackVolume(1);
  });

  it("does not load or play sounds when feedback volume is zero", async () => {
    soundPlayer.setFeedbackVolume(0);
    await soundPlayer.playSoundAsset("debug-pop", 1);

    expect(mockedSetAudioModeAsync).not.toHaveBeenCalled();
    expect(mockedCreateAudioPlayer).not.toHaveBeenCalled();
  });

  it("pauses an already playing sound when feedback volume is set to zero", async () => {
    await soundPlayer.playSoundAsset("debug-pop", 1);
    expect(player.play).toHaveBeenCalledTimes(1);

    soundPlayer.setFeedbackVolume(0);

    expect(player.volume).toBe(0);
    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.playing).toBe(false);
  });
});
