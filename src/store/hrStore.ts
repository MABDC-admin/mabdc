import { create } from 'zustand';
import type { Employee, ViewType } from '@/types/hr';

interface HRState {
  currentView: ViewType;
  currentEmployee: Employee | null;
  
  setCurrentView: (view: ViewType) => void;
  setCurrentEmployee: (employee: Employee | null) => void;
}

export const useHRStore = create<HRState>((set) => ({
  currentView: 'dashboard',
  currentEmployee: null,

  setCurrentView: (currentView) => set({ currentView }),
  setCurrentEmployee: (currentEmployee) => set({ currentEmployee }),
}));
