const block = "animate-pulse bg-white/[.06]";

export default function LoadingShowPage() {
    return (
        <div className="-mt-14 min-h-screen w-full bg-graphite pt-14">
            <div className="grid w-full grid-cols-1 gap-3.5 px-4 pb-16 pt-7 md:px-6">
                <div className="grid justify-items-center">
                    <div className={`${block} aspect-square w-[min(280px,70vw)] rounded-[20px]`} />
                    <div className={`${block} -mt-6 h-16 w-3/4 max-w-md rounded-xl`} />
                    <div className={`${block} mt-3 h-4 w-48 rounded-md`} />
                </div>
                <div className={`${block} h-[62px] rounded-2xl`} />
                <div className="mt-2 flex gap-[18px] border-b border-line pb-2">
                    {[72, 48, 92, 84].map((width) => (
                        <div key={width} className={`${block} h-4 rounded`} style={{ width }} />
                    ))}
                </div>
                <div className={`${block} h-48 rounded-[18px]`} />
            </div>
        </div>
    );
}
