import { create } from "zustand";

type UiState = {
  sidebarOpen: boolean;
  composerDraft: string;
  setSidebarOpen: (open: boolean) => void;
  setComposerDraft: (value: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  composerDraft: "",
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setComposerDraft: (composerDraft) => set({ composerDraft }),
}));
