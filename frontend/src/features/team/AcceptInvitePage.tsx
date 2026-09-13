import { motion } from "framer-motion";
import { CheckCircle2, Tag, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button, Spinner } from "@/components/ui/Basics";
import { apiErrorMessage } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { teamService } from "@/services";

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { user, isLoading: authLoading, refresh } = useAuth();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("This invitation link is missing its token.");
  }, [token]);

  async function acceptForLoggedInUser() {
    setSubmitting(true);
    try {
      await teamService.acceptInvitation({ token });
      await refresh();
      toast.success("You're in! Welcome to the team.");
      navigate("/sales");
    } catch (err) {
      setError(apiErrorMessage(err, "This invitation link couldn't be used."));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitNewAccount(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await teamService.acceptInvitation({ token, full_name: fullName, password });
      await refresh();
      toast.success("Account created — welcome to the team!");
      navigate("/sales");
    } catch (err) {
      setError(apiErrorMessage(err, "This invitation link couldn't be used."));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
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
          <h1 className="text-2xl font-bold">You've been invited</h1>
          <p className="text-ink-faint text-sm mt-1 text-center">Join the team and start managing the sale together.</p>
        </div>

        {error ? (
          <div className="card p-6 text-center space-y-4">
            <p className="text-sm text-ink-soft">{error}</p>
            <Link to="/login" className="text-tag font-semibold text-sm hover:underline">
              Go to sign in
            </Link>
          </div>
        ) : user ? (
          <div className="card p-6 space-y-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-garden-dark mx-auto" />
            <p className="text-sm text-ink-soft">
              Signed in as <strong>{user.email}</strong>. Accept this invitation to join the team.
            </p>
            <Button onClick={acceptForLoggedInUser} loading={submitting} className="w-full">
              Accept Invitation
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmitNewAccount} className="card p-6 space-y-4">
            <p className="text-sm text-ink-faint">
              Create a password to set up your account and join the team. Already have an account?{" "}
              <Link to={`/login?next=/accept-invite?token=${encodeURIComponent(token)}`} className="text-tag font-semibold hover:underline">
                Sign in instead
              </Link>
              .
            </p>
            <div>
              <label className="label" htmlFor="full_name">Your name</label>
              <input
                id="full_name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input mt-1.5"
                placeholder="Sarah Singh"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1.5"
                placeholder="At least 8 characters"
              />
            </div>
            <Button type="submit" loading={submitting} icon={UserPlus} className="w-full">
              Create account &amp; join
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
