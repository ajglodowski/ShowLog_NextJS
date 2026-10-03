// Actor photos come from TVmaze under CC BY-SA, which requires attribution
export function TvmazeCredit() {
    return (
        <p className="text-[11.5px] text-stone">
            Actor photos from{" "}
            <a href="https://www.tvmaze.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-chalk">
                TVmaze
            </a>{" "}
            (
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-chalk">
                CC BY-SA
            </a>
            )
        </p>
    );
}
