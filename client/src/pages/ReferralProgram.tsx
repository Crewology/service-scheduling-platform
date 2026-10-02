import { useAuth } from "@/_core/hooks/useAuth";
import { formatPrice } from "@shared/formatPrice";
import { OLOGYCREW_PUBLIC_ORIGIN } from "@shared/publicUrls";
import { useEffect } from "react";
import { ArrowRight, Check, Copy, Gift, Share2 } from "lucide-react";
import { Link } from "wouter";
import { NavHeader } from "@/components/shared/NavHeader";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import "./ReferralProgram.css";

const OG_IMAGE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-compressed_d69712f3.jpg";
const META_TAGS = {
  title: "OlogyCrew Referral Program — Share Good Work",
  description: "Share OlogyCrew with someone you know. Earn 10–25% in booking credits when their eligible paid booking is completed, based on the net payment captured.",
  url: "/referral-program",
  image: OG_IMAGE_URL,
};

function useMetaTags() {
  useEffect(() => {
    const tags: Record<string, string> = {
      "og:title": META_TAGS.title,
      "og:description": META_TAGS.description,
      "og:url": `${OLOGYCREW_PUBLIC_ORIGIN}${META_TAGS.url}`,
      "og:type": "website",
      "og:site_name": "OlogyCrew",
      "twitter:card": "summary_large_image",
      "og:image": META_TAGS.image,
      "og:image:width": "1200",
      "og:image:height": "630",
      "twitter:title": META_TAGS.title,
      "twitter:description": META_TAGS.description,
      "twitter:image": META_TAGS.image,
    };
    const prevTitle = document.title;
    document.title = META_TAGS.title;
    const createdElements: HTMLMetaElement[] = [];
    const previous = new Map<HTMLMetaElement, string>();
    Object.entries(tags).forEach(([property, content]) => {
      const attr = property.startsWith("twitter:") ? "name" : "property";
      let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, property);
        document.head.appendChild(el);
        createdElements.push(el);
      } else previous.set(el, el.content);
      el.setAttribute("content", content);
    });
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    const previousCanonical = canonical?.href;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${OLOGYCREW_PUBLIC_ORIGIN}${META_TAGS.url}`);
    return () => {
      document.title = prevTitle;
      createdElements.forEach((el) => el.remove());
      previous.forEach((content, el) => el.setAttribute("content", content));
      if (createdCanonical && canonical) canonical.remove();
      else if (canonical && previousCanonical) canonical.href = previousCanonical;
    };
  }, []);
}

const tiers = [
  { name: "Bronze", percent: 10, range: "0–5 completed referrals" },
  { name: "Silver", percent: 15, range: "6–10 completed referrals" },
  { name: "Gold", percent: 20, range: "11–25 completed referrals" },
  { name: "Platinum", percent: 25, range: "26+ completed referrals" },
] as const;

const faqs = [
  { question: "When do I earn a credit?", answer: "When a referred account completes an eligible paid booking. The reward is calculated from the net amount actually captured at award time, after any recorded refunds. Unpaid, fully refunded, and official demo bookings don't earn credits." },
  { question: "Can I refer someone joining as a provider?", answer: "Yes. You can share a provider invite link from My Referrals. Their signup is tracked, but opening a provider account alone does not earn credits. A credit requires that referred account to complete an eligible paid booking as a customer." },
  { question: "How much will I earn?", answer: "Your tier at the time the credit is awarded determines the rate: 10%, 15%, 20%, or 25% of that booking's net captured payment. A $20 captured deposit, for example, earns $2 at Bronze when the booking qualifies." },
  { question: "Where can I use credits?", answer: "Apply available referral credits toward an eligible booking at checkout. They aren't cash or a payment to a provider." },
  { question: "Do credits expire?", answer: "Yes, 90 days after they're earned. Your available balance and next expiry date are shown in My Referrals. Check there for the current amount." },
];

export default function ReferralProgram() {
  useMetaTags();
  const { isAuthenticated } = useAuth();
  const { data: myCode, isLoading: codeLoading } = trpc.referral.getMyCode.useQuery(undefined, { enabled: isAuthenticated });
  const { data: stats } = trpc.referral.getStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: tierInfo } = trpc.referral.getMyTier.useQuery(undefined, { enabled: isAuthenticated });
  const { data: balance } = trpc.referral.getCreditBalance.useQuery(undefined, { enabled: isAuthenticated });
  const creditAmount = Number(balance?.balance || "0");
  const referralLink = myCode ? `${OLOGYCREW_PUBLIC_ORIGIN}/?ref=${encodeURIComponent(myCode.code)}` : "";

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
    } catch {
      toast.error("Could not copy your link. Select and copy it instead.");
    }
  };

  return (
    <div className="ology-referral">
      <NavHeader />
      <main id="main-content">
        <section className="ology-referral-hero" aria-labelledby="referral-title">
          <div className="ology-referral-wrap ology-referral-hero-grid">
            <div className="ology-referral-intro">
              <p className="ology-referral-kicker"><Gift size={17} aria-hidden="true" /> THE OLOGYCREW REFERRAL PROGRAM</p>
              <h1 id="referral-title">Good work is <em>worth sharing.</em></h1>
              <p className="ology-referral-lede">Know someone who could use OlogyCrew? Invite them in. When they complete an eligible paid booking, you earn credits for your next one.</p>
              <div className="ology-referral-actions">
                {isAuthenticated ? (
                  <>
                    {myCode ? (
                      <div className="ology-referral-copy-field">
                        <label htmlFor="referral-share-link">Your referral link</label>
                        <div className="ology-referral-copy-row">
                          <input id="referral-share-link" type="text" readOnly value={referralLink} onFocus={(event) => event.currentTarget.select()} />
                          <button type="button" onClick={copyLink}><Copy size={17} aria-hidden="true" /> Copy</button>
                        </div>
                      </div>
                    ) : codeLoading ? <p role="status">Getting your referral link…</p> : <Link href="/referrals" className="ology-referral-button">Get your referral link <ArrowRight size={18} aria-hidden="true" /></Link>}
                    <Link href="/referrals" className="ology-referral-text-link">Open My Referrals <ArrowRight size={16} aria-hidden="true" /></Link>
                  </>
                ) : (
                  <Link href="/login?returnTo=%2Freferral-program" className="ology-referral-button">Sign in to get your link <ArrowRight size={18} aria-hidden="true" /></Link>
                )}
              </div>
              <p className="ology-referral-hero-note"><Check size={17} aria-hidden="true" /> Credits are for completed bookings with a captured payment, not just signups.</p>
            </div>
            <div className="ology-referral-art" aria-hidden="true">
              <div className="ology-referral-orbit orbit-one" /><div className="ology-referral-orbit orbit-two" />
              <div className="ology-referral-art-card"><Share2 size={27} strokeWidth={1.5} /><span>One good connection<br />leads to another.</span><b>SHARE THE GOOD WORK</b></div>
            </div>
          </div>
        </section>

        {isAuthenticated && stats && (
          <section className="ology-referral-summary" aria-label="Your referral overview">
            <div className="ology-referral-wrap ology-referral-summary-grid">
              <div><strong>{stats.totalReferrals}</strong><span>Total referrals</span></div>
              <div><strong>{stats.completedReferrals}</strong><span>Completed</span></div>
              <div><strong>{formatPrice(creditAmount)}</strong><span>Available credits</span></div>
              <div><strong>{tierInfo?.currentTier?.name || "Bronze"}</strong><span>Current tier</span></div>
            </div>
          </section>
        )}

        <section className="ology-referral-tiers" aria-labelledby="tiers-title">
          <div className="ology-referral-wrap">
            <div className="ology-referral-section-intro"><p className="ology-referral-kicker">REWARD TIERS</p><h2 id="tiers-title">The more you share, the more you earn.</h2><p>Your tier is based on completed referrals. The percentage applies to net captured payment on the referred account's eligible booking.</p></div>
            <div className="ology-referral-tier-grid">
              {tiers.map((tier, i) => {
                const current = isAuthenticated && tierInfo?.currentTier?.name === tier.name;
                return <article className={`ology-referral-tier ${current ? "is-current" : ""}`} key={tier.name} aria-label={`${tier.name}, ${tier.percent}% credit, ${tier.range}${current ? ", your current tier" : ""}`}>
                  <span className="ology-referral-tier-index">0{i + 1} {current && <b>YOUR TIER</b>}</span>
                  <h3>{tier.name}</h3><strong>{tier.percent}<small>%</small></strong><p>{tier.range}</p>
                </article>;
              })}
            </div>
            {isAuthenticated && tierInfo?.nextTier && <p className="ology-referral-tier-progress"><strong>{tierInfo.referralsToNextTier}</strong> more completed referral{tierInfo.referralsToNextTier !== 1 ? "s" : ""} until {tierInfo.nextTier.name}.</p>}
          </div>
        </section>

        <section className="ology-referral-how" aria-labelledby="how-title">
          <div className="ology-referral-wrap ology-referral-how-grid">
            <div className="ology-referral-section-intro"><p className="ology-referral-kicker">HOW IT WORKS</p><h2 id="how-title">Share a link.<br />Make a connection.</h2><p>A simple way to pass good work along—and earn when a referred account completes an eligible paid booking.</p></div>
            <ol className="ology-referral-steps">
              <li><span>01</span><div><h3>Share your unique link</h3><p>Send it to a friend or fellow professional. You can find separate customer and provider links in My Referrals.</p></div></li>
              <li><span>02</span><div><h3>They join and book</h3><p>A signup is tracked, but the reward is not earned until that account completes an eligible paid booking as a customer.</p></div></li>
              <li><span>03</span><div><h3>Use the credits you earn</h3><p>Your tier rate applies to the net payment captured for that booking. Apply available credits at checkout within 90 days.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="ology-referral-faq" aria-labelledby="faq-title">
          <div className="ology-referral-wrap ology-referral-faq-grid">
            <div><p className="ology-referral-kicker">THE DETAILS</p><h2 id="faq-title">Good to know.</h2><p>Clear answers before you share.</p></div>
            <div className="ology-referral-questions">
              {faqs.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
            </div>
          </div>
        </section>
        <div className="ology-referral-endnote ology-referral-wrap"><p>Ready to share? {isAuthenticated ? <Link href="/referrals">Go to My Referrals <ArrowRight size={16} aria-hidden="true" /></Link> : <Link href="/login?returnTo=%2Freferral-program">Sign in to get your link <ArrowRight size={16} aria-hidden="true" /></Link>}</p></div>
      </main>
    </div>
  );
}
