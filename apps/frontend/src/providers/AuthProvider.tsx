import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { clearStoredSession, readStoredSession, writeStoredSession } from "../utils/auth-storage";
import { AuthSession } from "../types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (nextSession: AuthSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  useEffect(() => {
    if (!session) {
      clearStoredSession();
      return;
    }

    writeStoredSession(session);
  }, [session]);

  const value: AuthContextValue = {
    session,
    isAuthenticated: Boolean(session?.accessToken),
    login: (nextSession) => {
      setSession(nextSession);
    },
    logout: () => {
      setSession(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};
