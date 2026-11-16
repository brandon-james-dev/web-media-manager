import { describe, expect, it } from "vitest";
import { enUS } from "./en-US";
import { LANGUAGE_PACKS } from "./instance";
import type { LanguageResources } from "./resources";
import type { LanguagePack, WmmLanguage } from "./types";
import {
  assertValidResources,
  formatResourceIssues,
  reportResourceIssues,
  validateLanguagePack,
  validateLanguagePacks,
  validateResourceRegistry,
  type ResourceIssue,
} from "./validation";

/** The Spanish pack as the build ships it: loaded from the bundled CSV. */
const esMX = LANGUAGE_PACKS.find((entry) => entry.language === "es-MX")!;

function without(key: string): LanguageResources {
  const copy: Record<string, string> = { ...enUS.resources };
  delete copy[key];
  return copy as unknown as LanguageResources;
}

function withText(key: string, value: string): LanguageResources {
  return {
    ...enUS.resources,
    [key]: value,
  } as unknown as LanguageResources;
}

function pack(
  language: WmmLanguage,
  resources: LanguageResources
): LanguagePack {
  return { language, nativeName: language, resources };
}

function codes(issues: readonly ResourceIssue[]): string[] {
  return issues.map((issue) => issue.code);
}

describe("validateResourceRegistry", () => {
  it("accepts the shipped registry", () => {
    expect(validateResourceRegistry()).toEqual([]);
  });

  it("rejects keys that break the namespace and casing rules", () => {
    const issues = validateResourceRegistry([
      "Playback.Next",
      "foo.bar",
      "playback",
    ]);

    expect(codes(issues)).toEqual([
      "invalid-key",
      "invalid-key",
      "invalid-key",
    ]);
    expect(issues[0].message).toContain("playback");
    expect(issues[0].message).toContain("lowerCamelCase");
  });

  it("reports an exact duplicate", () => {
    const issues = validateResourceRegistry(["playback.next", "playback.next"]);
    expect(codes(issues)).toContain("duplicate-key");
  });

  it("reports keys that differ only by case", () => {
    const issues = validateResourceRegistry(["playback.next", "playback.Next"]);
    expect(codes(issues)).toContain("key-collision");
  });

  it("reports a key that is a dot-prefix of another", () => {
    const issues = validateResourceRegistry([
      "playback.next",
      "playback.next.track",
    ]);
    expect(codes(issues)).toContain("key-collision");
  });

  it("reports a key that is also a plural form of another plural", () => {
    const issues = validateResourceRegistry(["library.songCountOne"]);
    expect(codes(issues)).toEqual(["key-collision"]);
    expect(issues[0].message).toContain("library.songCount");
  });
});

