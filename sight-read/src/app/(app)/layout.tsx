"use client";
import NavigationBar from "../../../components/NavigationBar";
import { useAuth } from "../../../components/FirebaseAuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (!user) {
    return null;
  }

  return (
    <>
      <NavigationBar />
      {children}
    </>
  );
}
