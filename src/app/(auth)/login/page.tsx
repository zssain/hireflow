"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { getClientAuth } from "@/lib/firebase/client";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const auth = await getClientAuth();
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace("Firebase: ", "") : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const auth = await getClientAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace("Firebase: ", "") : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <motion.header
        className="flex items-center justify-between px-8 py-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-sm font-medium tracking-tight">HireFlow</span>
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Create account <ArrowRight className="inline h-3 w-3 ml-1" />
          </Link>
        </div>
      </motion.header>

      {/* Divider */}
      <motion.hr
        className="border-border"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ transformOrigin: "left" }}
      />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Heading */}
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Sign in</h1>
            <p className="text-muted-foreground text-sm mb-10">
              Welcome back to your workspace.
            </p>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-sm text-danger mb-6 pb-4 border-b border-danger/20"
              >
                {error}
              </motion.p>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-border pb-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-border pb-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50"
                  placeholder="Enter your password"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-between py-4 text-sm font-medium border-t border-border hover:border-foreground transition-colors group disabled:opacity-50"
                whileHover={{ x: 0 }}
                whileTap={{ scale: 0.99 }}
              >
                <span>{loading ? "Signing in..." : "Continue"}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <hr className="border-border" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                or
              </span>
            </div>

            {/* Google */}
            <motion.button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 text-sm border border-border rounded-lg hover:border-muted-foreground/50 transition-colors disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.footer
        className="px-8 py-6 flex justify-between items-center text-[11px] text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <span>HireFlow &copy; 2026</span>
        <span>Intelligent Hiring Platform</span>
      </motion.footer>
    </div>
  );
}
