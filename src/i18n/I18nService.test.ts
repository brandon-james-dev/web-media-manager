import { describe, expect, it, vi } from "vitest";
import { I18nService } from "./I18nService";
import { enUS } from "./en-US";
import { LANGUAGE_PACKS } from "./instance";
import type { LanguageResources } from "./resources";
import type {
  LanguagePack,
  LanguagePreference,
  LanguagePreferenceStore,
  WmmLanguage,
} from "./types";

/** The Spanish pack as the build ships it: loaded from the bundled CSV. */
const esMX = LANGUAGE_PACKS.find((entry) => entry.language === "es-MX")!;

function memoryStore(initial: string | null = null) {
  let value = initial;
  const saved: LanguagePreference[] = [];
  const store: LanguagePreferenceStore = {
    load: () => value,
    save: (language) => {
      value = language;
      saved.push(language);
    },
  };
  return { store, saved, read: () => value };
}

function service(options: {
  store?: LanguagePreferenceStore;
  detect?: () => readonly string[];
  onMissing?: (key: string, language: WmmLanguage) => void;
  packs?: readonly LanguagePack[];
  defaultLanguage?: WmmLanguage;
}) {
  return new I18nService({
    packs: options.packs ?? [enUS, esMX],
    defaultLanguage: options.defaultLanguage ?? "en-US",
    store: options.store,
    detect: options.detect ?? (() => []),
    onMissing: options.onMissing,
  });
}

