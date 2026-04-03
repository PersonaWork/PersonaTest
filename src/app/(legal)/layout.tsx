import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Persona
        </Link>
        <article className="prose prose-invert prose-slate max-w-none
          prose-headings:font-display prose-headings:tracking-tight
          prose-h1:text-3xl prose-h1:font-black prose-h1:mb-2
          prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-lg prose-h3:font-semibold
          prose-p:text-slate-400 prose-p:leading-relaxed
          prose-li:text-slate-400
          prose-strong:text-white
          prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:text-indigo-300
        ">
          {children}
        </article>
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-wrap gap-6 text-xs text-slate-600">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/risk-disclaimer" className="hover:text-white transition-colors">Risk Disclaimer</Link>
        </div>
      </div>
    </div>
  );
}
