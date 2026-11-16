/**
 * Type augmentation for Auth.js v5 (next-auth@beta).
 *
 * Extends the default Session and JWT interfaces so that our custom fields
 * (userId, providerId) are strongly-typed throughout the codebase.
 *
 * userId:     our internal Neon DB UUID (users.id)
 * providerId: OAuth provider account ID stored in users.clerk_id column
 */
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      userId:     string;
      providerId: string;
      email:      string;
      name?:      string;
      image?:     string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?:     string;
    providerId?: string;
  }
}
