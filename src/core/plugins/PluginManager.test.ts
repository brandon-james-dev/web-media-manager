import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import type {
  PackageFileRecord,
  PackageFileStore,
} from "@/core/ports/packageFiles";
import type { VisualizerPluginStore } from "@/core/ports/visualizers";
import type {
  InstalledPlugin,
  PluginSettingsRecord,
} from "./contracts";
import { PluginInstallError, PluginManager } from "./PluginManager";

class MemoryPackageFileStore implements PackageFileStore {
  readonly byOwner = new Map<string, PackageFileRecord[]>();

  async listFiles(ownerId: string): Promise<PackageFileRecord[]> {
    return this.byOwner.get(ownerId) ?? [];
  }

  async getFile(
    ownerId: string,
    path: string
  ): Promise<PackageFileRecord | undefined> {
    return this.byOwner.get(ownerId)?.find((file) => file.path === path);
  }

  async putFiles(files: PackageFileRecord[]): Promise<void> {
    for (const file of files) {
      const existing = this.byOwner.get(file.ownerId) ?? [];
      this.byOwner.set(file.ownerId, [
        ...existing.filter((entry) => entry.path !== file.path),
        file,
      ]);
    }
  }

  async deleteFiles(ownerId: string): Promise<void> {
    this.byOwner.delete(ownerId);
  }
}

class MemoryStore implements VisualizerPluginStore {
  readonly plugins = new Map<string, InstalledPlugin>();
  readonly files = new MemoryPackageFileStore();
  readonly settings = new Map<string, PluginSettingsRecord>();

  async listPlugins(): Promise<InstalledPlugin[]> {
    return [...this.plugins.values()];
  }

  async getPlugin(id: string): Promise<InstalledPlugin | undefined> {
    return this.plugins.get(id);
  }

  async putPlugin(plugin: InstalledPlugin): Promise<void> {
    this.plugins.set(plugin.id, plugin);
  }

  async deletePlugin(id: string): Promise<void> {
    this.plugins.delete(id);
    await this.files.deleteFiles(id);
    this.settings.delete(id);
  }

  async getSettings(
    pluginId: string
  ): Promise<PluginSettingsRecord | undefined> {
    return this.settings.get(pluginId);
  }

  async putSettings(settings: PluginSettingsRecord): Promise<void> {
    this.settings.set(settings.pluginId, settings);
  }

  async deleteSettings(pluginId: string): Promise<void> {
    this.settings.delete(pluginId);
  }
}

const MANIFEST = {
  id: "alchemy",
  name: "Alchemy",
  version: "1.0.0",
  runtime: "webgl-shader",
  entry: "fragment.glsl",
  thumbnail: "thumbnail.png",
  author: "Studio Nine",
  settings: [
    {
      key: "speed",
      label: "Speed",
      type: "number",
      default: 1,
      min: 0.1,
      max: 4,
    },
    { key: "glow", label: "Glow", type: "boolean", default: true },
  ],
};

function buildZip(
  manifest: unknown = MANIFEST,
  thumbnail: Uint8Array = new Uint8Array([137, 80, 78, 71]),
  thumbnailPath = "thumbnail.png"
): Uint8Array {
  return zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "fragment.glsl": strToU8("void main() { gl_FragColor = vec4(1.0); }"),
    [thumbnailPath]: thumbnail,
  });
}

function createManager() {
  const store = new MemoryStore();
  const manager = new PluginManager({ store, now: () => 1_700_000_000_000 });
  return { store, manager };
}

