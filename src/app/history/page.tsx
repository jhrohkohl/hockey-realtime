import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabase-server";
import { HistoryList } from "@/components/history-list";

export const dynamic = "force-dynamic";

interface HistoryPageProps {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 50;

export default async function HistoryPage(props: HistoryPageProps) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseServerClient();

  const { data: games, count } = await supabase
    .from("games")
    .select("*", { count: "exact" })
    .order("game_date", { ascending: false })
    .order("start_time_utc", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">All Games</h1>
        <Link href="/" className="btn btn-ghost btn-sm">
          &larr; Today
        </Link>
      </div>
      <p className="text-base-content/70 mb-8">
        {count ?? 0} games loaded &middot; Page {page} of {totalPages}
      </p>

      <HistoryList games={games ?? []} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={`/history?page=${page - 1}`}
              className="btn btn-sm btn-ghost"
            >
              &larr; Prev
            </Link>
          )}
          <span className="btn btn-sm btn-disabled">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/history?page=${page + 1}`}
              className="btn btn-sm btn-ghost"
            >
              Next &rarr;
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
