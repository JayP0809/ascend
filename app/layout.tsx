import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Ascend - AI Career Navigation',
  description: 'Upload your resume. Pick a role. Get your personalized AI-powered career roadmap.',
  keywords: ['career', 'AI', 'resume', 'roadmap', 'job', 'skills'],
};

// ClerkProvider is only rendered when Clerk credentials are configured.
// When absent (local dev), the app runs without authentication.
const CLERK_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

async function MaybeClerkProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_CONFIGURED) return <>{children}</>;
  const { ClerkProvider } = await import('@clerk/nextjs');
  return <ClerkProvider>{children}</ClerkProvider>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <MaybeClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            {children}
          </ThemeProvider>
        </MaybeClerkProvider>
      </body>
    </html>
  );
}