describe("PluginManager", () => {
  it("installs a valid ZIP and stores its files and default settings", async () => {
    const { store, manager } = createManager();

    const result = await manager.installFromZip(buildZip());

    expect(result.plugin.id).toBe("alchemy");
    expect(result.plugin.fileCount).toBe(3);
    expect(result.replaced).toBe(false);
    expect(store.plugins.get("alchemy")?.author).toBe("Studio Nine");
    expect(
      store.files.byOwner.get("alchemy")?.map((file) => file.path)
    ).toEqual(["fragment.glsl", "manifest.json", "thumbnail.png"]);
    expect(store.settings.get("alchemy")?.values).toEqual({
      speed: 1,
      glow: true,
    });
  });

  it("rejects an archive without a manifest", async () => {
    const { manager } = createManager();
    const zip = zipSync({ "fragment.glsl": strToU8("void main() {}") });

    await expect(manager.installFromZip(zip)).rejects.toBeInstanceOf(
      PluginInstallError
    );
  });

  it("rejects a runtime that is not implemented yet", async () => {
    const { manager } = createManager();
    const zip = zipSync({
      "manifest.json": strToU8(
        JSON.stringify({ ...MANIFEST, runtime: "wasm", entry: "plugin.wasm" })
      ),
      "plugin.wasm": new Uint8Array([0, 97, 115, 109]),
    });

    await expect(manager.installFromZip(zip)).rejects.toThrow(
      /not available in this version/
    );
  });

  it("rejects an entry that is not in the archive", async () => {
    const { manager } = createManager();
    const zip = zipSync({
      "manifest.json": strToU8(
        JSON.stringify({ ...MANIFEST, entry: "missing.glsl" })
      ),
    });

    await expect(manager.installFromZip(zip)).rejects.toThrow(
      /is not in the archive/
    );
  });

  it("requires an explicit replace for an installed id", async () => {
    const { manager } = createManager();
    await manager.installFromZip(buildZip());

    await expect(manager.installFromZip(buildZip())).rejects.toThrow(
      /already installed/
    );

    const updated = await manager.installFromZip(buildZip(), {
      replace: true,
    });
    expect(updated.replaced).toBe(true);
  });

  it("keeps user settings across an update", async () => {
    const { store, manager } = createManager();
    await manager.installFromZip(buildZip());
    await manager.saveSettings("alchemy", { speed: 3, glow: false });

    await manager.installFromZip(buildZip(), { replace: true });

    expect(store.settings.get("alchemy")?.values).toEqual({
      speed: 3,
      glow: false,
    });
  });

  it("loads the entry source and file map", async () => {
    const { manager } = createManager();
    await manager.installFromZip(buildZip());

    const loaded = await manager.load("alchemy");

    expect(loaded.entrySource).toContain("gl_FragColor");
    expect(loaded.files.size).toBe(3);
    expect(loaded.plugin.entryPath).toBe("fragment.glsl");
  });

  it("throws a load error for an unknown plugin", async () => {
    const { manager } = createManager();

    await expect(manager.load("nope")).rejects.toThrow(/not installed/);
  });

  it("removes the plugin with its files and settings", async () => {
    const { store, manager } = createManager();
    await manager.installFromZip(buildZip());

    await manager.remove("alchemy");

    expect(store.plugins.size).toBe(0);
    expect(store.files.byOwner.size).toBe(0);
    expect(store.settings.size).toBe(0);
  });

  it("coerces settings to declared keys, types and ranges", async () => {
    const { manager } = createManager();
    await manager.installFromZip(buildZip());

    const saved = await manager.saveSettings("alchemy", {
      speed: 99,
      glow: "yes",
      unknown: 1,
    } as never);

    expect(saved).toEqual({ speed: 4, glow: true });
  });

  it("resets settings to manifest defaults", async () => {
    const { manager } = createManager();
    await manager.installFromZip(buildZip());
    await manager.saveSettings("alchemy", { speed: 2, glow: false });

    const reset = await manager.resetSettings("alchemy");

    expect(reset).toEqual({ speed: 1, glow: true });
    expect(await manager.getSettings("alchemy")).toEqual({
      speed: 1,
      glow: true,
    });
  });

  it("returns the thumbnail as a Blob", async () => {
    const { manager } = createManager();
    await manager.installFromZip(buildZip());

    const thumbnail = await manager.getThumbnail("alchemy");

    expect(thumbnail?.type).toBe("image/png");
    expect(thumbnail?.size).toBe(4);
  });

  it("accepts an SVG thumbnail and types it as image/svg+xml", async () => {
    const { manager } = createManager();
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>'
    );
    await manager.installFromZip(
      buildZip({ ...MANIFEST, thumbnail: "thumbnail.svg" }, svg, "thumbnail.svg")
    );

    const thumbnail = await manager.getThumbnail("alchemy");

    expect(thumbnail?.type).toBe("image/svg+xml");
    expect(thumbnail?.size).toBe(svg.byteLength);
  });
});
