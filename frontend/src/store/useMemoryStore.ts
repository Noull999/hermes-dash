import { create } from 'zustand';

interface MemoryState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
