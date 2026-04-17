import { Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** If provided, the back button navigates here. Otherwise uses browser history. */
  backHref?: string;
  backLabel?: string;
  /** Right-side action slot */
  actions?: React.ReactNode;
  /** Hide the back button entirely (e.g., top-level pages) */
  hideBack?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  backHref,
  backLabel,
  actions,
  hideBack = false,
}: PageHeaderProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (backHref) {
      navigate(backHref);
    } else {
      window.history.back();
    }
  };

  return (
    <div className="bg-white border-b">
      <div className="container py-4 sm:py-5">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 sm:mb-3">
            <ol className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
                  <Home className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
              </li>
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium truncate max-w-[200px]">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Title row with back button and actions */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {!hideBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted"
                aria-label={backLabel || "Go back"}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
