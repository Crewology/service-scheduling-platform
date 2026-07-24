import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Share2, Eye, Send, Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function AdminSocialMedia() {
  const [previewContent, setPreviewContent] = useState<{ content: string; postType: string; categoryName?: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: posts, refetch, isLoading } = trpc.socialMedia.listPosts.useQuery();
  const previewMutation = trpc.socialMedia.previewPost.useMutation({
    onSuccess: (data) => setPreviewContent(data),
    onError: (err) => toast.error(err.message),
  });
  const publishMutation = trpc.socialMedia.publishPost.useMutation({
    onSuccess: (data) => {
      setIsPublishing(false);
      if (data.success) {
        toast.success("Post published successfully!");
      } else {
        toast.error("Some platforms failed. Check post history for details.");
      }
      refetch();
      setPreviewContent(null);
    },
    onError: (err) => {
      setIsPublishing(false);
      toast.error(err.message);
    },
  });
  const deleteMutation = trpc.socialMedia.deletePost.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePublish = () => {
    setIsPublishing(true);
    publishMutation.mutate({});
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "posted": return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Posted</Badge>;
      case "failed": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getPlatformResults = (results: any[] | null) => {
    if (!results) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {results.map((r: any, i: number) => (
          <Badge key={i} variant={r.success ? "outline" : "destructive"} className="text-xs">
            {r.platform}: {r.success ? "✓" : r.error?.substring(0, 30) || "failed"}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Social Media Auto-Posting</p>
              <p>Posts are automatically generated and published every Monday at 10am UTC to Facebook, Instagram, and LinkedIn. Content is AI-generated to attract providers and customers to OlogyCrew.</p>
              <p className="mt-1 text-blue-600">API credentials must be configured in Settings → Secrets for live posting. Without credentials, posts will be generated but not published.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => previewMutation.mutate()}
          disabled={previewMutation.isPending}
          variant="outline"
        >
          <Eye className="h-4 w-4 mr-2" />
          {previewMutation.isPending ? "Generating..." : "Preview Post"}
        </Button>
        <Button
          onClick={handlePublish}
          disabled={isPublishing}
        >
          <Send className="h-4 w-4 mr-2" />
          {isPublishing ? "Publishing..." : "Publish Now"}
        </Button>
        <Button variant="ghost" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Preview */}
      {previewContent && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Post Preview
              <Badge variant="secondary" className="text-xs">{previewContent.postType.replace(/_/g, " ")}</Badge>
              {previewContent.categoryName && (
                <Badge variant="outline" className="text-xs">{previewContent.categoryName}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap mb-3">{previewContent.content}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
                <Send className="h-3 w-3 mr-1" />
                Publish This
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreviewContent(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Post History
          </CardTitle>
          <CardDescription>All social media posts generated and published by the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Share2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No posts yet. Click "Publish Now" to create your first post.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getStatusBadge(post.status)}
                        <Badge variant="outline" className="text-xs">{post.postType.replace(/_/g, " ")}</Badge>
                        {post.categoryName && (
                          <Badge variant="secondary" className="text-xs">{post.categoryName}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {post.postedAt ? new Date(post.postedAt).toLocaleString() : post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap mt-2">{post.content}</p>
                      {getPlatformResults(post.results as any)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: post.id })}
                      disabled={deleteMutation.isPending}
                      className="shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
