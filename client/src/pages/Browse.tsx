import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomerWorkspacePageHeader, CustomerWorkspaceShell } from "@/components/customer/CustomerWorkspaceShell";
import { NavHeader } from "@/components/shared/NavHeader";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowRight, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Browse() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { data: categories, isLoading, isError, error, refetch, isRefetching } = trpc.category.list.useQuery(
    undefined,
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 60_000,
    },
  );

  const filteredCategories = categories?.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const query = searchTerm.trim();
    setLocation(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <div className="min-h-screen bg-[#f7faff]">
      <NavHeader />
      <CustomerWorkspaceShell active="explore">
        <CustomerWorkspacePageHeader
          variant="discovery"
          eyebrow="Explore OlogyCrew"
          title="Browse all services"
          description="Start with a category or describe what you need. We’ll help you find services to book and providers who can prepare a quote."
          actions={(
            <Button asChild className="bg-white text-[#174a73] hover:bg-blue-50">
              <Link href="/search"><Sparkles className="mr-2 h-4 w-4" />Open advanced search</Link>
            </Button>
          )}
        />

        <form onSubmit={submitSearch} className="relative z-10 mx-auto -mt-5 max-w-3xl rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.65)] sm:p-3">
          <div className="flex items-center gap-2">
            <Search className="ml-2 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search categories or describe a service..."
              className="h-11 flex-1 border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search service categories"
            />
            {searchTerm ? (
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchTerm("")} aria-label="Clear category search">
                <X className="h-4 w-4" />
              </Button>
            ) : null}
            <Button type="submit" className="hidden bg-[#156a9a] hover:bg-[#105b86] sm:inline-flex">Find services</Button>
          </div>
        </form>

        <section className="mt-8" aria-labelledby="browse-categories-heading">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Explore by category</p>
              <h2 id="browse-categories-heading" className="mt-1 text-2xl font-bold tracking-tight">Professional services for real needs</h2>
              <p className="mt-1 text-sm text-slate-500">
                {searchTerm ? `Showing categories matching “${searchTerm}”` : "Choose a category to view services, providers, pricing, and availability."}
              </p>
            </div>
            <Link href="/search" className="text-sm font-semibold text-[#174a73] hover:underline">Search providers instead</Link>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-[#156a9a]" />
                <p className="text-slate-500">Loading categories...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50/60 py-14 text-center">
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
              <h3 className="text-lg font-semibold">Unable to load categories</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                {error?.message?.includes("temporarily unavailable")
                  ? "Our servers are experiencing a brief hiccup. This usually resolves in a few seconds."
                  : "Something went wrong while loading categories. Please try again."}
              </p>
              <Button onClick={() => refetch()} disabled={isRefetching} className="mt-5 gap-2">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                {isRefetching ? "Retrying..." : "Try again"}
              </Button>
            </div>
          ) : filteredCategories && filteredCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredCategories.map((category) => (
                <Link key={category.id} href={`/category/${category.slug}`} className="group block h-full">
                  <Card className="h-full rounded-2xl border-slate-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-md">
                    <CardContent className="flex h-full flex-col p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl sm:text-2xl">
                          {CATEGORY_ICONS[category.id] || "📋"}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                      </div>
                      <h3 className="mt-4 text-sm font-bold leading-5 text-slate-950 transition-colors group-hover:text-[#174a73] sm:text-base">{category.name}</h3>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 sm:text-sm">{category.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
              <Search className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <h3 className="font-semibold">No matching categories</h3>
              <p className="mt-1 text-sm text-slate-500">Try a broader phrase, or search all providers and services.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setSearchTerm("")}>Clear search</Button>
                <Button onClick={submitSearch}>Search all services</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 py-14 text-center">
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-amber-600" />
              <h3 className="font-semibold">Categories temporarily unavailable</h3>
              <p className="mt-1 text-sm text-slate-500">We’re having trouble loading service categories. Please try refreshing.</p>
              <Button onClick={() => refetch()} disabled={isRefetching} className="mt-5 gap-2">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                {isRefetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          )}
        </section>
      </CustomerWorkspaceShell>
    </div>
  );
}
