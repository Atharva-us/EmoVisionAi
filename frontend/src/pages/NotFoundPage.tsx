import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-[600px] flex-col items-center px-4 py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl font-semibold">Nothing detected here.</h1>
      <p className="mt-3 text-fg-muted">The page you are looking for does not exist.</p>
      <Link to="/" className="bg-brand-gradient mt-8 rounded-full px-5 py-2.5 text-sm font-medium text-white">
        Back to home
      </Link>
    </div>
  );
}
