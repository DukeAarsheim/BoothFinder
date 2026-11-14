import RoleSelect from "@/components/landing/RoleSelect";

// The scroll-driven 3D hero from MASTER.md §12 is a separate card. When it lands,
// <HeroScroll /> goes at the top of this page; keep <RoleSelect /> near the top
// so both paths stay visible early.
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
      <div className="mt-12">
        <RoleSelect />
      </div>
    </main>
  );
}
