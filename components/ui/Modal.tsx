"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div
        className={`relative bg-primary-50 border border-primary-200 rounded-lg shadow-lg w-full mx-4 ${sizes[size]}`}
      >
        <div className="flex items-center justify-between border-b border-primary-200 p-6">
          <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="border-t border-primary-200 p-6 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
