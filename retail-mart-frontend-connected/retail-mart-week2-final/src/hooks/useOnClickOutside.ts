import { RefObject, useEffect } from "react";

/**
 * Calls `handler` when a pointer event happens outside `ref`'s element.
 * Generic so it can be reused by any future dropdown/popover, not just the
 * profile menu. Pass `enabled = false` to skip attaching listeners when the
 * element isn't open - there's no reason to listen globally while closed.
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (!ref.current || ref.current.contains(target)) return;
      handler();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [ref, handler, enabled]);
}
