"use client";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GallerySection } from "@/components/admin/cms/gallery-section";
import { PromotionsSection } from "@/components/admin/cms/promotions-section";
import { NewsSection } from "@/components/admin/cms/news-section";

export default function WebsitePage() {
  const t = useTranslations("cms");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="gallery">
        <TabsList>
          <TabsTrigger value="gallery">{t("tabs.gallery")}</TabsTrigger>
          <TabsTrigger value="promotions">{t("tabs.promotions")}</TabsTrigger>
          <TabsTrigger value="news">{t("tabs.news")}</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-4">
          <GallerySection />
        </TabsContent>

        <TabsContent value="promotions" className="mt-4">
          <PromotionsSection />
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          <NewsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
