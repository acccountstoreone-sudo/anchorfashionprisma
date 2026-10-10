import { create } from "zustand";

interface UIState {
  isSearchOpen: boolean;
  isMobileMenuOpen: boolean;
  toggleSearch: (isOpen?: boolean) => void;
  toggleMobileMenu: (isOpen?: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSearchOpen: false,
  isMobileMenuOpen: false,
  toggleSearch: (isOpen) =>
    set((state) => ({
      isSearchOpen: isOpen !== undefined ? isOpen : !state.isSearchOpen,
    })),
  toggleMobileMenu: (isOpen) =>
    set((state) => ({
      isMobileMenuOpen: isOpen !== undefined ? isOpen : !state.isMobileMenuOpen,
    })),
}));
