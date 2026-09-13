import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Sidebar } from "@/components/layout/Sidebar";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        aria-label="Close navigation menu"
        className="absolute inset-0 bg-ink-950/50"
        onClick={onClose}
      />
      <div className="relative h-full w-64 max-w-[80vw] shadow-lg">
        <Sidebar onNavigate={onClose} />
      </div>
    </div>,
    document.body,
  );
}
