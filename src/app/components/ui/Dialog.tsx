import { ReactNode, useEffect } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

interface DialogSectionProps {
  children: ReactNode;
}

export function DialogContent({ children }: DialogSectionProps) {
  return <div>{children}</div>;
}

export function DialogHeader({ children }: DialogSectionProps) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }: DialogSectionProps) {
  return <h2 className="text-xl font-bold">{children}</h2>;
}

export function DialogFooter({ children }: DialogSectionProps) {
  return <div className="mt-4 flex justify-end space-x-2">{children}</div>;
}
