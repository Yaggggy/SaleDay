import { motion } from "framer-motion";
import { LogIn, Tag } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Basics";
import { useAuth } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // Supports the invite-acceptance flow: /accept-invite redirects here with
      // ?next=... when the invitee already has an account, then sends them back.
      const next = params.get("next");
      navigate(next && next.startsWith("/") ? next : "/sales");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't sign you in. Check your email and password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <span className="h-12 w-12 rounded-2xl bg-tag flex items-center justify-center rotate-[-8deg] mb-3 animate-swing-slow">
            <Tag className="h-6 w-6 text-white" />
          </span>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-ink-faint text-sm mt-1">Sign in to run your sale.</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1.5"
              placeholder="you@family.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1.5"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" loading={loading} icon={LogIn} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-ink-faint mt-6">
          New to SaleDay?{" "}
          <Link to="/register" className="text-tag font-semibold hover:underline">
            Create your family's account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
