import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { auth, firebaseConfigError } from '../config/firebase';

type AuthContextValue = {
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  firebaseConfigError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  isAuthenticated: false,
  isLoading: false,
  firebaseConfigError,
  signIn: async () => Promise.resolve(),
  signUp: async () => Promise.resolve(),
  signOut: async () => Promise.resolve(),
});

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      userId,
      isAuthenticated: Boolean(userId),
      isLoading,
      firebaseConfigError,
      signIn: async (email: string, password: string) => {
        if (!auth) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured');
        }

        await signInWithEmailAndPassword(auth, email, password);
      },
      signUp: async (email: string, password: string) => {
        if (!auth) {
          throw new Error(firebaseConfigError ?? 'Firebase is not configured');
        }

        await createUserWithEmailAndPassword(auth, email, password);
      },
      signOut: async () => {
        if (!auth) {
          return;
        }

        await firebaseSignOut(auth);
      },
    }),
    [isLoading, userId],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
