import { useCallback, useState } from "react";

interface Disclosure {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Small state hook for anything with an open/closed shape: the mobile nav
 * drawer today, and potentially modals or dropdowns later. Centralizing it
 * here avoids re-writing the same three callbacks in every component.
 */
export function useDisclosure(initial = false): Disclosure {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}
