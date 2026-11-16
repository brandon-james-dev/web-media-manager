import { describe, expect, it, vi } from "vitest";
import { serializeCsv } from "./csv";
import {
  createCsvLanguageRows,
  createCsvLanguageSources,
  loadCsvLanguagePack,
} from "./csvPack";
import { enUS } from "./en-US";
import { I18nService } from "./I18nService";
import { getLanguagePackKeys } from "./resources";
import type { CsvLanguageSource } from "./csvPack";
import type { ResourceIssue } from "./validation";

const FILE = "src/i18n/locales/es-MX.csv";

function source(csv: string): CsvLanguageSource {
  return {
    language: "es-MX",
    nativeName: "Español de México",
    csv,
    file: FILE,
  };
}

/** A CSV with the standard header and the given body rows. */
function csv(rows: readonly (readonly string[])[]): string {
  return serializeCsv([["key", "es-MX"], ...rows]);
}

function issuesFor(issues: readonly ResourceIssue[], key: string) {
  return issues.filter((entry) => entry.key === key);
}

describe("loadCsvLanguagePack", () => {
  const english = enUS.resources as Readonly<Record<string, string | undefined>>;

  function englishFor(key: string): string {
    return (
      english[key] ??
      english[`${key.replace(/(Zero|One|Two|Few|Many|Other)$/, "")}Other`] ??
      ""
    );
  }

  it("loads every translated row into a full pack", () => {
    const packKeys = getLanguagePackKeys("es-MX");
    const translations = new Map(
      packKeys.map((key) => [key, `ES ${englishFor(key)}`] as const)
    );
    const { pack, issues } = loadCsvLanguagePack(
      source(serializeCsv(createCsvLanguageRows("es-MX", translations)))
    );

    expect(issues).toEqual([]);
    expect(pack.language).toBe("es-MX");
    expect(pack.nativeName).toBe("Español de México");
    expect(Object.keys(pack.resources)).toHaveLength(packKeys.length);
    expect(pack.resources["playback.next"]).toBe("ES Next");
  });

  it("leaves an empty translation out and reports it once", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(
        csv([
          ["playback.next", "Siguiente"],
          ["common.close", ""],
        ])
      )
    );

    expect(pack.resources["playback.next"]).toBe("Siguiente");
    expect(pack.resources["common.close"]).toBeUndefined();
    expect(issuesFor(issues, "common.close")).toHaveLength(1);
    expect(issuesFor(issues, "common.close")[0]).toMatchObject({
      code: "missing-key",
      severity: "error",
      language: "es-MX",
    });
    expect(issuesFor(issues, "common.close")[0].message).toContain(FILE);
  });

  it("falls back to the English text for an untranslated key", () => {
    const onMissing = vi.fn();
    const { pack } = loadCsvLanguagePack(
      source(csv([["common.close", ""]]))
    );
    const service = new I18nService({
      packs: [enUS, pack],
      defaultLanguage: "en-US",
      detect: () => ["es-MX"],
      onMissing,
    });

    expect(service.get("common.close")).toBe("Close");
    expect(service.get("common.close")).toBe("Close");
    expect(onMissing).toHaveBeenCalledTimes(1);
    expect(onMissing).toHaveBeenCalledWith("common.close", "es-MX");
  });

  it("drops a row whose key is not registered and reports it", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(csv([["bogus.key", "Falso"]]))
    );

    expect(pack.resources).not.toHaveProperty("bogus.key");
    expect(issuesFor(issues, "bogus.key")[0]).toMatchObject({
      code: "unexpected-key",
      severity: "error",
    });
  });

  it("drops both rows of a duplicated key and reports the duplicate", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(
        csv([
          ["playback.next", "Siguiente"],
          ["playback.next", "Siguiente otra vez"],
        ])
      )
    );

    expect(pack.resources["playback.next"]).toBeUndefined();
    expect(issuesFor(issues, "playback.next")[0]).toMatchObject({
      code: "duplicate-key",
      severity: "error",
    });
  });

  it("drops a row whose placeholder is beyond the template arity", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(
        csv([["playback.nowPlayingFormat", "{0} - {1} - {3}"]])
      )
    );

    expect(pack.resources["playback.nowPlayingFormat"]).toBeUndefined();
    expect(issuesFor(issues, "playback.nowPlayingFormat")[0]).toMatchObject({
      code: "invalid-placeholder",
      severity: "error",
    });
  });

  it("returns an empty pack and an invalid-csv error without the language column", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(serializeCsv([["key"], ["playback.next"]]))
    );

    expect(pack.resources).toEqual({});
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "invalid-csv",
      severity: "error",
      key: FILE,
      language: "es-MX",
    });
    expect(issues[0].message).toContain("key,es-MX");
  });

  it("returns an empty pack and an invalid-csv error without the key column", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(serializeCsv([["es-MX"], ["Siguiente"]]))
    );

    expect(pack.resources).toEqual({});
    expect(issues[0].code).toBe("invalid-csv");
  });

  it("returns an empty pack and an invalid-csv error for a file name that is not a canonical tag", () => {
    const { pack, issues } = loadCsvLanguagePack({
      language: "es-mx",
      nativeName: "Español de México",
      csv: serializeCsv([
        ["key", "es-mx"],
        ["playback.next", "Siguiente"],
      ]),
      file: "src/i18n/locales/es-mx.csv",
    });

    expect(pack.resources).toEqual({});
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "invalid-csv",
      severity: "error",
      key: "src/i18n/locales/es-mx.csv",
      language: "es-mx",
    });
    expect(issues[0].message).toContain("rename the file");
  });

  it("reads the columns by name, whatever their order", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(
        serializeCsv([
          ["es-MX", "key"],
          ["Siguiente", "playback.next"],
        ])
      )
    );

    expect(pack.resources["playback.next"]).toBe("Siguiente");
    expect(issuesFor(issues, "playback.next")).toEqual([]);
  });

  it("keeps a plural form row in the pack", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(
        csv([
          ["library.songCountOne", "{0} canción"],
          ["library.songCountOther", "{0} canciones"],
        ])
      )
    );

    expect(pack.resources["library.songCountOne"]).toBe("{0} canción");
    expect(pack.resources["library.songCountOther"]).toBe("{0} canciones");
    expect(issuesFor(issues, "library.songCountOne")).toEqual([]);
    expect(issuesFor(issues, "library.songCountOther")).toEqual([]);
  });

  it("skips blank spreadsheet rows and pads a ragged row", () => {
    const { pack, issues } = loadCsvLanguagePack(
      source(
        serializeCsv([
          ["key", "es-MX"],
          ["", ""],
          ["playback.next", "Siguiente"],
          ["common.close"],
        ])
      )
    );

    expect(pack.resources["playback.next"]).toBe("Siguiente");
    expect(pack.resources["common.close"]).toBeUndefined();
    expect(issuesFor(issues, "common.close")[0].code).toBe("missing-key");
  });
});

