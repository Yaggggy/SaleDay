import { Loader2, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: LucideIcon;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  success: "btn-success",
  danger: "btn bg-tag-light text-tag-dark hover:bg-tag hover:text-white",
};

export function Button({ variant = "primary", loading, icon: Icon, children, className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button className={`${VARIANT_CLASS[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-tag ${className}`} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6 card"
    >
      <div className="h-14 w-14 rounded-full bg-marigold-light flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-marigold-dark" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && <p className="text-ink-faint text-sm max-w-sm mb-5">{description}</p>}
      {action}
    </motion.div>
  );
}
