'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { AuthProvider } from '@/lib/auth/auth-context';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
            config={{
                loginMethods: ['email', 'wallet', 'google', 'twitter'],
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
            }}
        >
            <AuthProvider>
                {children}
            </AuthProvider>
        </PrivyProvider>
    );
}
