import { Header } from '@/components/Header';
import { Dashboard } from '@/components/ops/Dashboard';

export default function WorkspacePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <Dashboard />
      </main>
    </>
  );
}
