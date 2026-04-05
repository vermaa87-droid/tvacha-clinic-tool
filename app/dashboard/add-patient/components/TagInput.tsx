"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  enterHint?: string;
}

export function TagInput({ tags, onAdd, onRemove, placeholder, enterHint }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const commit = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="w-full">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border"
              style={{ borderColor: "#b8936a", color: "#b8936a", background: "#fef7ef" }}
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="ml-0.5 hover:opacity-70"
                aria-label={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
      />
      <p className="text-xs mt-1" style={{ color: "#9a8a76" }}>{enterHint ?? "Press Enter to add"}</p>
    </div>
  );
}
