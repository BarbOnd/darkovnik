import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  title: string;
  onClose(): void;
  children: ReactNode;
  /** Buttons at the bottom of the dialog. */
  footer?: ReactNode;
};

/** Modal built on the native <dialog>: focus trap, Escape and backdrop handling come from the browser. */
export function Dialog({ title, onClose, children, footer }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
      // Start on the title instead of the first control (no stray focus ring, title is announced).
      titleRef.current?.focus();
    }
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        pressedOnBackdrop.current = event.target === dialogRef.current;
      }}
      onClick={(event) => {
        // A drag that starts inside and ends on the backdrop must not close the dialog.
        if (event.target === dialogRef.current && pressedOnBackdrop.current) onClose();
      }}
    >
      <div className="dialog__body">
        <h2 id={titleId} ref={titleRef} className="dialog__title" tabIndex={-1}>
          {title}
        </h2>
        {children}
      </div>
      {footer !== undefined && <div className="dialog__footer">{footer}</div>}
    </dialog>
  );
}
