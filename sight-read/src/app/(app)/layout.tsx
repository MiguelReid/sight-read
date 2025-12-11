"use client";
import NavigationBar from "../../../components/NavigationBar";
import { useAuth } from "../../../components/FirebaseAuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
    }
  }, [loading, user, router]);

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