/** A pack whose entry for `key` is absent, as a parsed document could be. */
function packMissing(key: keyof LanguageResources): LanguagePack {
  return {
    language: "es-MX",
    nativeName: "Español de México",
    resources: {
      ...esMX.resources,
      [key]: undefined,
    } as unknown as LanguageResources,
  };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("I18nService initial language", () => {
  it("prefers a stored language over detection", () => {
    const { store } = memoryStore("es-MX");
    expect(
      service({ store, detect: () => ["en-US"] }).getCurrentLanguage()
    ).toBe("es-MX");
  });

  it("ignores a stored value that is not an available language", () => {
    const { store } = memoryStore("fr-FR");
    expect(
      service({ store, detect: () => ["es-MX"] }).getCurrentLanguage()
    ).toBe("es-MX");
  });

  it("falls back to auto when the stored language no longer ships", () => {
    const { store } = memoryStore("es-ES");
    const instance = service({ store, detect: () => ["es-MX"] });

    expect(instance.getLanguagePreference()).toBe("auto");
    expect(instance.getCurrentLanguage()).toBe("es-MX");
  });

  it("matches a detected tag exactly, ignoring case", () => {
    expect(service({ detect: () => ["es-mx"] }).getCurrentLanguage()).toBe(
      "es-MX"
    );
  });

  it("falls back to the base language of a detected tag", () => {
    expect(service({ detect: () => ["es-AR"] }).getCurrentLanguage()).toBe(
      "es-MX"
    );
    expect(service({ detect: () => ["es"] }).getCurrentLanguage()).toBe("es-MX");
  });

  it("uses the first detected tag it can serve", () => {
    expect(
      service({ detect: () => ["fr-FR", "es-MX", "en-US"] }).getCurrentLanguage()
    ).toBe("es-MX");
  });

  it("falls back to the default language", () => {
    expect(service({ detect: () => ["fr-FR"] }).getCurrentLanguage()).toBe(
      "en-US"
    );
  });
});

describe("I18nService changeLanguage", () => {
  it("persists, notifies and reports the new language", () => {
    const { store, saved } = memoryStore();
    const instance = service({ store });
    const listener = vi.fn();
    instance.subscribe(listener);

    instance.changeLanguage("es-MX");

    expect(instance.getCurrentLanguage()).toBe("es-MX");
    expect(saved).toEqual(["es-MX"]);
    expect(listener).toHaveBeenCalledWith("es-MX");
  });

  it("does nothing when the preference is unchanged", () => {
    const { store, saved } = memoryStore("en-US");
    const instance = service({ store });
    const listener = vi.fn();
    instance.subscribe(listener);

    instance.changeLanguage("en-US");

    expect(saved).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("pins a language that matches the detected one", () => {
    const { store, saved } = memoryStore();
    const instance = service({ store, detect: () => ["en-US"] });

    instance.changeLanguage("en-US");

    expect(instance.getLanguagePreference()).toBe("en-US");
    expect(saved).toEqual(["en-US"]);
  });

  it("throws for a language no pack provides", () => {
    const instance = service({});
    expect(() => instance.changeLanguage("fr-FR" as WmmLanguage)).toThrow(
      /Unknown language "fr-FR"/
    );
  });

  it("stops notifying after unsubscribe", () => {
    const instance = service({});
    const listener = vi.fn();
    const unsubscribe = instance.subscribe(listener);

    unsubscribe();
    instance.changeLanguage("es-MX");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("I18nService lookup", () => {
  it("returns the active pack's text", () => {
    const instance = service({});
    expect(instance.get("playback.next")).toBe("Next");
    instance.changeLanguage("es-MX");
    expect(instance.get("playback.next")).toBe("Siguiente");
  });

  it("falls back to the default pack and reports the gap once", () => {
    const onMissing = vi.fn();
    const { store } = memoryStore("es-MX");
    const instance = service({
      store,
      packs: [enUS, packMissing("playback.next")],
      onMissing,
    });

    expect(instance.get("playback.next")).toBe("Next");
    expect(instance.get("playback.next")).toBe("Next");
    expect(onMissing).toHaveBeenCalledTimes(1);
    expect(onMissing).toHaveBeenCalledWith("playback.next", "es-MX");
  });

  it("falls back to the key when no pack has it", () => {
    const instance = service({
      packs: [packMissing("playback.next")],
      defaultLanguage: "es-MX",
      onMissing: () => {},
    });
    expect(instance.get("playback.next")).toBe("playback.next");
  });

  it("formats a template with its argument tuple", () => {
    const instance = service({});
    expect(
      instance.format("playback.nowPlayingFormat", ["Artist", "Title"])
    ).toBe("Artist - Title");
    expect(instance.t("playback.nowPlayingFormat", ["Artist", "Title"])).toBe(
      "Artist - Title"
    );
  });

  it("keeps escaped braces literal in a translation", () => {
    const instance = service({
      packs: [
        {
          language: "en-US",
          nativeName: "English (US)",
          resources: {
            ...enUS.resources,
            "playback.next": "Next {{0}}",
          } as unknown as LanguageResources,
        },
      ],
    });
    expect(instance.t("playback.next")).toBe("Next {0}");
  });

  it("resolves known names and rejects unknown ones", () => {
    const instance = service({});
    expect(instance.resolve("library.artists")).toBe("Artists");
    expect(
      instance.resolve("playback.nowPlayingFormat", ["Artist", "Title"])
    ).toBe("Artist - Title");
    expect(instance.resolve("bogus.key")).toBeUndefined();
    expect(instance.resolve("wmm.playback.next")).toBeUndefined();
  });

  it("lists the available languages with their native names", () => {
    expect(service({}).getAvailableLanguages()).toEqual([
      { language: "en-US", nativeName: "English (US)" },
      { language: "es-MX", nativeName: "Español de México" },
    ]);
  });

  it("ships the default pack and the Spanish CSV pack", () => {
    expect(LANGUAGE_PACKS.map((pack) => pack.language)).toEqual([
      "en-US",
      "es-MX",
    ]);
    expect(
      LANGUAGE_PACKS.find((pack) => pack.language === "es-MX")?.nativeName
    ).toMatch(/^Español/);
  });
});

describe("I18nService plurals", () => {
  /** A pack with the four categories Russian uses for one plural. */
  const ru: LanguagePack = {
    language: "ru",
    nativeName: "Русский",
    resources: {
      "library.songCountOne": "{0} песня",
      "library.songCountFew": "{0} песни",
      "library.songCountMany": "{0} песен",
      "library.songCountOther": "{0} песни",
    },
  };

  it("selects the English one and other forms, with zero as other", () => {
    const instance = service({});

    expect(instance.t("library.songCount", [1])).toBe("1 song");
    expect(instance.t("library.songCount", [2])).toBe("2 songs");
    expect(instance.t("library.songCount", [0])).toBe("0 songs");
  });

  it("selects the Spanish one, many and other forms", () => {
    const instance = service({ detect: () => ["es-MX"] });

    expect(instance.t("library.songCount", [1])).toBe("1 canción");
    expect(instance.t("library.songCount", [1000])).toBe("1000 canciones");
    expect(instance.t("library.songCount", [2])).toBe("2 canciones");
  });

  it("selects the Russian category for the count", () => {
    const instance = service({
      packs: [enUS, ru],
      detect: () => ["ru"],
    });

    expect(instance.t("library.songCount", [1])).toBe("1 песня");
    expect(instance.t("library.songCount", [3])).toBe("3 песни");
    expect(instance.t("library.songCount", [5])).toBe("5 песен");
    expect(instance.t("library.songCount", [21])).toBe("21 песня");
  });

  it("falls back to the active Other form, then to the default pack", () => {
    const onMissing = vi.fn();
    const partial: LanguagePack = {
      language: "ru",
      nativeName: "Русский",
      resources: { "library.songCountOther": "{0} песен" },
    };
    const instance = service({
      packs: [enUS, partial],
      detect: () => ["ru"],
      onMissing,
    });

    expect(instance.t("library.songCount", [3])).toBe("3 песен");
    expect(onMissing).toHaveBeenCalledWith("library.songCountFew", "ru");

    const empty: LanguagePack = {
      language: "ru",
      nativeName: "Русский",
      resources: {},
    };
    const fallback = service({
      packs: [enUS, empty],
      detect: () => ["ru"],
      onMissing: () => {},
    });

    expect(fallback.t("library.songCount", [3])).toBe("3 songs");
  });

  it("fills the remaining placeholders after the count", () => {
    const instance = service({});
    expect(instance.t("sync.trackCount", [3, "1.2 MB"])).toBe(
      "3 tracks, 1.2 MB"
    );
  });

  it("returns the Other form from get", () => {
    const instance = service({});
    expect(instance.get("library.songCount")).toBe("{0} songs");
  });
});

describe("I18nService with an asynchronous store", () => {
  it("starts from detection and adopts the stored value when it resolves", async () => {
    let resolveLoad: (value: string | null) => void = () => {};
    const store: LanguagePreferenceStore = {
      load: () =>
        new Promise<string | null>((resolve) => {
          resolveLoad = resolve;
        }),
      save: () => {},
    };
    const instance = service({ store, detect: () => ["en-US"] });

    expect(instance.getCurrentLanguage()).toBe("en-US");

    resolveLoad("es-MX");
    await flush();

    expect(instance.getCurrentLanguage()).toBe("es-MX");
  });

  it("does not override an explicit change made before it resolves", async () => {
    let resolveLoad: (value: string | null) => void = () => {};
    const saved: LanguagePreference[] = [];
    const store: LanguagePreferenceStore = {
      load: () =>
        new Promise<string | null>((resolve) => {
          resolveLoad = resolve;
        }),
      save: (language) => {
        saved.push(language);
      },
    };
    const instance = service({ store, detect: () => ["es-MX"] });

    expect(instance.getCurrentLanguage()).toBe("es-MX");
    instance.changeLanguage("en-US");

    resolveLoad("es-MX");
    await flush();

    expect(instance.getCurrentLanguage()).toBe("en-US");
    expect(saved).toEqual(["en-US"]);
  });
});

describe("I18nService automatic language", () => {
  it("defaults to auto and resolves to the detected language", () => {
    const instance = service({ detect: () => ["es-AR"] });
    expect(instance.getLanguagePreference()).toBe("auto");
    expect(instance.getCurrentLanguage()).toBe("es-MX");
    expect(instance.getDetectedLanguage()).toBe("es-MX");
  });

  it("treats a stored auto as auto", () => {
    const { store } = memoryStore("auto");
    const instance = service({ store, detect: () => ["es-MX"] });
    expect(instance.getLanguagePreference()).toBe("auto");
    expect(instance.getCurrentLanguage()).toBe("es-MX");
  });

  it("returns from a pinned language to the detected one", () => {
    const { store, saved } = memoryStore("en-US");
    const instance = service({ store, detect: () => ["es-MX"] });
    const listener = vi.fn();
    instance.subscribe(listener);

    expect(instance.getCurrentLanguage()).toBe("en-US");
    instance.changeLanguage("auto");

    expect(instance.getLanguagePreference()).toBe("auto");
    expect(instance.getCurrentLanguage()).toBe("es-MX");
    expect(saved).toEqual(["auto"]);
    expect(listener).toHaveBeenCalledWith("es-MX");
  });

  it("notifies when only the preference changes", () => {
    const instance = service({ detect: () => ["en-US"] });
    const listener = vi.fn();
    instance.subscribe(listener);

    instance.changeLanguage("en-US");

    expect(instance.getCurrentLanguage()).toBe("en-US");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
