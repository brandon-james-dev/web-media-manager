import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/i18n";
import { AboutTab } from "./AboutTab";
import type { AboutDialogProps, AboutTab as AboutTabId } from "./AboutDialogProps";
import { CreditsTab } from "./CreditsTab";
import { ShortcutsTab } from "./ShortcutsTab";

export function AboutDialog({
  open,
  onOpenChange,
  tab,
  onTabChange,
}: AboutDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 w-150 max-h-[80%]">
        <DialogHeader>
          <DialogTitle>{t("about.title")}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => onTabChange(value as AboutTabId)}
        >
          <TabsList>
            <TabsTrigger value="about">{t("about.tabAbout")}</TabsTrigger>
            <TabsTrigger value="credits">{t("about.tabCredits")}</TabsTrigger>
            <TabsTrigger value="shortcuts">
              {t("about.tabShortcuts")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about">
            <AboutTab />
          </TabsContent>

          <TabsContent value="credits">
            <CreditsTab />
          </TabsContent>

          <TabsContent value="shortcuts">
            <ShortcutsTab open={open && tab === "shortcuts"} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
