import { useEffect, useRef, type ReactNode } from "react";
import { goBack } from "../app/routes";
import { BackIcon } from "./icons";

type ScreenHeaderProps = {
  title: string;
  /** Where the back arrow leads when there is no previous in-app screen; no arrow when omitted. */
  backFallback?: string;
  backLabel?: string;
  actions?: ReactNode;
  /** Decorative element before the title (the brand icon on the People screen). */
  leading?: ReactNode;
};

/** Screen title; receives focus on mount so screen readers announce the new screen. */
export function ScreenHeader({ title, backFallback, backLabel = "Zpět", actions, leading }: ScreenHeaderProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <header className="screen-header">
      {backFallback !== undefined && (
        <button
          type="button"
          className="icon-button"
          aria-label={backLabel}
          onClick={() => goBack(backFallback)}
        >
          <BackIcon />
        </button>
      )}
      {leading}
      <h1 ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      {actions !== undefined && <div className="screen-header__actions">{actions}</div>}
    </header>
  );
}
