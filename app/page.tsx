import RoleSelect from "@/components/landing/RoleSelect";
import { uiFont } from "@/lib/vendor/font";

// The scroll-driven 3D hero from MASTER.md §12 is a separate card. When it lands,
// <HeroScroll /> replaces the dark pitch section below; keep <RoleSelect /> right
// after it so both paths stay visible early.
export default function Home() {
  return (
    <main className={`flex flex-1 flex-col ${uiFont.className}`}>
      {/* Dark pitch band, continuous with the site header */}
      <section className="px-6 pt-16 pb-20 text-center sm:pt-20 sm:pb-24">
        <p className="text-sm font-medium text-emerald-400">For small food and drink brands</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">
          Competitors list events. Boothfinder tells you which ones pay.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-400">
          Boothfinder helps small food and drink brands find events that are
          seeking vendors, and shows which ones are worth the booth fee.
        </p>
      </section>

      {/* Light surface (the root theme is dark, so set colors explicitly) */}
      <section className="flex-1 bg-white px-6 py-12 text-neutral-900 [color-scheme:light] sm:py-14">
        <div className="mx-auto w-full max-w-5xl">
          <RoleSelect />
        </div>
      </section>
    </main>
  );
}
