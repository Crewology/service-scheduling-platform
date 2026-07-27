import { Lock } from "lucide-react";

interface PaymentMethodsProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showSecure?: boolean;
  className?: string;
}

function VisaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <path d="M20.5 21.5h-3.2l2-12.3h3.2l-2 12.3zm13.2-12c-.6-.3-1.6-.5-2.9-.5-3.2 0-5.4 1.7-5.4 4.1 0 1.8 1.6 2.8 2.8 3.4 1.2.6 1.6 1 1.6 1.5 0 .8-1 1.2-1.9 1.2-1.2 0-1.9-.2-2.9-.6l-.4-.2-.4 2.6c.7.3 2.1.6 3.5.6 3.4 0 5.5-1.7 5.5-4.2 0-1.4-.8-2.5-2.7-3.3-1.1-.6-1.8-.9-1.8-1.5 0-.5.6-1 1.8-1 1-.1 1.8.2 2.4.4l.3.1.5-2.6zm8.3-.3h-2.5c-.8 0-1.3.2-1.7 1l-4.7 11.3h3.4l.7-1.9h4.1l.4 1.9H45l-2.9-12.3zm-4.1 7.9c.3-.7 1.3-3.5 1.3-3.5l.2-.5.3 1.4.7 3.6h-2.7l.2-1zm-22.4-7.9l-3 8.4-.3-1.6c-.6-1.9-2.3-4-4.2-5l2.9 10.9h3.4l5.1-12.7h-3.9z" fill="white" />
      <path d="M14.1 9.2h-5.2l-.1.3c4 1 6.7 3.5 7.8 6.5l-1.1-5.7c-.2-.8-.8-1-1.4-1.1z" fill="#F9A533" />
    </svg>
  );
}

function MastercardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" />
      <path d="M24 10.3c1.9 1.4 3.1 3.6 3.1 6.1s-1.2 4.7-3.1 6.1c-1.9-1.4-3.1-3.6-3.1-6.1s1.2-4.7 3.1-6.1z" fill="#FF5F00" />
    </svg>
  );
}

function AmexIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#006FCF" />
      <path d="M7 14l2.5-6h3l2.5 6h-2.5l-.5-1.2h-2.5L9 14H7zm3.5-4.5l-.8 2h1.6l-.8-2zM16 14V8h3.5l1.5 3 1.5-3H26v6h-2v-4.2L22.2 14h-1.4L19 9.8V14h-3zm11 0V8h6v1.5h-4v.8h3.8v1.4H33v.8h4V14h-6z" fill="white" />
      <path d="M7 18l2.5-6h3l2.5 6h-2.5l-.5-1.2h-2.5L9 18H7zm3.5-4.5l-.8 2h1.6l-.8-2zM16 18v-6h3.2l1.8 2.5 1.8-2.5H26v6h-2v-4l-1.8 2.5h-1.4L19 14v4h-3zm15 0l-3-3 3-3h2.5l-3 3 3 3H31z" fill="white" transform="translate(0, 6)" />
    </svg>
  );
}

function ApplePayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#000000" />
      <path d="M15.2 10.8c-.5.6-1.3 1.1-2.1 1-.1-.8.3-1.7.7-2.2.5-.6 1.4-1 2-.1.1.9-.2 1.7-.6 2.3zm.6 1.2c-1.2-.1-2.2.7-2.7.7-.5 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.1-.3 5.3.9 7 .6.9 1.3 1.8 2.2 1.8.9 0 1.2-.6 2.3-.6 1.1 0 1.3.6 2.3.6.9 0 1.6-.9 2.2-1.8.7-1 .9-2 .9-2-.1 0-1.8-.7-1.8-2.7 0-1.7 1.4-2.5 1.4-2.5-.8-1.1-2-1.3-2.4-1.3l-.1-.4z" fill="white" />
      <path d="M22 13.5h2.6c1.8 0 3 1.2 3 3s-1.2 3-3 3h-1.6v3.1H22v-9.1zm1 1v4h1.4c1.2 0 1.9-.7 1.9-2s-.7-2-1.9-2H23zm6.5 5.7c0-1.2.9-1.9 2.6-2l1.9-.1v-.5c0-.8-.5-1.2-1.4-1.2-.8 0-1.3.4-1.4.9h-.9c.1-1.1 1-1.8 2.4-1.8 1.4 0 2.3.7 2.3 1.9v4.1h-1v-.9c-.4.6-1.1 1-2 1-1.2 0-2.1-.7-2.1-1.8l.6.4zm4.5-.6v-.5l-1.7.1c-.9.1-1.4.4-1.4 1s.5.9 1.2.9c1 0 1.9-.6 1.9-1.5zm2.2 3.2c.3.2.6.3 1 .3.7 0 1.1-.3 1.4-1.1l.2-.5-2.3-6h1.1l1.7 5.2 1.7-5.2h1.1l-2.4 6.4c-.5 1.3-1 1.7-2.2 1.7-.3 0-.5 0-.7-.1l.4-.7z" fill="white" />
    </svg>
  );
}

function GooglePayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      <path d="M22.8 16.3v3.1h-1V11h2.7c.7 0 1.3.2 1.8.7.5.5.7 1 .7 1.7 0 .7-.2 1.3-.7 1.7-.5.5-1.1.7-1.8.7h-1.7v.5zm0-4.3v3.3h1.7c.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.2 0-.4-.2-.8-.5-1.1-.3-.3-.7-.5-1.2-.5h-1.7z" fill="#3C4043" />
      <path d="M29.5 13.5c.7 0 1.3.2 1.7.6.4.4.6 1 .6 1.7v3.6h-1v-.8c-.3.6-.9.9-1.6.9-.6 0-1.1-.2-1.5-.5-.4-.3-.6-.8-.6-1.3 0-.5.2-1 .6-1.3.4-.3.9-.5 1.6-.5.6 0 1 .1 1.4.4v-.3c0-.4-.2-.8-.5-1-.3-.3-.7-.4-1.1-.4-.6 0-1.1.3-1.4.8l-.8-.5c.5-.7 1.2-1 2.2-1l-.6-.4zm-1.2 4.6c0 .3.1.5.4.7.2.2.5.3.8.3.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.1-.3-.3-.8-.4-1.3-.4-.4 0-.8.1-1.1.3-.3.2-.5.4-.5.7z" fill="#3C4043" />
      <path d="M36.3 13.7l-3.4 7.8h-1l1.3-2.7-2.2-5.1h1.1l1.6 3.9 1.6-3.9h1z" fill="#3C4043" />
      <path d="M17.8 15.8c0-.3 0-.6-.1-.9h-4.4v1.7h2.5c-.1.6-.4 1.1-.9 1.4v1.2h1.4c.9-.8 1.4-2 1.4-3.4z" fill="#4285F4" />
      <path d="M13.3 19.4c1.2 0 2.2-.4 2.9-1.1l-1.4-1.1c-.4.3-.9.4-1.5.4-1.2 0-2.1-.8-2.5-1.8H9.4v1.1c.7 1.5 2.2 2.5 3.9 2.5z" fill="#34A853" />
      <path d="M11.3 15.8c-.1-.3-.2-.6-.2-.9s.1-.6.2-.9v-1.1H9.9c-.3.7-.5 1.4-.5 2.1 0 .7.2 1.4.5 2.1l1.4-1.3z" fill="#FBBC05" />
      <path d="M13.3 12.2c.6 0 1.2.2 1.7.7l1.2-1.3c-.8-.7-1.8-1.1-2.9-1.1-1.7 0-3.2 1-3.9 2.5l1.4 1.1c.4-1.1 1.3-1.9 2.5-1.9z" fill="#EA4335" />
    </svg>
  );
}

function StripeLinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#00D66F" />
      <path d="M16 12h2v8h-2v-8zm4 2.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v5.5h-2v-5c0-.3-.2-.5-.5-.5s-.5.2-.5.5v5h-2v-5.5c0-.8.7-1.5 1.5-1.5h.5zm5 0c0-.8.7-1.5 1.5-1.5h.5v2h-.5c-.3 0-.5.2-.5.5v4.5h-2v-5.5h1zm4 0c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v4c0 .8-.7 1.5-1.5 1.5h-1v-2h.5c.3 0 .5-.2.5-.5v-3c0-.3-.2-.5-.5-.5s-.5.2-.5.5v.5h-2v-1h1.5zm-13-2.5c-.8 0-1.5.7-1.5 1.5v5.5h2v-5c0-.3.2-.5.5-.5s.5.2.5.5v5h2v-5.5c0-.8-.7-1.5-1.5-1.5h-2z" fill="white" />
      <text x="24" y="20" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">Link</text>
    </svg>
  );
}

export function PaymentMethods({ size = "md", showLabel = true, showSecure = true, className = "" }: PaymentMethodsProps) {
  const iconSize = size === "sm" ? "h-5 w-8" : size === "lg" ? "h-8 w-12" : "h-6 w-9";
  const gapSize = size === "sm" ? "gap-1" : size === "lg" ? "gap-2.5" : "gap-1.5";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-1.5 mb-1.5">
          {showSecure && <Lock className="w-3 h-3 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground font-medium">Secure payments powered by Stripe</span>
        </div>
      )}
      <div className={`flex items-center flex-wrap justify-center ${gapSize}`}>
        <VisaIcon className={iconSize} />
        <MastercardIcon className={iconSize} />
        <AmexIcon className={iconSize} />
        <ApplePayIcon className={iconSize} />
        <GooglePayIcon className={iconSize} />
        <StripeLinkIcon className={iconSize} />
      </div>
    </div>
  );
}
