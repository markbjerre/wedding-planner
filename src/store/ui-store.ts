import { create } from 'zustand';

/** Mobile overlays: sidebar + shape palette as drawers. */
interface UiState {
  mobileSidebarOpen: boolean;
  mobileToolsOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  setMobileToolsOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  toggleMobileTools: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileSidebarOpen: false,
  mobileToolsOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setMobileToolsOpen: (open) => set({ mobileToolsOpen: open }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  toggleMobileTools: () => set((s) => ({ mobileToolsOpen: !s.mobileToolsOpen })),
}));
