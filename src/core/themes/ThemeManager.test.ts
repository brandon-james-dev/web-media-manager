import { strToU8, zipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  InstalledTheme,
  PackageFileRecord,
  ThemeStore,
} from "@/core/ports";
import { classicBlueDesktop } from "@/lib/themes/testing/classicBlueDesktop";
import { classicBlueTheme } from "@/lib/themes/testing/classicBlueTheme";
import { ThemeInstallChange, ThemeManager, isSafeMode } from "./ThemeManager";

const manifest = {
  kind: "theme",
  spec: "1.0",
  id: "classic-blue",
  name: "Classic Blue",
  version: "1.2.0",
  formFactors: ["desktop"],
  colorSchemes: ["dark"],
};

function zip(overrides: Record<string, unknown> = {}): Uint8Array {
  return zipSync({
    "manifest.json": strToU8(JSON.stringify({ ...manifest, ...overrides })),
    "theme.xml": strToU8(classicBlueTheme),
    "layouts/desktop.xml": strToU8(classicBlueDesktop),
  });
}

function memoryStore() {
  const themes = new Map<string, InstalledTheme>();
  const state = {
    files: [] as PackageFileRecord[],
    active: undefined as string | undefined,
  };
  const without = (ownerId: string) =>
    state.files.filter((file) => file.ownerId !== ownerId);
  const store: ThemeStore = {
    files: {
      listFiles: async (ownerId) =>
        state.files.filter((file) => file.ownerId === ownerId),
      getFile: async (ownerId, path) =>
        state.files.find(
          (file) => file.ownerId === ownerId && file.path === path
        ),
      putFiles: async (records) => {
        state.files.push(...records);
      },
      deleteFiles: async (ownerId) => {
        state.files = without(ownerId);
      },
    },
    listThemes: async () => [...themes.values()],
    getTheme: async (id) => themes.get(id),
    putTheme: async (theme, files) => {
      state.files = without(theme.id);
      state.files.push(
        ...files.map((file) => ({
          ownerId: theme.id,
          path: file.path,
          bytes: file.bytes,
          size: file.bytes.byteLength,
          mimeType: "",
        }))
      );
      themes.set(theme.id, theme);
    },
    deleteTheme: async (id) => {
      themes.delete(id);
      state.files = without(id);
      if (state.active === id) state.active = undefined;
    },
    getActiveThemeId: async () => state.active,
    setActiveThemeId: async (id) => {
      state.active = id;
    },
  };
  return { store, themes, state };
}

describe("isSafeMode", () => {
  it("matches only theme=default", () => {
    expect(isSafeMode("?theme=default")).toBe(true);
    expect(isSafeMode("?tv=1&theme=default")).toBe(true);
    expect(isSafeMode("?theme=classic-blue")).toBe(false);
    expect(isSafeMode("")).toBe(false);
  });
});

describe("ThemeManager", () => {
  let memory: ReturnType<typeof memoryStore>;
  let manager: ThemeManager;

  beforeEach(() => {
    memory = memoryStore();
    manager = new ThemeManager({ store: memory.store, now: () => 42 });
  });

  it("refuses a package with errors and stores nothing", async () => {
    const result = await manager.installTheme(zip({ spec: "2.0" }));
    expect(result.theme).toBeUndefined();
    expect(result.issues.map((issue) => issue.code)).toEqual(["E2011"]);
    expect(memory.themes.size).toBe(0);
    expect(memory.state.files).toEqual([]);
  });

  it("installs a valid package with its files", async () => {
    const result = await manager.installTheme(zip());
    expect(result.theme).toMatchObject({
      id: "classic-blue",
      version: "1.2.0",
      installedAt: 42,
    });
    expect(result.theme?.ir.layouts.desktop?.element).toBe("Layout");
    expect(memory.state.files.map((file) => file.path).sort()).toEqual([
      "layouts/desktop.xml",
      "manifest.json",
      "theme.xml",
    ]);
    expect(await manager.listThemes()).toHaveLength(1);
  });

  it("replaces the files of a reinstalled theme", async () => {
    await manager.installTheme(zip());
    await manager.installTheme(zip({ version: "1.3.0" }));
    expect(memory.themes.get("classic-blue")?.version).toBe("1.3.0");
    expect(memory.state.files).toHaveLength(3);
  });

  it("applies, resets and honors safe mode", async () => {
    await manager.installTheme(zip());
    await manager.applyTheme("classic-blue");
    expect((await manager.getActiveTheme())?.id).toBe("classic-blue");
    expect(await manager.getActiveTheme("?theme=default")).toBeUndefined();
    await manager.resetToDefault();
    expect(await manager.getActiveTheme()).toBeUndefined();
  });

  it("refuses to apply a theme that is not installed", async () => {
    await expect(manager.applyTheme("nope")).rejects.toThrow(
      'Theme "nope" is not installed.'
    );
  });

  it("reviews a package without storing it", async () => {
    const { pending, issues } = await manager.reviewTheme(zip());
    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(pending?.change).toBe(ThemeInstallChange.New);
    expect(pending?.existing).toBeUndefined();
    expect(memory.themes.size).toBe(0);
    expect(memory.state.files).toEqual([]);
  });

  it("classifies a package against the installed version", async () => {
    await manager.installTheme(zip());
    const changeOf = async (version: string) =>
      (await manager.reviewTheme(zip({ version }))).pending?.change;
    expect(await changeOf("1.3.0")).toBe(ThemeInstallChange.Update);
    expect(await changeOf("1.2.0")).toBe(ThemeInstallChange.Reinstall);
    expect(await changeOf("1.1.0")).toBe(ThemeInstallChange.Downgrade);
    const { pending } = await manager.reviewTheme(zip({ version: "1.1.0" }));
    expect(pending?.existing?.version).toBe("1.2.0");
  });

  it("returns no pending install for a package with errors", async () => {
    const { pending, issues } = await manager.reviewTheme(
      zip({ id: "wmm-default" })
    );
    expect(pending).toBeUndefined();
    expect(issues.map((issue) => issue.code)).toEqual(["E2003"]);
  });

  it("commits a reviewed install", async () => {
    const { pending } = await manager.reviewTheme(zip());
    if (pending === undefined) throw new Error("expected a pending install");
    const theme = await manager.commitInstall(pending);
    expect(theme).toMatchObject({ id: "classic-blue", installedAt: 42 });
    expect(memory.themes.get("classic-blue")).toBe(theme);
    expect(memory.state.files).toHaveLength(3);
  });

  it("sets and clears the active theme id", async () => {
    await manager.installTheme(zip());
    await manager.setActiveThemeId("classic-blue");
    expect(await manager.getActiveThemeId()).toBe("classic-blue");
    await manager.setActiveThemeId(undefined);
    expect(await manager.getActiveThemeId()).toBeUndefined();
    await expect(manager.setActiveThemeId("nope")).rejects.toThrow(
      'Theme "nope" is not installed.'
    );
  });

  it("uninstalls a theme and clears it as active", async () => {
    await manager.installTheme(zip());
    await manager.applyTheme("classic-blue");
    await manager.uninstallTheme("classic-blue");
    expect(memory.themes.size).toBe(0);
    expect(memory.state.files).toEqual([]);
    expect(await manager.getActiveTheme()).toBeUndefined();
  });
});
