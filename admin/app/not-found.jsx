export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4 text-center">
      <h1 className="text-6xl font-bold text-stone-900 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-stone-700 mb-4">Page Not Found</h2>
      <p className="text-stone-500 text-sm mb-6">The page you are looking for does not exist or has been moved.</p>
      <a href="/admin" className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-medium text-sm hover:bg-rose-600 transition-colors">
        Return to Dashboard
      </a>
    </div>
  );
}
