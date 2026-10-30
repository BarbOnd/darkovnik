import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Dialog } from "../../components/Dialog";
import {
  clampCropView,
  cropRectFromView,
  INITIAL_CROP_VIEW,
  MAX_ZOOM,
  MIN_ZOOM,
  panCropView,
  zoomCropView,
  type CropView,
  type PersonPhoto,
} from "../../domain/photo";
import { decodePhoto, encodePhotoSource, PhotoError, renderPhoto, type PhotoImage } from "../../lib/photo";

/** The crop math works in viewport units: the visible square is 1 × 1. */
const VIEWPORT = 1;
/** CSS size of the preview; the canvas backing store follows the device pixel ratio. */
const PREVIEW_CSS_SIZE = 240;
const KEY_PAN_STEP = 0.05;
const KEY_ZOOM_STEP = 1.15;
const WHEEL_ZOOM_SPEED = 0.002;

type Point = { x: number; y: number };

export type PhotoCropSource = {
  image: PhotoImage;
  /** Stored source data URL when re-editing; null for a newly picked file (encoded on apply). */
  source: string | null;
  view: CropView;
};

type PhotoCropDialogProps = {
  initial: PhotoCropSource;
  onCancel(): void;
  onApply(photo: PersonPhoto): void;
};

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function errorMessage(error: unknown): string {
  return error instanceof PhotoError ? error.message : "Fotku se nepodařilo zpracovat.";
}

/** Lets the user move and zoom the photo inside a circle, or pick another one, before saving. */
export function PhotoCropDialog({ initial, onCancel, onApply }: PhotoCropDialogProps) {
  const [current, setCurrent] = useState(() => ({ image: initial.image, source: initial.source }));
  const image = useMemo(
    () => ({ width: current.image.width, height: current.image.height }),
    [current.image],
  );
  const [view, setView] = useState<CropView>(() => clampCropView(initial.view, image, VIEWPORT));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const zoomId = useId();
  const helpId = useId();

  /** Position relative to the preview center, in viewport units. */
  function toViewport(clientX: number, clientY: number): Point {
    const rect = areaRef.current?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / rect.width - 0.5,
      y: (clientY - rect.top) / rect.height - 0.5,
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas == null || context == null) return;
    const pixels = Math.round(PREVIEW_CSS_SIZE * (window.devicePixelRatio || 1));
    // Check both sides: a fresh canvas is 300 × 150, and at 125 % scaling the
    // width is already 300, so checking only the width left the canvas 2:1.
    if (canvas.width !== pixels || canvas.height !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    const crop = cropRectFromView(view, image, VIEWPORT);
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, pixels, pixels);
    context.drawImage(current.image, crop.x, crop.y, crop.size, crop.size, 0, 0, pixels, pixels);
  }, [current.image, image, view]);

  // React registers wheel listeners as passive, so preventDefault needs a native listener.
  useEffect(() => {
    const area = areaRef.current;
    if (area === null) return;
    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = area?.getBoundingClientRect();
      if (rect === undefined || rect.width === 0) return;
      const focusX = (event.clientX - rect.left) / rect.width - 0.5;
      const focusY = (event.clientY - rect.top) / rect.height - 0.5;
      const change = Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED);
      setView((view) => zoomCropView(view, view.zoom * change, focusX, focusY, image, VIEWPORT));
    }
    area.addEventListener("wheel", handleWheel, { passive: false });
    return () => area.removeEventListener("wheel", handleWheel);
  }, [image]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, toViewport(event.clientX, event.clientY));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = pointers.current;
    const previous = active.get(event.pointerId);
    if (previous === undefined) return;
    const position = toViewport(event.clientX, event.clientY);
    const [first, second] = [...active.entries()];
    active.set(event.pointerId, position);

    if (second === undefined) {
      const moveX = position.x - previous.x;
      const moveY = position.y - previous.y;
      setView((view) => panCropView(view, moveX, moveY, image, VIEWPORT));
      return;
    }

    // Pinch: the two fingers zoom around their midpoint and move it.
    const before = [first[1], second[1]];
    const after = [first, second].map(([id, point]) => (id === event.pointerId ? position : point));
    const oldDistance = distance(before[0], before[1]);
    if (oldDistance === 0) return;
    const ratio = distance(after[0], after[1]) / oldDistance;
    const oldMid = midpoint(before[0], before[1]);
    const newMid = midpoint(after[0], after[1]);
    setView((view) =>
      zoomCropView(
        panCropView(view, newMid.x - oldMid.x, newMid.y - oldMid.y, image, VIEWPORT),
        view.zoom * ratio,
        newMid.x,
        newMid.y,
        image,
        VIEWPORT,
      ),
    );
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_PAN_STEP, 0],
      ArrowRight: [KEY_PAN_STEP, 0],
      ArrowUp: [0, -KEY_PAN_STEP],
      ArrowDown: [0, KEY_PAN_STEP],
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      setView((view) => panCropView(view, move[0], move[1], image, VIEWPORT));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setView((view) => zoomCropView(view, view.zoom * KEY_ZOOM_STEP, 0, 0, image, VIEWPORT));
    } else if (event.key === "-") {
      event.preventDefault();
      setView((view) => zoomCropView(view, view.zoom / KEY_ZOOM_STEP, 0, 0, image, VIEWPORT));
    }
  }

  async function handlePickAnother(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Reset so picking the same file again still triggers a change.
    input.value = "";
    if (file === undefined) return;
    setLoading(true);
    setError(null);
    try {
      const picked = await decodePhoto(file);
      setCurrent({ image: picked, source: null });
      setView(INITIAL_CROP_VIEW);
    } catch (pickError) {
      setError(errorMessage(pickError));
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    let photo: PersonPhoto;
    try {
      photo = {
        photo: renderPhoto(current.image, cropRectFromView(view, image, VIEWPORT)),
        photoSource: current.source ?? encodePhotoSource(current.image),
        photoCrop: view,
      };
    } catch (applyError) {
      setError(errorMessage(applyError));
      return;
    }
    onApply(photo);
  }

  return (
    <Dialog
      title="Upravit výřez fotky"
      onClose={() => !loading && onCancel()}
      footer={
        <>
          <button type="button" className="button button--ghost" disabled={loading} onClick={onCancel}>
            Zrušit
          </button>
          <button type="button" className="button button--primary" disabled={loading} onClick={apply}>
            Použít
          </button>
        </>
      }
    >
      <div
        ref={areaRef}
        className="photo-crop"
        tabIndex={0}
        role="group"
        aria-label="Výřez fotky"
        aria-describedby={helpId}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
      >
        <canvas ref={canvasRef} className="photo-crop__canvas" aria-hidden="true" />
        <div className="photo-crop__circle" aria-hidden="true" />
      </div>
      <p id={helpId} className="field__hint photo-crop__help">
        Fotku posunete tažením, přiblížíte roztažením prstů nebo posuvníkem.
      </p>
      <div className="field">
        <label className="field__label" htmlFor={zoomId}>
          Přiblížení
        </label>
        <input
          id={zoomId}
          type="range"
          className="photo-crop__zoom"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          disabled={loading}
          onChange={(event) => {
            const zoom = Number(event.target.value);
            setView((view) => zoomCropView(view, zoom, 0, 0, image, VIEWPORT));
          }}
        />
      </div>
      <label className="button button--secondary button--block file-button" aria-disabled={loading}>
        <input
          type="file"
          accept="image/*"
          className="visually-hidden"
          disabled={loading}
          onChange={handlePickAnother}
        />
        {loading ? "Načítám…" : "Vybrat jinou fotku"}
      </label>
      {error !== null && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
