const block = "animate-pulse bg-white/[.06]";

export default function LoadingActorPage() {
    return (
        <div className="-mt-14 min-h-screen w-full bg-graphite pt-14">
            <div className="mx-auto grid w-full max-w-[680px] gap-4 px-4 pb-16 pt-7">
                <div className="grid justify-items-center">
                    <div className={`${block} aspect-square w-[250px] max-w-[70%] rounded-[20px]`} />
                    <div className={`${block} -mt-6 h-14 w-3/4 max-w-md rounded-xl`} />
                    <div className={`${block} mt-3 h-4 w-24 rounded-md`} />
                </div>
                <div className={`${block} h-[62px] rounded-2xl`} />
                <div className={`${block} mt-4 h-6 w-32 rounded-md`} />
                <div className="glass grid gap-0.5 rounded-2xl p-1.5">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3.5 px-2 py-[7px]">
                            <div className={`${block} h-[46px] w-[46px] flex-none rounded-[9px]`} />
                            <div className="grid flex-1 gap-1.5">
                                <div className={`${block} h-4 w-2/5 rounded`} />
                                <div className={`${block} h-3 w-1/4 rounded`} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
