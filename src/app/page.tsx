import { redirect } from 'next/navigation';
import { getActiveSession } from '@/lib/auth';
import LoginPage from './login/page';

export default async function Home() {
  let session = null;
  try { session = await getActiveSession(); } catch { /* Login remains available if the backend is not configured yet. */ }
  if (session) redirect('/dashboard');

  return <LoginPage />;
}
