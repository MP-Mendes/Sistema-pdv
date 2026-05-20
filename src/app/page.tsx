import { getSession } from '@/lib/auth';
import LoginPage from './login/page';

export default async function Home() {
  const session = await getSession();

  // If server-side session exists, the LoginPage client component
  // will also detect it via /api/auth/session and redirect.
  // We render LoginPage in all cases - it handles the redirect client-side.
  if (session) {
    // Still render LoginPage, it will redirect via client-side effect
    return <LoginPage />;
  }

  return <LoginPage />;
}