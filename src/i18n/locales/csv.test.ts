import { describe, expect, it } from "vitest";
import { parseCsv } from "../csv";
import { createCsvLanguageRows } from "../csvPack";
import { getLanguagePackKeys } from "../resources";
import { CSV_LANGUAGE_SOURCES } from "./index";

const SYNC_HINT =
  "Run `npm run i18n:sync` to rewrite the CSV from the registry, then commit the result.";

describe("shipped language CSVs", () => {
  for (const source of CSV_LANGUAGE_SOURCES) {
    it(`${source.file} matches the registry`, () => {
      const rows = parseCsv(source.csv);
      const header = rows[0] ?? [];
      const expectedHeader = ["key", source.language];
      const body = rows.slice(1);
      const expected = createCsvLanguageRows(
        source.language,
        new Map(body.map((row) => [row[0] ?? "", row[1] ?? ""]))
      ).slice(1);
      const problems: string[] = [];

      if (header.join(",") !== expectedHeader.join(",")) {
        problems.push(
          `header is "${header.join(",")}", expected "${expectedHeader.join(",")}"`
        );
      }

      if (body.length !== expected.length) {
        problems.push(
          `has ${body.length} key row(s), the registry has ${expected.length}`
        );
      }

      const shared = Math.min(body.length, expected.length);
      for (let index = 0; index < shared; index += 1) {
        const actual = body[index];
        const wanted = expected[index];
        const line = index + 2;

        if ((actual[0] ?? "") !== wanted[0]) {
          problems.push(
            `row ${line}: key "${actual[0] ?? ""}" should be "${wanted[0]}"`
          );
        }
      }

      expect(problems, `${source.file} is out of sync. ${SYNC_HINT}`).toEqual(
        []
      );
    });
  }

  it("covers every pack key exactly once", () => {
    for (const source of CSV_LANGUAGE_SOURCES) {
      const keys = parseCsv(source.csv)
        .slice(1)
        .map((row) => row[0] ?? "")
        .filter((key) => key !== "");

      expect(keys).toEqual(getLanguagePackKeys(source.language));
    }
  });
});
