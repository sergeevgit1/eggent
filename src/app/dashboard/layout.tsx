import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <MobileBottomNav />
    </>
  );
}
