import {
  isValidPhotoDataUrl,
  PHOTO_SIZE,
  PHOTO_SOURCE_MAX_LENGTH,
  PHOTO_SOURCE_SHORT_SIDE,
  type CropRect,
} from "../domain/photo";

const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const JPEG_QUALITY = 0.85;
/** Tried in order until the source photo fits PHOTO_SOURCE_MAX_LENGTH. */
const SOURCE_JPEG_QUALITIES = [0.85, 0.7, 0.55];

/**
 * A decoded, upright photo. It is a canvas on purpose: its width and height
 * always match the drawn pixels, so the crop math works on exact dimensions.
 */
export type PhotoImage = HTMLCanvasElement;

/** Error with a Czech message that can be shown to the user as is. */
export class PhotoError extends Error {}

function createContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) throw new PhotoError("Fotku se nepodařilo zpracovat.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  // JPEG has no transparency; transparent PNG areas become white instead of black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  return context;
}

/** Loads an image URL; <img> applies the photo's EXIF orientation (phone photos stay upright). */
async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  if (image.naturalWidth === 0 || image.naturalHeight === 0) throw new Error("Empty image");
  return image;
}

/**
 * Copies the image into a canvas whose shorter side is at most `shortSide`.
 * Large reductions are done in halving steps, which keeps the result sharp.
 */
function toPhotoImage(image: HTMLImageElement, shortSide: number): PhotoImage {
  let source: CanvasImageSource = image;
  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const ratio = Math.min(1, shortSide / Math.min(width, height));
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));

  while (width / 2 >= targetWidth && height / 2 >= targetHeight) {
    width = Math.round(width / 2);
    height = Math.round(height / 2);
    const step = createContext(width, height);
    step.drawImage(source, 0, 0, width, height);
    source = step.canvas;
  }
  const result = createContext(targetWidth, targetHeight);
  result.drawImage(source, 0, 0, targetWidth, targetHeight);
  return result.canvas;
}

/** Decodes a picked image file, upright and scaled to the stored source size. */
export async function decodePhoto(file: File): Promise<PhotoImage> {
  // Some Android galleries report an empty type; decoding decides then.
  if (file.type !== "" && !file.type.startsWith("image/")) {
    throw new PhotoError("Vybraný soubor není obrázek.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new PhotoError("Obrázek je příliš velký. Vyberte prosím menší fotku.");
  }
  const url = URL.createObjectURL(file);
  try {
    return toPhotoImage(await loadImage(url), PHOTO_SOURCE_SHORT_SIDE);
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError("Tento obrázek se nepodařilo otevřít. Zkuste fotku ve formátu JPEG nebo PNG.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Opens a stored source photo for re-editing. */
export async function loadPhotoSource(dataUrl: string): Promise<PhotoImage> {
  try {
    return toPhotoImage(await loadImage(dataUrl), PHOTO_SOURCE_SHORT_SIDE);
  } catch {
    throw new PhotoError("Uloženou fotku se nepodařilo otevřít. Vyberte prosím fotku znovu.");
  }
}

/** Encodes the decoded image as the stored source photo (JPEG `data:` URL). */
export function encodePhotoSource(image: PhotoImage): string {
  for (const quality of SOURCE_JPEG_QUALITIES) {
    const dataUrl = image.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= PHOTO_SOURCE_MAX_LENGTH) return dataUrl;
  }
  throw new PhotoError("Fotka je po zmenšení pořád příliš velká. Zkuste prosím jinou.");
}

/** Renders the chosen square part of the image as the stored PHOTO_SIZE JPEG `data:` URL. */
export function renderPhoto(image: PhotoImage, crop: CropRect): string {
  const context = createContext(PHOTO_SIZE, PHOTO_SIZE);
  context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  const dataUrl = context.canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!isValidPhotoDataUrl(dataUrl)) throw new PhotoError("Fotku se nepodařilo zpracovat.");
  return dataUrl;
}
