"use client";
import NavigationBar from "../../../components/NavigationBar";
import { useAuth } from "../../../components/FirebaseAuthProvider";
import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (pathname !== "/login") router.replace("/login");
      return;
    }

    if (!user.emailVerified) {
      const alreadyOnVerify = pathname === "/login" && search.get("verify") === "true";
      if (!alreadyOnVerify) router.replace("/login?verify=true");
      return;
    }
  }, [loading, user, user?.email, user?.emailVerified, pathname, search, router]);

  if (!user || !user.emailVerified) {
    return null;
  }

  return (
    <>
      <NavigationBar />
      {children}
    </>
  );
}
