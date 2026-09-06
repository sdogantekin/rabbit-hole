import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  selectedCategorySlugs: string[];
  setSelectedCategorySlugs: (slugs: string[]) => void;
  reset: () => void;
}

// Holds interest selection locally until an account exists to save it against, and
// survives an app relaunch mid-onboarding so a user doesn't lose their picks.
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      selectedCategorySlugs: [],
      setSelectedCategorySlugs: (slugs) => set({ selectedCategorySlugs: slugs }),
      reset: () => set({ selectedCategorySlugs: [] }),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
