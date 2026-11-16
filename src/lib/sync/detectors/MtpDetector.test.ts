import { describe, expect, it } from "vitest";
import { MtpDetector } from "./MtpDetector";

/**
 * The detector contract returns `undefined` for "not mine", so a scan can try
 * the next detector. Throwing aborted the whole scan instead, which is how
 * adding a rootless device (a Zune) failed before its own detector ran.
 */
describe("MtpDetector", () => {
  it("returns undefined when no storage root was picked", async () => {
    await expect(new MtpDetector().detect(undefined)).resolves.toBeUndefined();
  });

  it("returns undefined for a folder that is not a player", async () => {
    const root = {
      name: "Documents",
      entries: async function* () {
        yield ["notes.txt"];
      },
    } as unknown as FileSystemDirectoryHandle;

    await expect(new MtpDetector().detect(root)).resolves.toBeUndefined();
  });
});
