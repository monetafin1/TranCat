import { createClient } from "@/lib/supabase/server";
import { approveUser, revokeUser } from "./actions";
import { signOut } from "@/app/login/actions";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, approved, role, created_at")
    .order("created_at");

  const pending = (profiles ?? []).filter((p) => !p.approved);
  const active = (profiles ?? []).filter((p) => p.approved);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <h1 className="text-base font-semibold text-zinc-900">Admin — User Management</h1>
        <div className="flex gap-3">
          <a href="/dashboard" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100">
            ← Dashboard
          </a>
          <form action={signOut}>
            <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-3xl p-6 space-y-8">

        {/* Pending approvals */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">
            Pending approval
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                {pending.length}
              </span>
            )}
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-400 rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center">
              No pending signups.
            </p>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{p.email}</p>
                    {p.full_name && <p className="text-xs text-zinc-500">{p.full_name}</p>}
                    <p className="text-xs text-zinc-400">
                      Signed up {new Date(p.created_at).toLocaleString()}
                    </p>
                  </div>
                  <form action={approveUser.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active users */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Active users</h2>
          <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
            {active.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {p.email}
                    {p.role === "admin" && (
                      <span className="ml-2 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                        admin
                      </span>
                    )}
                  </p>
                  {p.full_name && <p className="text-xs text-zinc-500">{p.full_name}</p>}
                </div>
                {p.role !== "admin" && (
                  <form action={revokeUser.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      Revoke access
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
