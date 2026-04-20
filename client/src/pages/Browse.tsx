import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Filter, RefreshCw, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { NavHeader } from "@/components/shared/NavHeader";

export default function Browse() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: categories, isLoading, isError, error, refetch, isRefetching } = trpc.category.list.useQuery(
    undefined,
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 60_000,
    }
  );

  const filteredCategories = categories?.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      {/* Page Header */}
      <section className="py-12 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">Browse All Services</h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8">
            Explore 42+ professional service categories
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="flex gap-2 shadow-medium rounded-lg bg-white p-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search services..."
                  className="pl-10 border-0 focus-visible:ring-0 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-12">
        <div className="container">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading categories...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Unable to Load Categories</h3>
                <p className="text-muted-foreground mb-4">
                  {error?.message?.includes("temporarily unavailable")
                    ? "Our servers are experiencing a brief hiccup. This usually resolves in a few seconds."
                    : "Something went wrong while loading categories. Please try again."}
                </p>
                <Button
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                  {isRefetching ? "Retrying..." : "Try Again"}
                </Button>
              </div>
            </div>
          ) : filteredCategories && filteredCategories.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredCategories.map((category) => (
                <Link key={category.id} href={`/category/${category.slug}`}>
                  <Card className="hover:shadow-medium transition-all cursor-pointer group h-full">
                    <CardHeader>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {category.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {category.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.isMobileEnabled && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Mobile
                          </span>
                        )}
                        {category.isFixedLocationEnabled && (
                          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                            In-Shop
                          </span>
                        )}
                        {category.isVirtualEnabled && (
                          <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                            Virtual
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No categories found matching "{searchTerm}".</p>
              <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2">
                Clear search
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Categories Temporarily Unavailable</h3>
                <p className="text-muted-foreground mb-4">
                  We're having trouble loading the service categories. Please try refreshing.
                </p>
                <Button
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                  {isRefetching ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
