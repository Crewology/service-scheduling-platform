import { trpc } from "@/lib/trpc";
import NavHeader from "@/components/shared/NavHeader";
import { Link } from "wouter";
import { Clock, Users, MapPin, Star } from "lucide-react";

export default function Experiences() {
  const { data: experiences, isLoading } = trpc.service.listExperiences.useQuery();

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <span className="text-4xl mb-4 block">🎉</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Experiences & Events
          </h1>
          <p className="text-lg md:text-xl text-purple-100 max-w-2xl mx-auto">
            Unique curated experiences hosted by local experts — tastings, workshops, classes, tours, and private events.
          </p>
          <p className="text-sm text-purple-200 mt-4">
            Book something memorable. Support local creators.
          </p>
        </div>
      </section>

      {/* Experiences Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-48 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : experiences && experiences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp) => (
              <Link key={exp.id} href={`/service/${exp.id}`}>
                <div className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group border border-border/50">
                  {/* Image placeholder / gradient */}
                  <div className="h-48 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 relative flex items-center justify-center">
                    <span className="text-6xl opacity-60 group-hover:scale-110 transition-transform">🎉</span>
                    {exp.pricePerPerson && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                        ${parseFloat(exp.pricePerPerson).toFixed(0)}/person
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {exp.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <span className="font-medium">{exp.businessName}</span>
                      {exp.providerCity && (
                        <>
                          <MapPin className="w-3 h-3 ml-1" />
                          <span>{exp.providerCity}, {exp.providerState}</span>
                        </>
                      )}
                    </p>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {exp.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      {exp.durationMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {exp.durationMinutes >= 60
                            ? `${Math.floor(exp.durationMinutes / 60)}h${exp.durationMinutes % 60 > 0 ? ` ${exp.durationMinutes % 60}m` : ""}`
                            : `${exp.durationMinutes}m`}
                        </span>
                      )}
                      {exp.maxCapacity > 1 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Up to {exp.maxCapacity} guests
                        </span>
                      )}
                      {exp.basePrice && parseFloat(exp.basePrice) > 0 && !exp.pricePerPerson && (
                        <span className="font-semibold text-foreground">
                          ${parseFloat(exp.basePrice).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <span className="text-6xl block mb-4">🎉</span>
            <h2 className="text-2xl font-bold text-foreground mb-2">Experiences Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Local experts are crafting unique experiences for you — tastings, workshops, classes, and more. Check back soon!
            </p>
            <p className="text-sm text-muted-foreground">
              Are you a provider?{" "}
              <Link href="/provider/onboarding" className="text-primary hover:underline font-medium">
                List your experience
              </Link>
            </p>
          </div>
        )}
      </section>

      {/* CTA for providers */}
      {experiences && experiences.length > 0 && (
        <section className="bg-muted/50 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Host Your Own Experience</h2>
            <p className="text-muted-foreground mb-6">
              Share your passion with others. Whether it's a tequila tasting, cooking class, photography walk, or wellness retreat — list it on OlogyCrew.
            </p>
            <Link href="/provider/onboarding">
              <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Become a Host
              </button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
