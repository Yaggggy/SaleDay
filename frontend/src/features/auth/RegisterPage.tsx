import { motion } from "framer-motion";
import { Tag, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Basics";
import { useAuth } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/api/client";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", organization_name: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      navigate("/sales");
      toast.success("Welcome to SaleDay!");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't create your account."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <span className="h-12 w-12 rounded-2xl bg-tag flex items-center justify-center rotate-[-8deg] mb-3">
            <Tag className="h-6 w-6 text-white" />
          </span>
          <h1 className="text-2xl font-bold">Set up your sale</h1>
          <p className="text-ink-faint text-sm mt-1 text-center">Create a free account for your family or household.</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="full_name">Your name</label>
            <input
              id="full_name"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input mt-1.5"
              placeholder="Sarah Singh"
            />
          </div>
          <div>
            <label className="label" htmlFor="organization_name">Family / household name</label>
            <input
              id="organization_name"
              required
              value={form.organization_name}
              onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
              className="input mt-1.5"
              placeholder="Singh Family"
            />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input mt-1.5"
              placeholder="At least 8 characters"
            />
          </div>
          <Button type="submit" loading={loading} icon={UserPlus} className="w-full">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-ink-faint mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-tag font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
