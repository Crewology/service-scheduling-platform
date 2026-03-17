import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, MapPin, Filter } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { NavHeader } from "@/components/shared/NavHeader";

export default function Browse() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: categories, isLoading } = trpc.category.list.useQuery();

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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Browse All Services</h1>
          <p className="text-xl text-muted-foreground mb-8">
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
              <p className="text-muted-foreground">Loading categories...</p>
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
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No categories found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
