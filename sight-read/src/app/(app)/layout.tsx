"use client";
import NavigationBar from "../../../components/NavigationBar";
import BottomNav from "../../../components/BottomNav";
import { useAuth } from "../../../components/FirebaseAuthProvider";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!user.emailVerified) {
      router.replace("/login?verify=true");
      return;
    }
  }, [loading, user, user?.emailVerified, router]);

  if (!user || !user.emailVerified) {
    return null;
  }

  return (
    <div className="app-shell">
      {/* Desktop: top navigation */}
      <div className="desktop-only">
        <NavigationBar />
      </div>

      {/* Main content */}
      <main className="app-main">
        {children}
      </main>

      {/* Mobile: bottom navigation */}
      <div className="mobile-only">
        <BottomNav />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  );
}
