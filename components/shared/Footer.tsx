import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-secondary">
          <p>
            AI-generated results are heuristic estimates, not professional career advice.
          </p>
          <nav className="flex items-center gap-6" aria-label="Legal">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/settings" className="hover:text-primary transition-colors">
              Account Settings
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
