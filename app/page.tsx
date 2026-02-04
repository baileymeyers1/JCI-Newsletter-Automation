import { redirect } from 'next/navigation';
import { hasValidSession } from '@/lib/auth';
import Dashboard from './dashboard';

export default function HomePage() {
  if (!hasValidSession()) {
    redirect('/login');
  }
  return <Dashboard />;
}
