import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-8 max-w-md text-center px-4">
        <div>
          <h1 className="text-4xl font-bold">The Journey</h1>
          <p className="mt-4 text-lg text-zinc-500">
            Your personal productivity workspace for managing tasks across work, side projects, and life.
          </p>
        </div>

        <div className="space-y-4 text-zinc-600">
          <p>Plan your goals, track your progress, and let AI help you stay focused on what matters.</p>
        </div>

        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
