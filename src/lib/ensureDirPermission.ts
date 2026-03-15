export async function ensureDirPermission(dir: any) {
  const opts = { mode: "readwrite" };

  const q = await dir.queryPermission(opts);
  if (q === "granted") return true;

  const r = await dir.requestPermission(opts);
  if (r === "granted") return true;

  throw new Error("Directory permission denied");
}
