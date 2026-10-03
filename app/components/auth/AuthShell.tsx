import { getPopularShows } from "@/app/components/LandingService";
import { washFromRgb } from "@/app/utils/wash";
import { CSSProperties, ReactNode } from "react";

// Auth form parts from docs/brand-guide.html: caps field labels, well inputs, one orange primary button.
export const authLabel = "text-[11px] font-semibold uppercase tracking-[.08em] text-stone";
export const authInput = "well h-[46px] w-full rounded-xl px-3.5 text-[14.5px] text-chalk outline-none placeholder:text-dim focus-visible:ring-2 focus-visible:ring-orange";
export const authHint = "text-[12.5px] text-dim";
export const authPrimaryButton = "inline-flex h-[46px] w-full items-center justify-center rounded-xl bg-orange text-[14.5px] font-semibold text-orange-ink transition-colors hover:bg-orange/90 outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-graphite";
export const authLink = "text-chalk underline-offset-4 hover:underline outline-none focus-visible:underline";

/** The ?message= a server action redirected back with. */
export function AuthMessage({ message }: { message: string | undefined }) {
    if (!message) return null;
    return (
        <p role="alert" className="well rounded-xl px-3.5 py-2.5 text-[13.5px] text-destructive">
            {message}
        </p>
    );
}

type AuthShellProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    // Sits under the glass panel: the link to the other auth page
    footer?: ReactNode;
};

/** Graphite ground with a page title and one glass panel, shared by the auth pages. */
export async function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
    // Same wash as the landing page: the most popular show's
    const [topShow] = await getPopularShows(1);
    const wash = topShow ? washFromRgb(topShow.averageColor) : null;
    const style: CSSProperties | undefined = wash
        ? { backgroundImage: `linear-gradient(180deg, ${wash} 0%, var(--graphite) 90svh)`, backgroundRepeat: "no-repeat" }
        : undefined;
    return (
        <div className="-mt-14 flex min-h-screen w-full flex-col justify-center bg-graphite px-4 pb-16 pt-[88px] text-chalk" style={style}>
            <div className="animate-in mx-auto grid w-full max-w-[400px] gap-4">
                <header>
                    <h1 className="text-[44px] font-black leading-[.9] tracking-[-.065em]">{title}</h1>
                    {subtitle && <p className="mt-2 text-[14.5px] text-stone">{subtitle}</p>}
                </header>
                <div className="glass rounded-[20px] p-3">{children}</div>
                {footer && <p className="text-center text-[13.5px] text-stone">{footer}</p>}
            </div>
        </div>
    );
}
