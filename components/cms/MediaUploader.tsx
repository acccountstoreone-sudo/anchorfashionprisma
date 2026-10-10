"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { uploadMedia } from "@/actions/cms.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MediaUploaderProps {
  onSuccess?: () => void;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  buttonText?: string;
  showIcon?: boolean;
}

export function MediaUploader({
  onSuccess,
  className,
  variant = "default",
  buttonText = "Upload Media",
  showIcon = true,
}: MediaUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [uploadCount, setUploadCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Check individual file size limit (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    for (const file of fileArray) {
      if (file.size > MAX_SIZE) {
        toast.error(`"${file.name}" exceeds the 50MB size limit.`);
        return;
      }
    }

    setLoading(true);
    setUploadCount(fileArray.length);

    const formData = new FormData();
    fileArray.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await uploadMedia(formData);
      if (res?.success) {
        toast.success(
          fileArray.length === 1
            ? `Uploaded "${fileArray[0].name}" successfully!`
            : `Uploaded ${fileArray.length} files successfully!`
        );
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        toast.error("Upload failed");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload files. Please try again.");
    } finally {
      setLoading(false);
      setUploadCount(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        className="hidden"
        multiple
        accept="image/*,video/*,application/pdf,text/*"
        id="media-uploader-input"
      />
      <Button
        id="upload-media-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        variant={variant}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploadCount ? `Uploading (${uploadCount})...` : "Uploading..."}
          </>
        ) : (
          <>
            {showIcon && <Upload className="mr-2 h-4 w-4" />}
            {buttonText}
          </>
        )}
      </Button>
    </div>
  );
}

