'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { base } from 'viem/chains';
import { AuthProvider } from '@/lib/auth/auth-context';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
            config={{
                loginMethods: ['email'],
                appearance: {
                    theme: 'dark',
                    accentColor: '#6366f1',
                    logo: '/persona-logo.svg',
                },
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'users-without-wallets',
                    },
                },
                defaultChain: base,
                supportedChains: [base],
            }}
        >
            <AuthProvider>
                {children}
            </AuthProvider>
        </PrivyProvider>
    );
}
