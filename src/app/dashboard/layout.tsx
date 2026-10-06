import { redirect } from 'next/navigation';
import { getActiveSession } from '@/lib/auth';
import DashboardSessionProvider from '@/components/DashboardSessionProvider';
import DashboardShell from '@/components/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getActiveSession();
    if (!session) redirect('/');
  } catch {
    redirect('/');
  }

  return (
    <DashboardSessionProvider session={session}>
      <DashboardShell>{children}</DashboardShell>
    </DashboardSessionProvider>
  );
}
