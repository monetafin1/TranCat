import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import DashboardClient from "./DashboardClient";
import type { Category, Tenant } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: tenants }, { data: categories }, { data: userData }] =
    await Promise.all([
      supabase.from("tenants").select("id, name").order("name"),
      supabase
        .from("categories")
        .select("id, group_name, name, type")
        .order("group_name")
        .order("name"),
      supabase.auth.getUser(),
    ]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">
            Transaction Categorizer
          </h1>
          <p className="text-xs text-zinc-500">
            {userData.user?.email}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Sign out
          </button>
        </form>
      </header>

      <DashboardClient
        tenants={(tenants ?? []) as Tenant[]}
        categories={(categories ?? []) as Category[]}
      />
    </div>
  );
}