describe("validateLanguagePack", () => {
  it("accepts both shipped packs", () => {
    expect(validateLanguagePacks([enUS, esMX])).toEqual([]);
  });

  it("reports a key seen twice in the entry list", () => {
    const issues = validateLanguagePack("en-US", [
      ["playback.next", "Next"],
      ["playback.next", "Next track"],
    ]);
    expect(codes(issues)).toContain("duplicate-key");
  });

  it("reports a registered key with no entry", () => {
    const issues = validateLanguagePack(
      "en-US",
      Object.entries(without("playback.next"))
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "missing-key",
      severity: "error",
      key: "playback.next",
      language: "en-US",
    });
    expect(issues[0].message).toContain("src/i18n/en-US.ts");
  });

  it("reports an empty translation", () => {
    const issues = validateLanguagePack(
      "en-US",
      Object.entries(withText("playback.next", "   "))
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "missing-translation",
      key: "playback.next",
    });
  });

  it("reports a key that is not registered", () => {
    const issues = validateLanguagePack("en-US", [["bogus.key", "Bogus"]]);
    expect(codes(issues)).toContain("unexpected-key");
    expect(issues[0].message).toContain("src/i18n/resources.ts");
  });

  it("reports a placeholder beyond the declared arity", () => {
    const issues = validateLanguagePack(
      "en-US",
      Object.entries(withText("playback.nowPlayingFormat", "{0} {1} {2}"))
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "invalid-placeholder",
      severity: "error",
      key: "playback.nowPlayingFormat",
    });
  });

  it("reports a placeholder in a text resource", () => {
    const issues = validateLanguagePack(
      "en-US",
      Object.entries(withText("playback.next", "Next {0}"))
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "invalid-placeholder",
      key: "playback.next",
    });
  });

  it("warns about a template param the translation never uses", () => {
    const issues = validateLanguagePack(
      "en-US",
      Object.entries(withText("playback.nowPlayingFormat", "{0}"))
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "unused-placeholder",
      severity: "warning",
      key: "playback.nowPlayingFormat",
    });
  });

  it("reports a plural form with no text", () => {
    const issues = validateLanguagePack(
      "en-US",
      Object.entries(without("library.songCountOther"))
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "missing-key",
      severity: "error",
      key: "library.songCountOther",
      language: "en-US",
    });
    expect(issues[0].message).toContain("library.songCount");
  });

  it("warns about a plural form the language never uses", () => {
    const issues = validateLanguagePack("en-US", [
      ...Object.entries(enUS.resources),
      ["library.songCountFew", "{0} few songs"],
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "unused-plural-form",
      severity: "warning",
      key: "library.songCountFew",
      language: "en-US",
    });
  });

  it("reports a placeholder beyond the plural arity in a form", () => {
    const issues = validateLanguagePack(
      "en-US",
      Object.entries(withText("library.songCountOther", "{0} songs {1}"))
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "invalid-placeholder",
      severity: "error",
      key: "library.songCountOther",
    });
  });
});

describe("validateLanguagePacks", () => {
  it("reports two packs claiming the same language", () => {
    const issues = validateLanguagePacks([enUS, enUS]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "duplicate-key",
      key: "en-US",
      language: "en-US",
    });
  });

  it("includes registry issues alongside pack issues", () => {
    const issues = validateLanguagePacks([pack("en-US", without("sync.title"))]);
    expect(codes(issues)).toEqual(["missing-key"]);
  });
});

describe("formatResourceIssues", () => {
  it("groups lines by language and names the code and key", () => {
    const issues = validateLanguagePacks([
      pack("en-US", without("playback.next")),
    ]);
    const report = formatResourceIssues(issues);

    expect(report).toContain('[i18n] en-US missing-key "playback.next":');
    expect(report.split("\n")).toHaveLength(1);
  });

  it("labels registry issues as registry", () => {
    const report = formatResourceIssues(validateResourceRegistry(["foo.bar"]));
    expect(report).toContain('[i18n] registry invalid-key "foo.bar":');
  });
});

describe("reportResourceIssues", () => {
  it("stays silent when there is nothing to report", () => {
    const calls: string[] = [];
    reportResourceIssues([], {
      error: () => calls.push("error"),
      warn: () => calls.push("warn"),
    });
    expect(calls).toEqual([]);
  });

  it("logs one grouped error message with a count", () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    reportResourceIssues(validateResourceRegistry(["foo.bar"]), {
      error: (message) => errors.push(String(message)),
      warn: (message) => warnings.push(String(message)),
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("1 resource error(s)");
    expect(errors[0]).toContain("invalid-key");
    expect(warnings).toEqual([]);
  });

  it("logs warnings when nothing failed", () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    reportResourceIssues(
      [
        {
          code: "unused-placeholder",
          severity: "warning",
          key: "playback.nowPlayingFormat",
          language: "en-US",
          message: "never uses {1}",
        },
      ],
      {
        error: (message) => errors.push(String(message)),
        warn: (message) => warnings.push(String(message)),
      }
    );

    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("1 resource warning(s)");
  });
});

describe("assertValidResources", () => {
  it("passes for the shipped packs", () => {
    expect(() => assertValidResources([enUS, esMX])).not.toThrow();
  });

  it("throws a readable report for a broken pack", () => {
    expect(() =>
      assertValidResources([pack("es-MX", without("playback.next"))])
    ).toThrow(/missing-key "playback\.next"/);
  });
});
