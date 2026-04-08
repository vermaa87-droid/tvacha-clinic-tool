"use client";

import { create } from "zustand";

interface Mutation {
  id: string;
  label: string;
  fn: () => Promise<void>;
  onError?: (err: Error) => void;
  retries: number;
}

interface MutationQueueState {
  pending: Mutation[];
  processing: boolean;
  failedCount: number;

  enqueue: (opts: { label: string; fn: () => Promise<void>; onError?: (err: Error) => void }) => void;
  process: () => Promise<void>;
}

let counter = 0;

export const useMutationQueue = create<MutationQueueState>((set, get) => ({
  pending: [],
  processing: false,
  failedCount: 0,

  enqueue: (opts) => {
    const id = `mut-${++counter}-${Date.now()}`;
    const mutation: Mutation = { id, label: opts.label, fn: opts.fn, onError: opts.onError, retries: 0 };
    set((s) => ({ pending: [...s.pending, mutation] }));

    // Auto-process if not already running
    if (!get().processing) {
      get().process();
    }
  },

  process: async () => {
    const { pending } = get();
    if (pending.length === 0 || get().processing) return;

    set({ processing: true });

    while (get().pending.length > 0) {
      const [current, ...rest] = get().pending;
      try {
        await current.fn();
        set({ pending: rest });
      } catch (err) {
        if (current.retries < 1) {
          // Retry once
          current.retries++;
          set({ pending: [current, ...rest] });
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          // Failed after retry — remove from queue, call onError
          set((s) => ({ pending: rest, failedCount: s.failedCount + 1 }));
          if (current.onError) {
            current.onError(err instanceof Error ? err : new Error(String(err)));
          }
          console.error(`[mutation-queue] "${current.label}" failed:`, err);
        }
      }
    }

    set({ processing: false });
  },
}));
