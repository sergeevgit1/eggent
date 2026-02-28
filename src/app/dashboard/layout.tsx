import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { InteractionUnlock } from "@/components/interaction-unlock";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InteractionUnlock />
      {children}
      <MobileBottomNav />
    </>
  );
}
