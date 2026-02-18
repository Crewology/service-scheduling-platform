import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { MapPin, Star, Clock, DollarSign, ArrowLeft } from "lucide-react";
import { Link, useParams } from "wouter";

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: category } = trpc.category.getBySlug.useQuery({ slug: slug! });
  const { data: services } = trpc.service.listByCategory.useQuery(
    { categoryId: category?.id! },
    { enabled: !!category?.id }
  );

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <a className="text-2xl font-bold gradient-text">SkillLink</a>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Page Header */}
      <section className="py-12 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container">
          <Link href="/browse">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Browse
            </Button>
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{category.name}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            {category.description}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {category.isMobileEnabled && (
              <Badge variant="secondary" className="text-sm">Mobile Services Available</Badge>
            )}
            {category.isFixedLocationEnabled && (
              <Badge variant="secondary" className="text-sm">In-Shop Services Available</Badge>
            )}
            {category.isVirtualEnabled && (
              <Badge variant="secondary" className="text-sm">Virtual Services Available</Badge>
            )}
          </div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-12">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6">Available Services</h2>
          
          {!services || services.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No services available in this category yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Link key={service.id} href={`/service/${service.id}`}>
                  <Card className="hover:shadow-medium transition-all cursor-pointer group h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {service.name}
                        </CardTitle>
                        <Badge variant="outline" className="flex-shrink-0">
                          {service.serviceType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {service.description}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        {service.pricingModel === 'fixed' && service.basePrice && (
                          <div className="flex items-center gap-2 text-primary font-semibold">
                            <DollarSign className="h-4 w-4" />
                            <span>${service.basePrice}</span>
                          </div>
                        )}
                        
                        {service.pricingModel === 'hourly' && service.hourlyRate && (
                          <div className="flex items-center gap-2 text-primary font-semibold">
                            <DollarSign className="h-4 w-4" />
                            <span>${service.hourlyRate}/hour</span>
                          </div>
                        )}
                        
                        {service.durationMinutes && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{service.durationMinutes} minutes</span>
                          </div>
                        )}
                      </div>
                      
                      <Button className="w-full mt-4" variant="outline">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
