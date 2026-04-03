import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Persona',
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-sm text-slate-600 mb-8">Last updated: March 22, 2026</p>

      <p>
        Welcome to Persona (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using our platform at persona-test-omega.vercel.app or any associated domains, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Platform.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least <strong>18 years of age</strong> (or the legal age of majority in your jurisdiction) to use this Platform. By using Persona, you represent and warrant that you meet this requirement and have the legal capacity to enter into these Terms.
      </p>

      <h2>2. Nature of the Platform</h2>
      <p>
        Persona allows users to buy and sell virtual shares of AI-generated characters using USDC (a stablecoin) on the Base blockchain. <strong>These virtual shares are not securities, equity, tokens, or financial instruments.</strong> They do not represent ownership in any company, entity, or real-world asset. They confer no voting rights, dividends, or governance rights.
      </p>
      <p>
        Share prices are determined by the Platform&apos;s bonding curve algorithm or peer-to-peer market activity. Prices can and will fluctuate. <strong>Shares may lose all their value.</strong>
      </p>

      <h2>3. Account &amp; Wallet</h2>
      <p>
        Authentication is provided through Privy, a third-party service. You are responsible for maintaining the security of your account credentials and embedded wallet. We are not responsible for unauthorized access to your account.
      </p>
      <p>
        You agree to provide accurate information during registration and to keep your account details up to date.
      </p>

      <h2>4. Platform Fees</h2>
      <p>The following fees apply to Platform activity:</p>
      <ul>
        <li><strong>Trading fee (Bonding Curve):</strong> 3% on each buy or sell transaction</li>
        <li><strong>Trading fee (P2P Market):</strong> 1.5% per side (3% total per trade)</li>
        <li><strong>Withdrawal fee:</strong> 2% of the withdrawal amount (minimum $1.00 USDC)</li>
        <li><strong>Tipping fee:</strong> 10% platform cut on tips sent between users</li>
      </ul>
      <p>
        We reserve the right to modify fee structures with reasonable notice. Continued use of the Platform after fee changes constitutes acceptance.
      </p>

      <h2>5. No Financial Advice</h2>
      <p>
        Nothing on this Platform constitutes financial, investment, legal, or tax advice. We do not recommend buying or selling any virtual shares. All trading decisions are made at your own risk and discretion. You should consult a qualified professional before making any financial decisions.
      </p>

      <h2>6. Risks</h2>
      <p>By using the Platform, you acknowledge and accept the following risks:</p>
      <ul>
        <li>Virtual share prices may go to zero</li>
        <li>The bonding curve and market mechanisms may result in losses</li>
        <li>Blockchain transactions are irreversible</li>
        <li>Smart contract or platform software may contain bugs</li>
        <li>Regulatory changes could affect Platform operations</li>
        <li>USDC stablecoin may depeg or face issues beyond our control</li>
      </ul>
      <p>
        See our <a href="/risk-disclaimer">Risk Disclaimer</a> for full details.
      </p>

      <h2>7. Prohibited Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Platform for money laundering, fraud, or other illegal activities</li>
        <li>Attempt to manipulate prices through wash trading or coordinated schemes</li>
        <li>Use bots, scrapers, or automated tools to abuse Platform functionality</li>
        <li>Harass, threaten, or abuse other users</li>
        <li>Circumvent rate limits, security measures, or access controls</li>
        <li>Create multiple accounts to exploit rewards or bonuses</li>
      </ul>

      <h2>8. Intellectual Property</h2>
      <p>
        All AI characters, their names, likenesses, personalities, generated content, and associated media are the intellectual property of Persona. Purchasing virtual shares does not grant you any intellectual property rights over the characters.
      </p>

      <h2>9. Account Suspension &amp; Termination</h2>
      <p>
        We reserve the right to suspend or terminate your account at any time, with or without cause, including for violation of these Terms. Upon termination, you may withdraw any remaining USDC balance (minus applicable fees), but share holdings may be liquidated at current market prices at our discretion.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        <strong>THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND.</strong> To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or funds, arising from your use of the Platform.
      </p>
      <p>
        Our total liability for any claim arising from these Terms or the Platform shall not exceed the amount of fees you paid to us in the 12 months preceding the claim.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless Persona, its affiliates, officers, directors, employees, and agents from any claims, losses, damages, liabilities, and expenses (including legal fees) arising from your use of the Platform or violation of these Terms.
      </p>

      <h2>12. Modifications</h2>
      <p>
        We may update these Terms at any time. Material changes will be communicated through the Platform. Your continued use after changes take effect constitutes acceptance of the updated Terms.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
      </p>

      <h2>14. Contact</h2>
      <p>
        For questions about these Terms, contact us at <strong>legal@persona.app</strong>.
      </p>
    </>
  );
}
