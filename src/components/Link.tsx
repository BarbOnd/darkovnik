import type { AnchorHTMLAttributes } from "react";
import { navigate } from "../app/routes";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** In-app link; keeps normal link behavior for modified clicks (new tab etc.). */
export function Link({ href, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
}
