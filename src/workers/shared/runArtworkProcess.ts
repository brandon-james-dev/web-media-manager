import type { WorkerProgress } from "@/lib/background-jobs/WorkerJob";

export async function runArtworkProcess(
  payload: any,
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
) {
  const { pictures } = payload;
  const total = payload.pictures.length;

  for (let i = 0; i < total; i++) {
    const pic = pictures[i];

    if (isCancelled()) return { cancelled: true };
    reportProgress({
      index: i,
      total,
      percent: 0.0,
      overall: i / total,
      label: `Processing picture ${i + 1}`,
    });

    // decode
    const bitmap = await createImageBitmap(new Blob([pic.data.slice().buffer]));
    reportProgress({
      index: i,
      total,
      percent: 0.3,
      overall: (i + 0.3) / total,
    });

    // resize
    const width = 1000;
    const height = 1000;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    reportProgress({
      index: i,
      total,
      percent: 0.6,
      overall: (i + 0.6) / total,
    });

    // encode
    const blob = await canvas.convertToBlob({ type: "image/jpeg" });
    const bytes = new Uint8Array(await blob.arrayBuffer());

    reportProgress({
      index: i,
      total,
      percent: 1.0,
      overall: (i + 1.0) / total,
    });
  }

  return { ok: true };
}
