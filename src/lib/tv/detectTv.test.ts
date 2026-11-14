import { afterEach, describe, expect, it, vi } from "vitest";
import { isTvOverride, isTvUserAgent } from "./detectTv";

const FIRE_TV =
  "Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7326.3160N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Silk/120.0.0.0 like Chrome/120.0.0.0";
const FIRE_TV_SILK =
  "Mozilla/5.0 (Linux; Android 7.1.2; AFTKM Build/NS6272) AppleWebKit/537.36 (KHTML, like Gecko) Silk/98.4.2 like Chrome/98.0.4758.101 Safari/537.36";
const WEBOS =
  "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36 WebAppManager";
const TIZEN =
  "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146/6.0 TV Safari/537.36";
const ANDROID_TV =
  "Mozilla/5.0 (Linux; Android 11; Chromecast) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.225 Safari/537.36 CrKey/1.56.500000";
const ROKU =
  "Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.106 Safari/537.36 Roku/DVP-10.0";
const APPLETV =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) AppleTV/14.0";
const DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("isTvUserAgent", () => {
  it.each([
    ["Fire TV (AFT model)", FIRE_TV],
    ["Fire TV Silk", FIRE_TV_SILK],
    ["webOS", WEBOS],
    ["Tizen", TIZEN],
    ["Chromecast / Android TV", ANDROID_TV],
    ["Roku", ROKU],
    ["Apple TV", APPLETV],
  ])("detects %s", (_label, ua) => {
    expect(isTvUserAgent(ua)).toBe(true);
  });

  it.each([
    ["desktop Chrome", DESKTOP],
    ["iPad", IPAD],
    ["empty", ""],
  ])("leaves %s alone", (_label, ua) => {
    expect(isTvUserAgent(ua)).toBe(false);
  });
});

function stubWindow(options: {
  search?: string;
  stored?: string | null;
  finePointer?: boolean;
}): void {
  vi.stubGlobal("window", {
    location: { search: options.search ?? "" },
    localStorage: { getItem: () => options.stored ?? null },
    matchMedia: (query: string) => ({
      matches: query === "(pointer: fine)" ? !!options.finePointer : false,
    }),
  });
  vi.stubGlobal("navigator", { userAgent: DESKTOP });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isTvOverride", () => {
  it("honours ?tv=1 for the current load", () => {
    stubWindow({ search: "?tv=1" });
    expect(isTvOverride()).toBe(true);
  });

  it("honours a stored flag on a device without a fine pointer", () => {
    stubWindow({ stored: "1", finePointer: false });
    expect(isTvOverride()).toBe(true);
  });

  it("ignores a stored flag on a computer with a mouse", () => {
    stubWindow({ stored: "1", finePointer: true });
    expect(isTvOverride()).toBe(false);
  });

  it("honours a stored flag on a TV user agent even with a fine pointer", () => {
    stubWindow({ stored: "1", finePointer: true });
    vi.stubGlobal("navigator", { userAgent: FIRE_TV_SILK });
    expect(isTvOverride()).toBe(true);
  });

  it("is false with nothing stored", () => {
    stubWindow({ stored: null, finePointer: false });
    expect(isTvOverride()).toBe(false);
  });
});
