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
  displayName: string | null;
  walletAddress: string | null;
  hasSetUsername: boolean;
}

interface AuthContextType {
  /** The database user record (null until synced) */
  user: DbUser | null;
  /** Whether we are still resolving auth state */
  isLoading: boolean;
  /** Whether the user is authenticated via Privy */
  isAuthenticated: boolean;
  /** Platform USDC balance */
  balance: number | null;
  /** Total portfolio value (sum of all holdings) */
  portfolioValue: number | null;
  /** Whether user needs to set their username */
  needsOnboarding: boolean;
  /** Open Privy login modal */
  login: () => void;
  /** Log out and clear state */
  logout: () => Promise<void>;
  /** Force refresh balance from server */
  refreshBalance: () => Promise<void>;
  /** Force refresh user data from server */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  balance: null,
  portfolioValue: null,
  needsOnboarding: false,
  login: () => { },
  logout: async () => { },
  refreshBalance: async () => { },
  refreshUser: async () => { },
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
  const [balance, setBalance] = useState<number | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const balanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        const u = data.data?.user || data.user || null;
        if (u) {
          setDbUser({
            id: u.id,
            privyId: u.privyId,
            email: u.email,
            username: u.username,
            displayName: u.displayName || null,
            walletAddress: u.walletAddress || null,
            hasSetUsername: u.hasSetUsername ?? false,
          });

          // Auto-apply referral code if stored from signup link
          try {
            const storedRef = localStorage.getItem('persona_referral_code');
            if (storedRef) {
              localStorage.removeItem('persona_referral_code');
              const refToken = await getAccessToken();
              if (refToken) {
                fetch('/api/referrals', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${refToken}`,
                  },
                  body: JSON.stringify({ referralCode: storedRef }),
                }).catch(() => { /* ignore referral errors */ });
              }
            }
          } catch {
            // localStorage not available
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync user:', err);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [authenticated, privyUser, getAccessToken, wallets]);

  const fetchBalance = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/wallet/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.data?.platformBalance ?? data.platformBalance ?? null);
      }
    } catch {
      // silent
    }
  }, [authenticated, getAccessToken]);

  const fetchPortfolioValue = useCallback(async () => {
    if (!authenticated || !dbUser?.id) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/users/${dbUser.id}/holdings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const holdings = data.data || data || [];
        const total = holdings.reduce((sum: number, h: { totalValue: number }) => sum + h.totalValue, 0);
        setPortfolioValue(total);
      }
    } catch {
      // silent
    }
  }, [authenticated, dbUser?.id, getAccessToken]);

  const refreshUser = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.data || data;
        setDbUser(prev => prev ? {
          ...prev,
          username: u.username,
          displayName: u.displayName || null,
          hasSetUsername: u.hasSetUsername ?? false,
        } : prev);
      }
    } catch {
      // silent
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (ready && authenticated && privyUser && !dbUser && !syncingRef.current) {
      syncUser();
    }
    if (ready && !authenticated) {
      setDbUser(null);
      setBalance(null);
      setPortfolioValue(null);
    }
  }, [ready, authenticated, privyUser, dbUser, syncUser]);

  // Fetch balance + portfolio after user syncs, then poll every 15s
  useEffect(() => {
    if (dbUser && authenticated) {
      fetchBalance();
      fetchPortfolioValue();
      balanceIntervalRef.current = setInterval(() => {
        fetchBalance();
        fetchPortfolioValue();
      }, 15000);
    }
    return () => {
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
    };
  }, [dbUser, authenticated, fetchBalance, fetchPortfolioValue]);

  const logout = useCallback(async () => {
    await privyLogout();
    setDbUser(null);
    setBalance(null);
    setPortfolioValue(null);
    if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
  }, [privyLogout]);

  const needsOnboarding = !!(dbUser && !dbUser.hasSetUsername);

  return (
    <AuthContext.Provider
      value={{
        user: dbUser,
        isLoading: !ready || syncing,
        isAuthenticated: authenticated,
        balance,
        portfolioValue,
        needsOnboarding,
        login,
        logout,
        refreshBalance: fetchBalance,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
