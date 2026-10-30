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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
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
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="dialog__body">
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        {children}
      </div>
      {footer !== undefined && <div className="dialog__footer">{footer}</div>}
    </dialog>
  );
}
