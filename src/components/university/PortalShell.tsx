import { Suspense, type ReactNode } from "react";
import { PortalTopbar } from "./PortalTopbar";
import { NotificationBell, NotificationBellFallback } from "./NotificationBell";
import type { PortalNotification } from "@/lib/portal-notifications";

type Props = {
  userId: string;
  userName: string;
  userRole: string;
  userImageUrl?: string | null;
  searchEndpoint: string;
  searchPlaceholder: string;
  /** Desktop sidebar + mobile nav for this portal. */
  sidebar: ReactNode;
  mobileNav: ReactNode;
  /** Loads this portal's notifications. Runs behind <Suspense>, so it never
   * delays the first paint of the page. */
  loadNotifications: () => Promise<PortalNotification[]>;
  /** Optional parallel-route slot (intercepted drawers). */
  modal?: ReactNode;
  children: ReactNode;
};

async function StreamedNotifications({ userId, load }: { userId: string; load: () => Promise<PortalNotification[]> }) {
  const notifications = await load().catch((error) => {
    // A failing notification query must never take the whole portal down.
    console.error("Failed to load notifications", error);
    return [] as PortalNotification[];
  });
  return <NotificationBell userId={userId} notifications={notifications} />;
}

/** Shared chrome for the student, faculty, and admin portals. */
export function PortalShell({
  userId,
  userName,
  userRole,
  userImageUrl,
  searchEndpoint,
  searchPlaceholder,
  sidebar,
  mobileNav,
  loadNotifications,
  modal,
  children,
}: Props) {
  return (
    <div className="portal-shell flex min-h-screen">
      {sidebar}
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        {mobileNav}
        <PortalTopbar
          userName={userName}
          userRole={userRole}
          userImageUrl={userImageUrl}
          searchEndpoint={searchEndpoint}
          searchPlaceholder={searchPlaceholder}
          notifications={
            <Suspense fallback={<NotificationBellFallback />}>
              <StreamedNotifications userId={userId} load={loadNotifications} />
            </Suspense>
          }
        />
        <main className="mx-auto w-full min-w-0 max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-7 lg:py-7">{children}</main>
      </div>
      {modal}
    </div>
  );
}
