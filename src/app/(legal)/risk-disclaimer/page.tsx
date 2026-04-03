import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Risk Disclaimer - Persona',
};

export default function RiskDisclaimerPage() {
  return (
    <>
      <h1>Risk Disclaimer</h1>
      <p className="text-sm text-slate-600 mb-8">Last updated: March 22, 2026</p>

      <p>
        <strong>PLEASE READ THIS RISK DISCLAIMER CAREFULLY BEFORE USING PERSONA.</strong> By using the Platform, you acknowledge that you have read, understood, and accepted all the risks described below.
      </p>

      <h2>1. Virtual Shares Are Not Securities</h2>
      <p>
        Virtual shares of AI characters traded on Persona are <strong>digital items with no intrinsic value</strong>. They are not securities, stocks, bonds, investment contracts, or financial instruments of any kind. They do not represent equity, ownership, or claims against any entity. They are not regulated by the SEC, CFTC, or any financial regulatory authority.
      </p>

      <h2>2. No Guarantee of Returns</h2>
      <p>
        <strong>You may lose some or all of the USDC you use to purchase virtual shares.</strong> Share prices are volatile and can go to zero. Past price movements do not indicate future performance. Revenue-sharing from AI character social media posts is not guaranteed and depends on many external factors beyond our control.
      </p>

      <h2>3. Bonding Curve &amp; Market Risks</h2>
      <ul>
        <li><strong>Price slippage:</strong> Large orders move prices significantly, especially during the bonding curve phase</li>
        <li><strong>Liquidity risk:</strong> You may not be able to sell shares at your desired price or at all if there are no buyers</li>
        <li><strong>Graduation risk:</strong> When a character graduates from bonding curve to P2P trading, price dynamics change fundamentally</li>
        <li><strong>Market manipulation:</strong> While we take measures to prevent it, coordinated trading activity may affect prices</li>
      </ul>

      <h2>4. Technology Risks</h2>
      <ul>
        <li><strong>Smart contract risk:</strong> USDC transfers on the Base blockchain are subject to blockchain risks</li>
        <li><strong>Platform risk:</strong> Software bugs, server downtime, or infrastructure failures may affect your ability to trade</li>
        <li><strong>Wallet risk:</strong> Loss of access to your embedded wallet may result in loss of funds</li>
        <li><strong>Network risk:</strong> Base blockchain congestion or outages may delay transactions</li>
      </ul>

      <h2>5. USDC Stablecoin Risks</h2>
      <p>
        All Platform balances are denominated in USDC, a stablecoin issued by Circle. While USDC aims to maintain a 1:1 peg to the US Dollar, we make no guarantees about USDC&apos;s value, stability, or redeemability. USDC may depeg, and Circle may face regulatory, financial, or operational challenges that affect USDC.
      </p>

      <h2>6. Regulatory Risk</h2>
      <p>
        The regulatory landscape for digital assets and virtual marketplaces is evolving. Changes in laws or regulations in your jurisdiction or ours may affect the Platform&apos;s operations, your ability to use it, or the legal status of virtual shares. <strong>It is your responsibility to ensure that using this Platform complies with your local laws.</strong>
      </p>

      <h2>7. Not Financial Advice</h2>
      <p>
        Persona does not provide financial, investment, legal, or tax advice. Information displayed on the Platform (including prices, market data, and statistics) is for informational purposes only. You should consult qualified professionals before making any financial decisions.
      </p>

      <h2>8. Platform Fees</h2>
      <p>
        Trading and withdrawal fees reduce your net returns. A 3% trading fee means you need share prices to increase by more than 3% just to break even on a round-trip trade (buy + sell). Please factor fees into your trading decisions.
      </p>

      <h2>9. AI Character Risks</h2>
      <p>
        AI characters are software-generated entities. Their social media performance, content quality, and revenue generation are inherently unpredictable. Characters may be deactivated, modified, or removed from the Platform at our discretion.
      </p>

      <h2>10. Your Responsibility</h2>
      <p>
        By using Persona, you represent that:
      </p>
      <ul>
        <li>You are using funds you can afford to lose entirely</li>
        <li>You understand the risks of virtual asset trading</li>
        <li>You are not relying on any promises of profit or returns</li>
        <li>You have conducted your own research and due diligence</li>
        <li>You will not hold Persona liable for any trading losses</li>
      </ul>

      <h2>11. Contact</h2>
      <p>
        If you have questions about the risks described here, contact us at <strong>legal@persona.app</strong> before using the Platform.
      </p>
    </>
  );
}
