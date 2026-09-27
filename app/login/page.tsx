import { LockKeyhole, Mail } from 'lucide-react';
import { login } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#F6F6F7] px-5 py-12">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-admin-green" />
    <section className="w-full max-w-[340px]">
      <div className="admin-card p-5">
        <div className="mb-5 text-center"><img src="/logo-light.png" alt="Glorious Gospel of Christ" className="h-auto w-[134px] mx-auto" /></div>
        {error ? <div className="admin-notice-error mb-4" role="alert">{error}</div> : null}
        <form action={login} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-admin-ink">Email address<div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-admin-muted" /><input className="admin-input h-11 pl-10" type="email" name="email" autoComplete="email" placeholder="you@example.com" required autoFocus /></div></label>
          <label className="grid gap-2 text-sm font-semibold text-admin-ink">Password<div className="relative"><LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-admin-muted" /><input className="admin-input h-11 pl-10" type="password" name="password" autoComplete="current-password" placeholder="Enter your password" required /></div></label>
          <button className="admin-button admin-button-primary mt-2 h-11 w-full text-sm">Sign in securely</button>
        </form>
      </div>
    </section>
  </main>;
}
