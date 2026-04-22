import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { UpgradePrompt } from "@/components/UpgradePrompt";

interface PhotoUploadProps {
  serviceId: number;
  existingPhotos?: Array<{ id: number; url: string; caption?: string | null; displayOrder: number }>;
  maxPhotos?: number;
  onPhotosChanged?: () => void;
}

export function PhotoUpload({ serviceId, existingPhotos = [], maxPhotos = 10, onPhotosChanged }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUpgradeForPhotos, setShowUpgradeForPhotos] = useState(false);

  const uploadPhoto = trpc.service.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded successfully");
      onPhotosChanged?.();
    },
    onError: (err) => {
      if (err.message?.includes("Free tier allows") || err.message?.includes("Upgrade to")) {
        setShowUpgradeForPhotos(true);
      } else {
        toast.error(err.message);
      }
    },
  });

  const deletePhoto = trpc.service.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo removed");
      onPhotosChanged?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const setPrimary = trpc.service.setPrimaryPhoto.useMutation({
    onSuccess: () => {
      toast.success("Cover photo updated");
      onPhotosChanged?.();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - existingPhotos.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    for (const file of filesToUpload) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      try {
        // Convert to base64 for upload
        const base64 = await fileToBase64(file);
        // Strip the data:image/...;base64, prefix
        const base64Data = base64.split(",")[1] || base64;
        await uploadPhoto.mutateAsync({
          serviceId,
          photoData: base64Data,
          contentType: file.type,
          caption: "",
        });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (photoId: number) => {
    deletePhoto.mutate({ photoId, serviceId });
  };

  const handleSetPrimary = (photoId: number) => {
    setPrimary.mutate({ photoId, serviceId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Service Photos</h3>
          <p className="text-xs text-muted-foreground">
            {existingPhotos.length}/{maxPhotos} photos uploaded
          </p>
        </div>
        {existingPhotos.length < maxPhotos && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {uploading ? "Uploading..." : "Add Photos"}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {existingPhotos.length === 0 ? (
        <Card
          className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="py-8 text-center space-y-2">
            <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Click to upload photos</p>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP up to 5MB each</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {existingPhotos
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((photo, index) => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden border">
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {index > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs px-2"
                      onClick={() => handleSetPrimary(photo.id)}
                    >
                      Set Cover
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => handleDelete(photo.id)}
                    disabled={deletePhoto.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {index === 0 && (
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                    Cover
                  </div>
                )}
              </div>
            ))}

          {existingPhotos.length < maxPhotos && (
            <div
              className="border-dashed border-2 rounded-lg aspect-square flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Add more</p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Photo limit upgrade prompt */}
      <UpgradePrompt
        open={showUpgradeForPhotos}
        onClose={() => setShowUpgradeForPhotos(false)}
        reason="photo_limit"
        currentTier="free"
        currentCount={existingPhotos.length}
        currentLimit={2}
      />
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
