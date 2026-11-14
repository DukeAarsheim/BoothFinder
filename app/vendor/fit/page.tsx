import type { Metadata } from "next";
import Notice from "@/components/ui/Notice";
import BrandProfileForm from "@/components/vendor/BrandProfileForm";
import VendorPage from "@/components/vendor/VendorPage";

export const metadata: Metadata = { title: "Fit calculator" };

// This page owns the brand's INPUTS. The scoring math (MASTER.md §4, /lib/scoring)
// and the re-ranked list are separate Fit Score cards; they read the saved
// profile with `useBrandProfile()` from lib/vendor/storage.
export default function FitCalculatorPage() {
  return (
    <VendorPage
      title="Fit Calculator"
      intro="Enter your numbers once. They're used to estimate what each event could earn you."
    >
      <div className="space-y-6">
        <BrandProfileForm />
        <div className="max-w-xl">
          <Notice title="Event scores aren't calculated yet" label="Not built yet">
            <p>
              Your numbers are saved and ready. The 0–100 Fit score for each event, and
              the ranked list, arrive with the Fit Score cards.
            </p>
          </Notice>
        </div>
      </div>
    </VendorPage>
  );
}
