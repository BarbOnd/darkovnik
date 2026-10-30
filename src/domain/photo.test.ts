import { describe, expect, it } from "vitest";
import {
  clampCropView,
  cropRectFromView,
  INITIAL_CROP_VIEW,
  isValidPhotoDataUrl,
  MAX_ZOOM,
  panCropView,
  PHOTO_MAX_LENGTH,
  photoFieldsError,
  zoomCropView,
} from "./photo";

describe("photo data URL", () => {
  it.each(["data:image/jpeg;base64,/9j/4AAQ", "data:image/png;base64,iVBORw0KGgo=", "data:image/webp;base64,UklG"])(
    "accepts %s",
    (value) => expect(isValidPhotoDataUrl(value)).toBe(true),
  );

  it.each([
    "",
    "https://example.test/foto.jpg",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:text/html;base64,PGI+",
    "data:image/jpeg,raw",
    "data:image/jpeg;base64,abc def",
    "javascript:alert(1)",
    null,
    42,
  ])("rejects %s", (value) => expect(isValidPhotoDataUrl(value)).toBe(false));

  it("rejects oversized photos", () => {
    const prefix = "data:image/jpeg;base64,";
    expect(isValidPhotoDataUrl(prefix + "A".repeat(PHOTO_MAX_LENGTH - prefix.length))).toBe(true);
    expect(isValidPhotoDataUrl(prefix + "A".repeat(PHOTO_MAX_LENGTH))).toBe(false);
  });
});

describe("person photo fields", () => {
  const photo = "data:image/jpeg;base64,/9j/4AAQ";
  const photoSource = "data:image/jpeg;base64,/9j/4BBQ";
  const photoCrop = { zoom: 2, dx: 0.1, dy: -0.2 };

  it("accepts all omitted, all null, or a complete valid set", () => {
    expect(photoFieldsError({})).toBeNull();
    expect(photoFieldsError({ photo: null, photoSource: null, photoCrop: null })).toBeNull();
    expect(photoFieldsError({ photo, photoSource, photoCrop })).toBeNull();
  });

  it.each([
    [{ photo }],
    [{ photo, photoSource }],
    [{ photo, photoSource: null, photoCrop: null }],
    [{ photo: null, photoSource, photoCrop }],
    [{ photo, photoSource: "https://example.test/a.jpg", photoCrop }],
    [{ photo, photoSource, photoCrop: { zoom: 5, dx: 0, dy: 0 } }],
    [{ photo, photoSource, photoCrop: { zoom: 0.5, dx: 0, dy: 0 } }],
    [{ photo, photoSource, photoCrop: { zoom: 1, dx: Number.NaN, dy: 0 } }],
    [{ photo, photoSource, photoCrop: { zoom: 1, dx: 0 } as never }],
  ])("rejects an incomplete or invalid set %#", (fields) => {
    expect(photoFieldsError(fields)).toBe("Fotka má nepodporovaný formát nebo je příliš velká.");
  });
});

describe("photo crop", () => {
  const VIEWPORT = 200;
  const landscape = { width: 400, height: 200 };
  const portrait = { width: 300, height: 600 };

  it("starts with the centered square of the shorter side", () => {
    expect(cropRectFromView(INITIAL_CROP_VIEW, landscape, VIEWPORT)).toEqual({ x: 100, y: 0, size: 200 });
    expect(cropRectFromView(INITIAL_CROP_VIEW, portrait, VIEWPORT)).toEqual({ x: 0, y: 150, size: 300 });
  });

  it("pans within the image, never showing empty edges", () => {
    // Displayed landscape image is 400 × 200 px, so it can move 100 px to each side.
    expect(panCropView(INITIAL_CROP_VIEW, 60, 30, landscape, VIEWPORT)).toEqual({ zoom: 1, dx: 60, dy: 0 });
    const farRight = panCropView(INITIAL_CROP_VIEW, 500, 0, landscape, VIEWPORT);
    expect(farRight).toEqual({ zoom: 1, dx: 100, dy: 0 });
    // Moving the image right shows its left edge.
    expect(cropRectFromView(farRight, landscape, VIEWPORT)).toEqual({ x: 0, y: 0, size: 200 });
  });

  it("zooms in on the center and limits the zoom range", () => {
    const zoomed = zoomCropView(INITIAL_CROP_VIEW, 2, 0, 0, landscape, VIEWPORT);
    expect(zoomed).toEqual({ zoom: 2, dx: 0, dy: 0 });
    expect(cropRectFromView(zoomed, landscape, VIEWPORT)).toEqual({ x: 150, y: 50, size: 100 });
    expect(zoomCropView(INITIAL_CROP_VIEW, 10, 0, 0, landscape, VIEWPORT).zoom).toBe(MAX_ZOOM);
    expect(zoomCropView(zoomed, 0.2, 0, 0, landscape, VIEWPORT).zoom).toBe(1);
  });

  it("keeps the point under the fingers in place while zooming", () => {
    const focusX = 50;
    const focusY = -40;
    const before = INITIAL_CROP_VIEW;
    const after = zoomCropView(before, 2, focusX, focusY, landscape, VIEWPORT);
    const imagePoint = (view: typeof before) => {
      const rect = cropRectFromView(view, landscape, VIEWPORT);
      const scale = VIEWPORT / rect.size;
      return { x: rect.x + (VIEWPORT / 2 + focusX) / scale, y: rect.y + (VIEWPORT / 2 + focusY) / scale };
    };
    expect(imagePoint(after).x).toBeCloseTo(imagePoint(before).x);
    expect(imagePoint(after).y).toBeCloseTo(imagePoint(before).y);
  });

  it("zooming out pulls the image back to cover the viewport", () => {
    const panned = panCropView({ zoom: 3, dx: 0, dy: 0 }, 250, 250, landscape, VIEWPORT);
    expect(clampCropView({ ...panned, zoom: 1 }, landscape, VIEWPORT)).toEqual({ zoom: 1, dx: 100, dy: 0 });
  });
});
