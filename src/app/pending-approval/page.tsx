import { signOut } from "@/app/login/actions";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-zinc-900">Awaiting approval</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your account is pending approval by an administrator. You will be able
          to access the dashboard once approved.
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Please contact <span className="font-medium text-zinc-700">ritika@monetafinancials.in</span> if
          you need access urgently.
        </p>
        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
