import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Persona',
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-slate-600 mb-8">Last updated: March 22, 2026</p>

      <p>
        Persona (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>Information You Provide</h3>
      <ul>
        <li><strong>Account data:</strong> Email address, username, display name</li>
        <li><strong>Wallet data:</strong> Blockchain wallet addresses (generated via Privy)</li>
        <li><strong>Communications:</strong> Chat messages sent in the Trading Floor and character conversations</li>
      </ul>

      <h3>Information Collected Automatically</h3>
      <ul>
        <li><strong>Usage data:</strong> Pages visited, features used, trading activity, transaction history</li>
        <li><strong>Device data:</strong> Browser type, operating system, IP address</li>
        <li><strong>Blockchain data:</strong> On-chain transaction hashes and wallet balances (inherently public on Base)</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide, maintain, and improve the Platform</li>
        <li>To process trades, deposits, withdrawals, and rewards</li>
        <li>To authenticate your identity via Privy</li>
        <li>To prevent fraud, abuse, and enforce our Terms of Service</li>
        <li>To communicate with you about your account or Platform updates</li>
        <li>To generate aggregated, anonymized analytics</li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <p>We use the following third-party services that may process your data:</p>
      <ul>
        <li><strong>Privy</strong> (authentication &amp; wallet infrastructure) &mdash; <a href="https://privy.io/privacy" target="_blank" rel="noopener noreferrer">Privy Privacy Policy</a></li>
        <li><strong>Vercel</strong> (hosting) &mdash; <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a></li>
        <li><strong>Supabase</strong> (database hosting) &mdash; <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a></li>
        <li><strong>Base (Coinbase L2)</strong> &mdash; Blockchain transactions are publicly visible</li>
      </ul>

      <h2>4. Data Sharing</h2>
      <p>We do <strong>not</strong> sell your personal data to third parties. We may share data:</p>
      <ul>
        <li>With service providers who help operate the Platform (listed above)</li>
        <li>To comply with legal obligations or law enforcement requests</li>
        <li>To protect the rights, property, or safety of Persona or its users</li>
        <li>In connection with a merger, acquisition, or sale of assets (with notice)</li>
      </ul>

      <h2>5. Public Information</h2>
      <p>
        The following information is publicly visible on the Platform: your username, trading activity (buy/sell actions), chat messages in public rooms, and portfolio holdings. Blockchain transactions are inherently public and cannot be made private.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain your personal data for as long as your account is active or as needed to provide services. Trading records and transaction history are retained indefinitely for legal compliance and audit purposes. You may request deletion of your account data (see Section 8).
      </p>

      <h2>7. Security</h2>
      <p>
        We implement industry-standard security measures including encrypted connections (HTTPS/TLS), secure authentication via Privy, parameterized database queries, rate limiting, and security headers. However, no system is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>8. Your Rights (GDPR &amp; CCPA)</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li><strong>Access</strong> the personal data we hold about you</li>
        <li><strong>Correct</strong> inaccurate or incomplete data</li>
        <li><strong>Delete</strong> your personal data (right to erasure / right to be forgotten)</li>
        <li><strong>Export</strong> your data in a portable format</li>
        <li><strong>Opt out</strong> of non-essential data processing</li>
        <li><strong>Withdraw consent</strong> for data processing</li>
      </ul>
      <p>
        To exercise these rights, contact us at <strong>privacy@persona.app</strong>. We will respond within 30 days.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use essential cookies for authentication (Privy session tokens). We may use analytics cookies with your consent. You can manage cookie preferences through your browser settings or our cookie consent banner.
      </p>

      <h2>10. Children&apos;s Privacy</h2>
      <p>
        The Platform is not intended for users under 18 years of age. We do not knowingly collect personal data from minors. If we learn that we have collected data from a minor, we will delete it promptly.
      </p>

      <h2>11. International Data Transfers</h2>
      <p>
        Your data may be transferred to and processed in the United States. By using the Platform, you consent to this transfer. We ensure appropriate safeguards are in place for international data transfers.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes through the Platform. The &quot;Last updated&quot; date at the top reflects the most recent revision.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        For privacy-related inquiries, contact us at <strong>privacy@persona.app</strong>.
      </p>
    </>
  );
}
