"use client";

import { useTransition, useState, useRef } from "react";
import { CustomerProfile } from "@/types/customer.types";
import { updateProfileAction, uploadAvatarAction } from "@/app/actions/customer.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Please enter a valid BD phone number (e.g. 01712345678)")
    .or(z.literal(""))
    .optional(),
  date_of_birth: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditorProps {
  profile: CustomerProfile | null;
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
      date_of_birth:
        typeof profile?.date_of_birth === "string"
          ? profile.date_of_birth.split("T")[0]
          : "",
    },
  });

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    const toastId = toast.loading("Uploading avatar...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadAvatarAction(formData);
      if (res.success && res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        toast.success("Avatar updated successfully!", { id: toastId });
      } else {
        toast.error(res.error || "Failed to upload avatar", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar", { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = (values: ProfileFormValues) => {
    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    formData.append("phone", values.phone || "");
    formData.append("date_of_birth", values.date_of_birth || "");
    if (avatarUrl) {
      formData.append("avatar_url", avatarUrl);
    }

    startTransition(async () => {
      try {
        const res = await updateProfileAction(formData);
        if (res && res.success) {
          toast.success("Profile updated successfully");
        } else {
          toast.error("Failed to update profile");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to update profile");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage
                  src={avatarUrl}
                  alt={profile?.first_name || "Avatar"}
                />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {profile?.first_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </div>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Avatar
                  </>
                )}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                JPG, GIF, WebP or PNG. Max size of 5MB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                {...register("first_name")}
                className={errors.first_name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                {...register("last_name")}
                className={errors.last_name ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              defaultValue={profile?.email || ""}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              {...register("date_of_birth")}
              className={errors.date_of_birth ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.date_of_birth && (
              <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
