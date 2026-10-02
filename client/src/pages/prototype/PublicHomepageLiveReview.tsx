import React from "react";
import { Link } from "wouter";
import { Footer } from "@/components/shared/Footer";
import PublicHomepageConceptThree from "@/pages/PublicHomepageConceptThree";

// Review-only route for signed-in owners: the root route still opens their workspace.
export default function PublicHomepageLiveReview() {
  return (
    <div className="min-h-screen bg-[#f5f2e9]">
      <aside className="or-live-preview-banner" aria-label="Unpublished public homepage review notice">
        <span><strong>Concept 3 public homepage · Unpublished review</strong> — These categories and provider profiles are live OlogyCrew data. Bookings and payments are not created by this page.</span>
        <nav aria-label="Compare public homepage designs"><Link href="/">Return to my homepage</Link><Link href="/preview/public-home-demo">View original demo comparison</Link></nav>
      </aside>
      <PublicHomepageConceptThree forcePublicHeader />
      <Footer forcePublic compactPublicHome />
    </div>
  );
}
