import Link from "next/link";

// The scroll-driven 3D hero from MASTER.md §12 is a separate card. When it lands,
// <HeroScroll /> goes at the top of this page.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
        For small food and drink brands
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-black tracking-tight text-balance sm:text-6xl">
        Competitors list events. Boothfinder tells you which ones pay.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-neutral-300">
        Boothfinder helps small food and drink brands find events that are
        seeking vendors, and shows which ones are worth the booth fee.
      </p>
      <div className="mt-8">
        <Link
          href="/events"
          className="inline-flex rounded-full bg-emerald-400 px-6 py-3 font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
        >
          Browse events
        </Link>
      </div>
    </main>
  );
}
