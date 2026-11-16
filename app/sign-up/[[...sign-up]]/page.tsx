import { redirect } from 'next/navigation';

/**
 * Google OAuth handles both sign-in and sign-up in one flow.
 * First-time Google sign-in automatically creates an account.
 * Redirect any direct visits to /sign-up to the sign-in page.
 */
export default function SignUpPage() {
  redirect('/sign-in');
}
