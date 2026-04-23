import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  commandOpen: boolean;
  notificationsOpen: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (value: number) => void;
  setCommandOpen: (value: boolean) => void;
  setNotificationsOpen: (value: boolean) => void;
};

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const COLLAPSED_WIDTH = 72;

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      commandOpen: false,
      notificationsOpen: false,
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarWidth: (value) => {
        const width = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, value));
        set({ sidebarWidth: width, sidebarCollapsed: false });
      },
      setCommandOpen: (value) => set({ commandOpen: value }),
      setNotificationsOpen: (value) => set({ notificationsOpen: value }),
    }),
    {
      name: "raghupati-ui-store",
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth 
      }),
    }
  )
);

export const getSidebarWidth = () => DEFAULT_SIDEBAR_WIDTH;
export const getMinSidebarWidth = () => MIN_SIDEBAR_WIDTH;
export const getMaxSidebarWidth = () => MAX_SIDEBAR_WIDTH;
export const getCollapsedWidth = () => COLLAPSED_WIDTH;
