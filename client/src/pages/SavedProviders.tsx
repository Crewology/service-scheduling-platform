import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Heart, Star, MapPin, ArrowLeft, Loader2, Crown, Zap, Sparkles, BarChart3,
  FolderPlus, Folder, FolderOpen, MoreVertical, Pencil, Trash2,
  MoveRight, X, Check, ChevronRight, Send,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import UpgradeModal from "@/components/UpgradeModal";
import BulkQuoteModal from "@/components/BulkQuoteModal";

export default function SavedProviders() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<number | null>(null); // null = "All"
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3b82f6");
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [movingProviderId, setMovingProviderId] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [bulkQuoteOpen, setBulkQuoteOpen] = useState(false);

  const { data: favorites, isLoading } = trpc.provider.myFavorites.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: subInfo } = trpc.customerSubscription.getSubscription.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: foldersData } = trpc.folders.list.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();
  const toggleFavorite = trpc.provider.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.provider.myFavorites.invalidate();
      utils.customerSubscription.getSubscription.invalidate();
    },
    onError: (err: any) => {
      if (err.data?.code === "FORBIDDEN") {
        setUpgradeOpen(true);
      } else {
        toast.error(err.message);
      }
    },
  });

  const createFolder = trpc.folders.create.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
      setShowCreateFolder(false);
      setNewFolderName("");
      toast.success("Folder created!");
    },
    onError: (err: any) => {
      if (err.data?.code === "FORBIDDEN") {
        setUpgradeOpen(true);
      } else {
        toast.error(err.message);
      }
    },
  });

  const updateFolder = trpc.folders.update.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
      setEditingFolderId(null);
      toast.success("Folder updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteFolderMut = trpc.folders.delete.useMutation({
    onSuccess: () => {
      utils.folders.list.invalidate();
      utils.provider.myFavorites.invalidate();
      if (activeFolder !== null) setActiveFolder(null);
      toast.success("Folder deleted. Providers moved to All.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const moveProvider = trpc.folders.moveProvider.useMutation({
    onSuccess: () => {
      utils.provider.myFavorites.invalidate();
      utils.folders.list.invalidate();
      setMovingProviderId(null);
      toast.success("Provider moved!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const tier = subInfo?.currentTier || "free";
  const limit = subInfo?.usage?.savedProviderLimit ?? 10;
  const count = favorites?.length || 0;
  const isUnlimited = limit === -1;
  const usagePercent = isUnlimited ? 0 : Math.min((count / limit) * 100, 100);
  const isNearLimit = !isUnlimited && count >= limit - 2;
  const canUseFolders = foldersData?.canUseFolders || false;
  const folders = foldersData?.folders || [];

  const FOLDER_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

  // Filter favorites by active folder
  const filteredFavorites = useMemo(() => {
    if (!favorites) return [];
    if (activeFolder === null) return favorites;
    if (activeFolder === -1) return favorites.filter((f: any) => !f.folderId);
    return favorites.filter((f: any) => f.folderId === activeFolder);
  }, [favorites, activeFolder]);

  const tierConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    free: { label: "Free", icon: Heart, color: "text-muted-foreground", bgColor: "bg-muted" },
    pro: { label: "Pro", icon: Zap, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40" },
    business: { label: "Business", icon: Crown, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40" },
  };
  const currentTierConfig = tierConfig[tier] || tierConfig.free;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-16 text-center">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Saved Providers</h1>
          <p className="text-muted-foreground mb-6">Sign in to save your favorite providers</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-8 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Saved Providers</h1>
              <p className="text-muted-foreground text-sm">
                {count} provider{count !== 1 ? "s" : ""} saved
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(tier === "pro" || tier === "business") && filteredFavorites.length >= 2 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkQuoteOpen(true)}>
                <Send className="h-3.5 w-3.5" />
                Bulk Quote
              </Button>
            )}
            {tier === "business" && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/analytics")}>
                <BarChart3 className="h-3.5 w-3.5" />
                Analytics
              </Button>
            )}
            <Badge variant="outline" className={`gap-1.5 px-3 py-1 ${currentTierConfig.color} ${currentTierConfig.bgColor} border-current/20`}>
              <currentTierConfig.icon className="h-3.5 w-3.5" />
              {currentTierConfig.label} Plan
            </Badge>
          </div>
        </div>

        {/* Usage Bar */}
        {!isUnlimited && (
          <Card className={`mb-6 ${isNearLimit ? "border-amber-500/50" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {count} / {limit} providers saved
                  </span>
                  {isNearLimit && count < limit && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Almost full</Badge>
                  )}
                  {count >= limit && (
                    <Badge variant="outline" className="text-red-600 border-red-300 text-xs">Limit reached</Badge>
                  )}
                </div>
                {tier === "free" && (
                  <Button variant="ghost" size="sm" className="text-primary gap-1.5 h-8" onClick={() => setUpgradeOpen(true)}>
                    <Sparkles className="h-3.5 w-3.5" />
                    Upgrade
                  </Button>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    count >= limit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {count >= limit && (
                <p className="text-xs text-muted-foreground mt-2">
                  Upgrade to <strong>Pro</strong> for 50 providers or <strong>Business</strong> for unlimited.{" "}
                  <button onClick={() => setUpgradeOpen(true)} className="text-primary hover:underline font-medium">View plans</button>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Unlimited badge for Business users */}
        {isUnlimited && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Business Plan — Unlimited Saved Providers</p>
                <p className="text-xs text-muted-foreground">Save as many providers as you need for your projects.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content with Folders Sidebar */}
        <div className="flex gap-6">
          {/* Folders Sidebar */}
          {canUseFolders && (
            <div className="w-64 shrink-0 hidden md:block">
              <div className="sticky top-24 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Folders</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowCreateFolder(true)}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>

                {/* All Providers */}
                <button
                  onClick={() => setActiveFolder(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeFolder === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Heart className="h-4 w-4" />
                  <span className="flex-1 text-left">All Providers</span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>

                {/* Unfiled */}
                <button
                  onClick={() => setActiveFolder(-1)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeFolder === -1 ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">Unfiled</span>
                  <span className="text-xs text-muted-foreground">
                    {favorites?.filter((f: any) => !f.folderId).length || 0}
                  </span>
                </button>

                {/* User Folders */}
                {folders.map((folder: any) => (
                  <div key={folder.id} className="group relative">
                    {editingFolderId === folder.id ? (
                      <div className="flex items-center gap-1 px-2">
                        <Input
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingFolderName.trim()) {
                              updateFolder.mutate({ folderId: folder.id, name: editingFolderName.trim() });
                            }
                            if (e.key === "Escape") setEditingFolderId(null);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            if (editingFolderName.trim()) {
                              updateFolder.mutate({ folderId: folder.id, name: editingFolderName.trim() });
                            }
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveFolder(folder.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeFolder === folder.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {activeFolder === folder.id ? (
                          <FolderOpen className="h-4 w-4" style={{ color: folder.color }} />
                        ) : (
                          <Folder className="h-4 w-4" style={{ color: folder.color }} />
                        )}
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                        <span className="text-xs text-muted-foreground">{folder.providerCount}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolderId(folder.id);
                              setEditingFolderName(folder.name);
                            }}
                            className="p-0.5 rounded hover:bg-muted-foreground/20"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete folder "${folder.name}"? Providers will be moved to Unfiled.`)) {
                                deleteFolderMut.mutate({ folderId: folder.id });
                              }
                            }}
                            className="p-0.5 rounded hover:bg-destructive/20 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </button>
                    )}
                  </div>
                ))}

                {/* Create Folder Form */}
                {showCreateFolder && (
                  <div className="px-2 py-2 space-y-2 border rounded-lg bg-card">
                    <Input
                      placeholder="Folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFolderName.trim()) {
                          createFolder.mutate({ name: newFolderName.trim(), color: newFolderColor });
                        }
                        if (e.key === "Escape") {
                          setShowCreateFolder(false);
                          setNewFolderName("");
                        }
                      }}
                    />
                    <div className="flex gap-1">
                      {FOLDER_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewFolderColor(c)}
                          className={`h-5 w-5 rounded-full border-2 transition-transform ${
                            newFolderColor === c ? "border-foreground scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        disabled={!newFolderName.trim()}
                        onClick={() => createFolder.mutate({ name: newFolderName.trim(), color: newFolderColor })}
                      >
                        Create
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { setShowCreateFolder(false); setNewFolderName(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Upgrade prompt for free users */}
                {!canUseFolders && tier === "free" && (
                  <Card className="mt-4 border-dashed">
                    <CardContent className="p-3 text-center">
                      <FolderPlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground mb-2">
                        Organize providers into folders with Pro or Business
                      </p>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setUpgradeOpen(true)}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Upgrade
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Provider Grid */}
          <div className="flex-1">
            {/* Mobile folder filter */}
            {canUseFolders && folders.length > 0 && (
              <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
                <Button
                  variant={activeFolder === null ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 h-8"
                  onClick={() => setActiveFolder(null)}
                >
                  All ({count})
                </Button>
                <Button
                  variant={activeFolder === -1 ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 h-8"
                  onClick={() => setActiveFolder(-1)}
                >
                  Unfiled
                </Button>
                {folders.map((f: any) => (
                  <Button
                    key={f.id}
                    variant={activeFolder === f.id ? "default" : "outline"}
                    size="sm"
                    className="shrink-0 h-8 gap-1"
                    onClick={() => setActiveFolder(f.id)}
                  >
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                    {f.name} ({f.providerCount})
                  </Button>
                ))}
              </div>
            )}

            {/* Active folder header */}
            {activeFolder !== null && activeFolder !== -1 && (
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="h-5 w-5" style={{ color: folders.find((f: any) => f.id === activeFolder)?.color }} />
                <h2 className="text-lg font-semibold">
                  {folders.find((f: any) => f.id === activeFolder)?.name || "Folder"}
                </h2>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveFolder(null)}>
                  <X className="h-3 w-3 mr-1" />
                  Clear filter
                </Button>
              </div>
            )}
            {activeFolder === -1 && (
              <div className="flex items-center gap-2 mb-4">
                <Folder className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Unfiled Providers</h2>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveFolder(null)}>
                  <X className="h-3 w-3 mr-1" />
                  Clear filter
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-16 w-16 rounded-full bg-muted mb-4" />
                      <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                      <div className="h-4 w-1/2 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredFavorites.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  {activeFolder !== null ? "No providers in this folder" : "No saved providers yet"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {activeFolder !== null
                    ? "Move providers here from your saved list"
                    : "Browse services and tap the heart icon to save providers you like"}
                </p>
                {activeFolder !== null ? (
                  <Button variant="outline" onClick={() => setActiveFolder(null)}>View All Saved</Button>
                ) : (
                  <Button onClick={() => navigate("/browse")}>Browse Services</Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFavorites.map((fav: any) => (
                  <Card key={fav.favoriteId} className="group hover:shadow-md transition-shadow relative">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {fav.profilePhotoUrl ? (
                            <img
                              src={fav.profilePhotoUrl}
                              alt={fav.businessName}
                              className="h-14 w-14 rounded-full object-cover border-2 border-background shadow"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                              {fav.businessName?.charAt(0) || "?"}
                            </div>
                          )}
                          <div>
                            <Link href={fav.profileSlug ? `/p/${fav.profileSlug}` : "#"}>
                              <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                                {fav.businessName}
                              </h3>
                            </Link>
                            {(fav.city || fav.state) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {[fav.city, fav.state].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Move to folder button */}
                          {canUseFolders && folders.length > 0 && (
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => setMovingProviderId(movingProviderId === fav.favoriteId ? null : fav.favoriteId)}
                              >
                                <MoveRight className="h-4 w-4" />
                              </Button>
                              {movingProviderId === fav.favoriteId && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-popover text-popover-foreground border rounded-lg shadow-lg p-1 w-48">
                                  <button
                                    onClick={() => moveProvider.mutate({ favoriteId: fav.favoriteId, folderId: null })}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-muted text-left"
                                  >
                                    <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                    Unfiled
                                    {!fav.folderId && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                                  </button>
                                  {folders.map((folder: any) => (
                                    <button
                                      key={folder.id}
                                      onClick={() => moveProvider.mutate({ favoriteId: fav.favoriteId, folderId: folder.id })}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-muted text-left"
                                    >
                                      <Folder className="h-3.5 w-3.5" style={{ color: folder.color }} />
                                      <span className="truncate">{folder.name}</span>
                                      {fav.folderId === folder.id && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => {
                              toggleFavorite.mutate({ providerId: fav.providerId });
                              toast.success("Removed from saved providers");
                            }}
                          >
                            <Heart className="h-5 w-5 fill-current" />
                          </Button>
                        </div>
                      </div>

                      {/* Folder badge */}
                      {canUseFolders && fav.folderId && activeFolder === null && (
                        <div className="mb-2">
                          {(() => {
                            const folder = folders.find((f: any) => f.id === fav.folderId);
                            if (!folder) return null;
                            return (
                              <button
                                onClick={() => setActiveFolder(folder.id)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                              >
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: folder.color }} />
                                {folder.name}
                              </button>
                            );
                          })()}
                        </div>
                      )}

                      {fav.averageRating && Number(fav.averageRating) > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{Number(fav.averageRating).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({fav.totalReviews} reviews)</span>
                        </div>
                      )}

                      {fav.categories && fav.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {fav.categories.slice(0, 3).map((cat: any) => (
                            <span key={cat.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {cat.name}
                            </span>
                          ))}
                          {fav.categories.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{fav.categories.length - 3} more</span>
                          )}
                        </div>
                      )}

                      {fav.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{fav.description}</p>
                      )}

                      <div className="mt-4">
                        <Link href={fav.profileSlug ? `/p/${fav.profileSlug}` : "#"}>
                          <Button variant="outline" size="sm" className="w-full">View Profile</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Folders upgrade prompt for free users (shown below grid) */}
        {!canUseFolders && tier === "free" && count > 3 && (
          <Card className="mt-8 border-dashed border-primary/30">
            <CardContent className="p-6 text-center">
              <FolderPlus className="h-10 w-10 mx-auto text-primary/50 mb-3" />
              <h3 className="font-semibold mb-1">Organize with Folders</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Group your saved providers by project, category, or location. Available on Pro and Business plans.
              </p>
              <Button variant="outline" onClick={() => setUpgradeOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Unlock Folders
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BulkQuoteModal
        open={bulkQuoteOpen}
        onOpenChange={setBulkQuoteOpen}
        providers={filteredFavorites.map((f: any) => ({
          providerId: f.providerId,
          businessName: f.businessName,
          profilePhotoUrl: f.profilePhotoUrl,
          categories: f.categories,
        }))}
        folderName={activeFolder !== null && activeFolder !== -1
          ? folders.find((f: any) => f.id === activeFolder)?.name
          : undefined
        }
      />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        currentCount={count}
        limit={limit === -1 ? undefined : limit}
      />
    </div>
  );
}
