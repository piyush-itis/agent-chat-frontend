import { create } from "zustand";
import type { Attachment } from "@/generated/api";

export type RailView = "tasks" | "projects" | "tools";

export type PendingOutgoing = {
  chatId: string;
  text: string;
  attachments: Attachment[];
  clientKey: string;
};

type UiState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  accountExpanded: boolean;
  composerDraft: string;
  searchQuery: string;
  railView: RailView;
  pendingOutgoing: PendingOutgoing | null;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAccountExpanded: (expanded: boolean) => void;
  setComposerDraft: (value: string) => void;
  setSearchQuery: (value: string) => void;
  setRailView: (view: RailView) => void;
  setPendingOutgoing: (value: PendingOutgoing | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  accountExpanded: true,
  composerDraft: "",
  searchQuery: "",
  railView: "tasks",
  pendingOutgoing: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setAccountExpanded: (accountExpanded) => set({ accountExpanded }),
  setComposerDraft: (composerDraft) => set({ composerDraft }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setRailView: (railView) => set({ railView }),
  setPendingOutgoing: (pendingOutgoing) => set({ pendingOutgoing }),
}));
