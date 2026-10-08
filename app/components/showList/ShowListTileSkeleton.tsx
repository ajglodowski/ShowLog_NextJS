import Link from "next/link";

export default function ShowsListTileSkeleton({listId}: {listId: number}) {

  return (
    <Link href={`/list/${listId}`} className="glass block h-[250px] w-[250px] flex-none overflow-hidden rounded-[20px]">
      <div className="h-[150px] animate-pulse bg-white/[.06]" />
      <div className="grid animate-pulse gap-2 px-3 pt-3">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="h-3 w-44 rounded bg-white/[.06]" />
      </div>
    </Link>
  )
}
