'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

interface DbUser {
  id: string;
  privyId: string | null;
  email: string;
  username: string;
  walletAddress: string | null;
}

interface AuthContextType {
  /** The database user record (null until synced) */
  user: DbUser | null;
  /** Whether we are still resolving auth state */
  isLoading: boolean;
  /** Whether the user is authenticated via Privy */
  isAuthenticated: boolean;
  /** Open Privy login modal */
  login: () => void;
  /** Log out and clear state */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => { },
  logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout: privyLogout,
    getAccessToken,
  } = usePrivy();
  const { wallets } = useWallets();

  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Sync Privy user to our database on login
  const syncUser = useCallback(async () => {
    if (!authenticated || !privyUser || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    try {
      const token = await getAccessToken();
      const email = privyUser.email?.address || privyUser.google?.email || '';

      // Get the embedded wallet address from Privy
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      const walletAddress = embeddedWallet?.address || privyUser.wallet?.address || '';

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          privyId: privyUser.id,
          email,
          walletAddress,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDbUser(data.data?.user || data.user || null);
      }
    } catch (err) {
      console.error('Failed to sync user:', err);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [authenticated, privyUser, getAccessToken, wallets]);

  useEffect(() => {
    if (ready && authenticated && privyUser && !dbUser && !syncingRef.current) {
      syncUser();
    }
    if (ready && !authenticated) {
      setDbUser(null);
    }
  }, [ready, authenticated, privyUser, dbUser, syncUser]);

  const logout = useCallback(async () => {
    await privyLogout();
    setDbUser(null);
  }, [privyLogout]);

  return (
    <AuthContext.Provider
      value={{
        user: dbUser,
        isLoading: !ready || syncing,
        isAuthenticated: authenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
