import { Facebook, Link2, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { ologyCrewPublicUrl } from "@shared/publicUrls";

const siteUrl = ologyCrewPublicUrl("/");
const encodedSiteUrl = encodeURIComponent(siteUrl);

export function FooterSocialShare() {
  const copySiteLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      toast.success("OlogyCrew link copied");
    } catch {
      toast.error("Copy unavailable. Share https://ologycrew.com/ instead.");
    }
  };

  return (
    <div className="ology-footer-social" role="group" aria-label="Share OlogyCrew">
      <p className="ology-footer-social-label">Share OlogyCrew</p>
      <div className="ology-footer-social-actions">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedSiteUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share OlogyCrew on Facebook (opens new tab)"
          title="Share on Facebook"
        >
          <Facebook size={19} aria-hidden="true" />
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedSiteUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share OlogyCrew on LinkedIn (opens new tab)"
          title="Share on LinkedIn"
        >
          <Linkedin size={19} aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={copySiteLink}
          aria-label="Copy OlogyCrew homepage link"
          title="Copy homepage link"
        >
          <Link2 size={19} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
