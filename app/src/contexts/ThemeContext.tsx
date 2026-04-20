import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  type AppColors,
  getAppColors,
  getNavigationTheme,
  type ResolvedTheme,
  type ThemeMode,
} from '../theme/theme';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: AppColors;
  setMode: (mode: ThemeMode) => void;
  navigationTheme: ReturnType<typeof getNavigationTheme>;
};

const STORAGE_KEY = 'carsmart.theme.mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    void (async () => {
      const storedMode = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
        setModeState(storedMode);
      }
    })();
  }, []);

  const resolvedTheme: ResolvedTheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(() => {
    const colors = getAppColors(resolvedTheme);

    return {
      mode,
      resolvedTheme,
      colors,
      setMode: (nextMode: ThemeMode) => {
        setModeState(nextMode);
        void AsyncStorage.setItem(STORAGE_KEY, nextMode);
      },
      navigationTheme: getNavigationTheme(resolvedTheme),
    };
  }, [mode, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }

  return context;
}
