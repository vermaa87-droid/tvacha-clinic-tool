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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div
        className={`relative bg-primary-50 border border-primary-200 shadow-lg w-full ${sizes[size]} rounded-t-2xl sm:rounded-lg max-h-[85vh] sm:max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between border-b border-primary-200 p-4 sm:p-6 flex-shrink-0">
          <h2 className="text-lg sm:text-2xl font-semibold text-text-primary pr-2">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">{children}</div>
        {footer && (
          <div className="border-t border-primary-200 p-4 sm:p-6 flex justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
