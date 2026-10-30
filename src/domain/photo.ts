/** Edge length of the stored square person photo, in pixels. */
export const PHOTO_SIZE = 256;

/** Upper bound for the stored cropped photo data URL (a 256×256 JPEG is typically 15–50 kB). */
export const PHOTO_MAX_LENGTH = 300_000;

/** Shorter side of the stored source photo used to re-edit the crop. */
export const PHOTO_SOURCE_SHORT_SIDE = 1024;

/** Upper bound for the stored source photo data URL (typically 150–450 kB). */
export const PHOTO_SOURCE_MAX_LENGTH = 1_500_000;

const PHOTO_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

function isImageDataUrl(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength && PHOTO_DATA_URL.test(value);
}

/** The stored cropped person photo: a base64 `data:` URL of limited size. */
export function isValidPhotoDataUrl(value: unknown): value is string {
  return isImageDataUrl(value, PHOTO_MAX_LENGTH);
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/**
 * How the image sits in the square crop viewport. At zoom 1 the shorter image
 * side exactly fills the viewport; (dx, dy) move the image center away from the
 * viewport center, in viewport units (the stored view uses viewport = 1, so it
 * does not depend on the screen size).
 */
export type CropView = { zoom: number; dx: number; dy: number };

/** The photo fields of a Person: all three are set together, or all are null. */
export type PersonPhoto = {
  /** Cropped square JPEG shown in the app. */
  photo: string;
  /** Downscaled original the crop was made from. */
  photoSource: string;
  /** Crop position within photoSource (viewport = 1). */
  photoCrop: CropView;
};

export type PersonPhotoFields = {
  photo?: string | null;
  photoSource?: string | null;
  photoCrop?: CropView | null;
};

/** The person's photo as one value, or null when the person has none. */
export function photoOfPerson(person: {
  photo: string | null;
  photoSource: string | null;
  photoCrop: CropView | null;
}): PersonPhoto | null {
  const { photo, photoSource, photoCrop } = person;
  return photo !== null && photoSource !== null && photoCrop !== null
    ? { photo, photoSource, photoCrop }
    : null;
}

/** Photo fields for saving: the photo's fields, or all null to remove it. */
export function toPhotoFields(photo: PersonPhoto | null): Required<PersonPhotoFields> {
  return photo ?? { photo: null, photoSource: null, photoCrop: null };
}

function isValidCropView(value: unknown): value is CropView {
  if (typeof value !== "object" || value === null) return false;
  const { zoom, dx, dy } = value as Record<string, unknown>;
  return (
    typeof zoom === "number" &&
    zoom >= MIN_ZOOM &&
    zoom <= MAX_ZOOM &&
    typeof dx === "number" &&
    Number.isFinite(dx) &&
    Math.abs(dx) <= MAX_ZOOM &&
    typeof dy === "number" &&
    Number.isFinite(dy) &&
    Math.abs(dy) <= MAX_ZOOM
  );
}

/**
 * Checks a set of photo fields: all omitted (unchanged), all null (no photo),
 * or all valid. Returns a Czech error message, or null when valid.
 */
export function photoFieldsError(fields: PersonPhotoFields): string | null {
  const values = [fields.photo, fields.photoSource, fields.photoCrop];
  if (values.every((value) => value === undefined)) return null;
  if (values.every((value) => value === null)) return null;
  if (
    isValidPhotoDataUrl(fields.photo) &&
    isImageDataUrl(fields.photoSource, PHOTO_SOURCE_MAX_LENGTH) &&
    isValidCropView(fields.photoCrop)
  ) {
    return null;
  }
  return "Fotka má nepodporovaný formát nebo je příliš velká.";
}

export type ImageSize = { width: number; height: number };

export type CropRect = { x: number; y: number; size: number };

export const INITIAL_CROP_VIEW: CropView = { zoom: 1, dx: 0, dy: 0 };

function displayScale(image: ImageSize, viewport: number, zoom: number): number {
  return (viewport / Math.min(image.width, image.height)) * zoom;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Limits zoom and keeps the image covering the whole viewport (no empty edges). */
export function clampCropView(view: CropView, image: ImageSize, viewport: number): CropView {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  const scale = displayScale(image, viewport, zoom);
  const maxDx = (image.width * scale - viewport) / 2;
  const maxDy = (image.height * scale - viewport) / 2;
  return { zoom, dx: clamp(view.dx, -maxDx, maxDx), dy: clamp(view.dy, -maxDy, maxDy) };
}

/** Moves the image by (moveX, moveY) viewport pixels. */
export function panCropView(view: CropView, moveX: number, moveY: number, image: ImageSize, viewport: number): CropView {
  return clampCropView({ ...view, dx: view.dx + moveX, dy: view.dy + moveY }, image, viewport);
}

/**
 * Changes the zoom while the image point under (focusX, focusY) — relative to
 * the viewport center — stays in place (pinch / wheel / slider at the center).
 */
export function zoomCropView(
  view: CropView,
  zoom: number,
  focusX: number,
  focusY: number,
  image: ImageSize,
  viewport: number,
): CropView {
  const nextZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const ratio = nextZoom / view.zoom;
  return clampCropView(
    {
      zoom: nextZoom,
      dx: focusX - (focusX - view.dx) * ratio,
      dy: focusY - (focusY - view.dy) * ratio,
    },
    image,
    viewport,
  );
}

/** The square part of the source image (in image pixels) visible in the viewport. */
export function cropRectFromView(view: CropView, image: ImageSize, viewport: number): CropRect {
  const scale = displayScale(image, viewport, view.zoom);
  const size = viewport / scale;
  return {
    x: image.width / 2 - view.dx / scale - size / 2,
    y: image.height / 2 - view.dy / scale - size / 2,
    size,
  };
}
