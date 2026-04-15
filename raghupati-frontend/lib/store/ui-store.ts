import { create } from "zustand";

type UiState = {
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  notificationsOpen: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  setCommandOpen: (value: boolean) => void;
  setNotificationsOpen: (value: boolean) => void;
};

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: false,
  commandOpen: false,
  notificationsOpen: false,
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setCommandOpen: (value) => set({ commandOpen: value }),
  setNotificationsOpen: (value) => set({ notificationsOpen: value }),
}));
