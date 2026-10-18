/**
 * Compresión de fotos en el navegador (pedido del dueño: cuidar los 10 GB
 * de R2). Ninguna foto gigante de cámara sale del dispositivo: se reescala a
 * dos tamaños —grande (≤ 1600 px) y miniatura (≤ 640 px)— y se reencoda a
 * JPEG bajando la calidad por pasos hasta entrar en el presupuesto.
 *
 * Con esto una foto típica pesa 150–400 KB (grande + miniatura), así que
 * 10 GB dan para decenas de miles de fotos.
 */

export class PhotoError extends Error {
  constructor(readonly code: "read" | "heavy") {
    super(code);
    this.name = "PhotoError";
  }
}

export type CompressedPhoto = {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
};

const FULL_MAX_EDGE = 1600;
const THUMB_MAX_EDGE = 640;
/** Debajo del tope del servidor (1,5 MB): margen para redondeos. */
const FULL_TARGET_BYTES = 1_200_000;
const FULL_QUALITIES = [0.82, 0.72, 0.62, 0.52];
const THUMB_QUALITY = 0.78;
/** Las fotos de celular rondan 3–10 MB; más que esto no vale la pena. */
const SOURCE_MAX_BYTES = 30_000_000;

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  if (file.size > SOURCE_MAX_BYTES) {
    throw new PhotoError("heavy");
  }

  const bitmap = await loadBitmap(file);
  try {
    const full = await encode(
      bitmap,
      FULL_MAX_EDGE,
      FULL_QUALITIES,
      FULL_TARGET_BYTES,
    );
    const thumb = await encode(bitmap, THUMB_MAX_EDGE, [THUMB_QUALITY]);
    return {
      full: full.blob,
      thumb: thumb.blob,
      width: full.width,
      height: full.height,
    };
  } finally {
    bitmap.close();
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new PhotoError("read");
  }
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encode(
  bitmap: ImageBitmap,
  maxEdge: number,
  qualities: number[],
  targetBytes?: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = scaledSize(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new PhotoError("read");
  }
  // Los PNG con transparencia van sobre blanco (el JPEG no la soporta).
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);

  let blob: Blob | null = null;
  for (const quality of qualities) {
    blob = await toBlob(canvas, quality);
    if (!blob) {
      break;
    }
    if (!targetBytes || blob.size <= targetBytes) {
      break;
    }
  }
  if (!blob) {
    throw new PhotoError("read");
  }

  return { blob, width, height };
}

function toBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}
