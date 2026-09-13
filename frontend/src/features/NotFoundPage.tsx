import { Tag } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <span className="h-14 w-14 rounded-full bg-tag-light flex items-center justify-center mb-4">
        <Tag className="h-7 w-7 text-tag-dark" />
      </span>
      <h1 className="text-2xl font-bold mb-1">Page not found</h1>
      <p className="text-ink-faint text-sm mb-6">That page doesn't exist or has moved.</p>
      <Link to="/sales" className="btn-primary">Go home</Link>
    </div>
  );
}