describe("createCsvLanguageRows", () => {
  it("writes the header and one row per pack key in registry order", () => {
    const rows = createCsvLanguageRows("es-MX");
    const packKeys = getLanguagePackKeys("es-MX");

    expect(rows[0]).toEqual(["key", "es-MX"]);
    expect(rows).toHaveLength(packKeys.length + 1);
    expect(rows.slice(1).map((row) => row[0])).toEqual(packKeys);
  });

  it("writes a row per plural form the language uses", () => {
    const rows = createCsvLanguageRows("ru", new Map());
    const keys = rows.slice(1).map((row) => row[0]);

    expect(keys).toContain("library.songCountOne");
    expect(keys).toContain("library.songCountFew");
    expect(keys).toContain("library.songCountMany");
    expect(keys).toContain("library.songCountOther");
    expect(keys).not.toContain("library.songCountTwo");
  });

  it("keeps an existing translation and leaves a new key empty", () => {
    const rows = createCsvLanguageRows(
      "es-MX",
      new Map([["playback.next", "Siguiente"]])
    );

    expect(rows.find((entry) => entry[0] === "playback.next")?.[1]).toBe(
      "Siguiente"
    );
    expect(rows.find((entry) => entry[0] === "common.close")?.[1]).toBe("");
  });
});

describe("createCsvLanguageSources", () => {
  it("infers the language, the file and the native name from the file name", () => {
    const [entry] = createCsvLanguageSources({ "./es-MX.csv": "key,es-MX\n" });

    expect(entry.language).toBe("es-MX");
    expect(entry.file).toBe("src/i18n/locales/es-MX.csv");
    expect(entry.nativeName).toBe("Español de México");
    expect(entry.csv).toBe("key,es-MX\n");
  });

  it("falls back to the tag when it is not a language", () => {
    const [entry] = createCsvLanguageSources({ "./not a tag.csv": "" });

    expect(entry.nativeName).toBe("not a tag");
  });

  it("sorts the sources by language", () => {
    const sources = createCsvLanguageSources({
      "./es-MX.csv": "",
      "./en-GB.csv": "",
    });

    expect(sources.map((entry) => entry.language)).toEqual(["en-GB", "es-MX"]);
  });
});
