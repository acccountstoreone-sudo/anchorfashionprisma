import { create } from "zustand";

interface AdminBreadcrumbState {
  dynamicSegmentNames: Record<string, string>;
  setDynamicSegmentName: (segmentId: string, name: string) => void;
  clearDynamicSegmentName: (segmentId: string) => void;
}

export const useAdminBreadcrumbStore = create<AdminBreadcrumbState>((set) => ({
  dynamicSegmentNames: {},
  setDynamicSegmentName: (segmentId, name) =>
    set((state) => ({
      dynamicSegmentNames: {
        ...state.dynamicSegmentNames,
        [segmentId]: name,
      },
    })),
  clearDynamicSegmentName: (segmentId) =>
    set((state) => {
      const newState = { ...state.dynamicSegmentNames };
      delete newState[segmentId];
      return { dynamicSegmentNames: newState };
    }),
}));
