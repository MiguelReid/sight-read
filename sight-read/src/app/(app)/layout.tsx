"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import NavigationBar from "../../../components/NavigationBar";
import BottomNav from "../../../components/BottomNav";
import { useAuth } from "../../../components/FirebaseAuthProvider";
import { isNativeApp } from "../../lib/platform";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Determine nav style: native apps always get bottom nav, web uses top nav
  const [navStyle, setNavStyle] = useState<'top' | 'bottom' | null>(null);
  
  useEffect(() => {
    // Native app (phone or tablet) → bottom nav
    // Web browser → top nav
    setNavStyle(isNativeApp() ? 'bottom' : 'top');
  }, []);

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

  // Wait for hydration to determine nav style
  if (navStyle === null) {
    return null;
  }

  return (
    <div className={`app-shell ${navStyle === 'bottom' ? 'app-shell-mobile' : ''}`}>
      {/* Web: top navigation */}
      {navStyle === 'top' && <NavigationBar />}

      {/* Main content */}
      <main className="app-main">
        {children}
      </main>

      {/* Native app: bottom navigation */}
      {navStyle === 'bottom' && <BottomNav />}
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
