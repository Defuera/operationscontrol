import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">The Journey</h1>
          <p className="mt-2 text-zinc-500">Personal productivity workspace</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
