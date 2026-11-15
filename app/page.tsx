import LandingHero from "@/components/landing/LandingHero";

// Static landing hero. The scroll-driven 3D hero from MASTER.md §12 is a separate
// card; if it lands, <HeroScroll /> replaces <LandingHero /> here.
// The primary button leads to /start, where the visitor picks Vendor or Event Host.
export default function Home() {
  return <LandingHero />;
}
