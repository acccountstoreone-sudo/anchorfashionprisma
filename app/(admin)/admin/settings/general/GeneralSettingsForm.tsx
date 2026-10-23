"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  updateStoreInfo,
  updateSocialLinks,
  StoreInfo,
  SocialLinks,
} from "@/lib/actions/settings.actions";
import { Save, Store, Share2, Megaphone, Loader2 } from "lucide-react";

export function GeneralSettingsForm({
  initialStoreInfo,
  initialSocialLinks,
}: {
  initialStoreInfo: StoreInfo;
  initialSocialLinks: SocialLinks;
}) {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    store_name: initialStoreInfo?.store_name ?? "",
    phone: initialStoreInfo?.phone ?? "",
    email: initialStoreInfo?.email ?? "",
    address: initialStoreInfo?.address ?? "",
    store_description: initialStoreInfo?.store_description ?? "",
    announcement_bar: initialStoreInfo?.announcement_bar ?? "",
    free_shipping_threshold: initialStoreInfo?.free_shipping_threshold ?? "999",
  });

  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: initialSocialLinks?.facebook ?? "",
    instagram: initialSocialLinks?.instagram ?? "",
    twitter: initialSocialLinks?.twitter ?? "",
    youtube: initialSocialLinks?.youtube ?? "",
    tiktok: initialSocialLinks?.tiktok ?? "",
  });

  const [isPendingStore, startStoreTransition] = useTransition();
  const [isPendingSocial, startSocialTransition] = useTransition();

  const handleSaveStoreInfo = () => {
    startStoreTransition(async () => {
      const result = await updateStoreInfo(storeInfo);
      if (result.success) {
        toast.success("Store information saved successfully!");
      } else {
        toast.error(result.error ?? "Failed to save settings.");
      }
    });
  };

  const handleSaveSocialLinks = () => {
    startSocialTransition(async () => {
      const result = await updateSocialLinks(socialLinks);
      if (result.success) {
        toast.success("Social links saved successfully!");
      } else {
        toast.error(result.error ?? "Failed to save settings.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Store Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                This information appears in the website footer, header, and
                contact pages.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="store_name">Store Name</Label>
              <Input
                id="store_name"
                value={storeInfo.store_name}
                onChange={(e) =>
                  setStoreInfo({ ...storeInfo, store_name: e.target.value })
                }
                placeholder="Anchor Fashion Enterprise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_phone">Phone Number</Label>
              <Input
                id="store_phone"
                value={storeInfo.phone}
                onChange={(e) =>
                  setStoreInfo({ ...storeInfo, phone: e.target.value })
                }
                placeholder="+880 1711-223344"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_email">Support Email</Label>
              <Input
                id="store_email"
                type="email"
                value={storeInfo.email}
                onChange={(e) =>
                  setStoreInfo({ ...storeInfo, email: e.target.value })
                }
                placeholder="support@anchorfashion.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_address">Address</Label>
              <Input
                id="store_address"
                value={storeInfo.address}
                onChange={(e) =>
                  setStoreInfo({ ...storeInfo, address: e.target.value })
                }
                placeholder="Dhaka, Bangladesh"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store_description">Store Description</Label>
            <Textarea
              id="store_description"
              value={storeInfo.store_description}
              onChange={(e) =>
                setStoreInfo({
                  ...storeInfo,
                  store_description: e.target.value,
                })
              }
              rows={3}
              placeholder="A short description of your store shown in the footer..."
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label
              htmlFor="announcement_bar"
              className="flex items-center gap-2"
            >
              <Megaphone className="h-4 w-4" /> Announcement Bar Text
            </Label>
            <Input
              id="announcement_bar"
              value={storeInfo.announcement_bar}
              onChange={(e) =>
                setStoreInfo({ ...storeInfo, announcement_bar: e.target.value })
              }
              placeholder="🚚 Free Shipping On Orders Over ৳999 | Easy Returns & Exchanges"
            />
            <p className="text-xs text-muted-foreground">
              This text appears in the black bar at the very top of every page.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="free_shipping_threshold">
              Free Shipping Threshold (৳)
            </Label>
            <Input
              id="free_shipping_threshold"
              type="number"
              value={storeInfo.free_shipping_threshold}
              onChange={(e) =>
                setStoreInfo({
                  ...storeInfo,
                  free_shipping_threshold: e.target.value,
                })
              }
              placeholder="999"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveStoreInfo} disabled={isPendingStore} className="cursor-pointer">
              {isPendingStore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isPendingStore ? "Saving..." : "Save Store Info"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                These appear as social media icons in the website footer.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook URL</Label>
              <Input
                id="facebook"
                value={socialLinks.facebook}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, facebook: e.target.value })
                }
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram URL</Label>
              <Input
                id="instagram"
                value={socialLinks.instagram}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, instagram: e.target.value })
                }
                placeholder="https://instagram.com/yourhandle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter / X URL</Label>
              <Input
                id="twitter"
                value={socialLinks.twitter}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, twitter: e.target.value })
                }
                placeholder="https://twitter.com/yourhandle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube URL</Label>
              <Input
                id="youtube"
                value={socialLinks.youtube}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, youtube: e.target.value })
                }
                placeholder="https://youtube.com/@yourchannel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok URL</Label>
              <Input
                id="tiktok"
                value={socialLinks.tiktok}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, tiktok: e.target.value })
                }
                placeholder="https://tiktok.com/@yourhandle"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveSocialLinks} disabled={isPendingSocial} className="cursor-pointer">
              {isPendingSocial ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isPendingSocial ? "Saving..." : "Save Social Links"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
