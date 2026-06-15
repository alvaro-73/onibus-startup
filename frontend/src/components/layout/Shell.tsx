import TopBar from "./TopBar";
import BottomNav from "./BottomNav";

export default function Shell({
  children,
  hideBottomNav = false,
}: {
  children: React.ReactNode;
  hideBottomNav?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className={`flex-1 ${hideBottomNav ? "" : "with-bottom-nav"}`}>{children}</main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
