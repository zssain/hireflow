"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, Zap, Shield, Users } from "lucide-react";
import { getClientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const features = [
  { icon: Zap, text: "AI-powered candidate scoring" },
  { icon: Shield, text: "Enterprise-grade security" },
  { icon: Users, text: "Built for modern hiring teams" },
  { icon: Sparkles, text: "Automate your hiring pipeline" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const auth = await getClientAuth();
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const auth = await getClientAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>

        {/* Floating orbs */}
        <motion.div
          className="absolute w-72 h-72 rounded-full bg-brand-500/20 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "20%", left: "10%" }}
        />
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-brand-400/10 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "10%", right: "5%" }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-3xl font-bold tracking-tight">HireFlow</h1>
            <p className="text-brand-200 text-sm mt-1">Intelligent Hiring Platform</p>
          </motion.div>

          <div className="space-y-8">
            <motion.h2
              className="text-4xl font-bold leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Hire smarter.<br />
              <span className="text-brand-300">Move faster.</span>
            </motion.h2>

            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.text}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                    <feature.icon className="h-4 w-4 text-brand-300" />
                  </div>
                  <span className="text-sm text-brand-100">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.p
            className="text-xs text-brand-300/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            Trusted by 500+ companies worldwide
          </motion.p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 flex-col justify-center px-6 lg:px-16 bg-background relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <AnimatePresence>
          {mounted && (
            <motion.div
              className="mx-auto w-full max-w-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="lg:hidden mb-8">
                <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-400">HireFlow</h1>
              </div>

              <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground text-sm mt-1 mb-8">Sign in to continue to your dashboard</p>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger overflow-hidden"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="h-11 bg-secondary/50 border-border/50 focus:border-brand-500 focus:ring-brand-500/20 transition-all" />
                </motion.div>

                <motion.div className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="h-11 bg-secondary/50 border-border/50 focus:border-brand-500 focus:ring-brand-500/20 transition-all" />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Button type="submit" className="w-full h-11 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white font-medium transition-all" disabled={loading}>
                    {loading ? (
                      <motion.div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    ) : (
                      <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>
                    )}
                  </Button>
                </motion.div>
              </form>

              <motion.div className="relative my-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground uppercase tracking-wider">or continue with</span></div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Button variant="outline" className="w-full h-11 border-border/50 hover:bg-secondary/80 transition-all" onClick={handleGoogleLogin} disabled={loading}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </Button>
              </motion.div>

              <motion.p className="mt-8 text-center text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-brand-600 dark:text-brand-400 hover:underline font-medium">Create workspace</Link>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
