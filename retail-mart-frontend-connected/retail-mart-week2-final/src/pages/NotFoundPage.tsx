import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-sm font-medium text-brand-600">404</p>
      <h1 className="text-2xl font-semibold text-ink-950">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        to={ROUTES.dashboard}
        className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
