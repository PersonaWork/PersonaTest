'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { AuthProvider } from '@/lib/auth/auth-context';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <PrivyProvider
                appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cl-123'}
                config={{
                    loginMethods: ['email'],
                    appearance: {
                        theme: 'dark',
                        accentColor: '#7c3aed',
                        logo: '/persona-logo.svg',
                    },
                    embeddedWallets: {
                        ethereum: {
                            createOnLogin: 'off',
                        },
                    },
                }}
            >
                {children}
            </PrivyProvider>
        </AuthProvider>
    );
}
