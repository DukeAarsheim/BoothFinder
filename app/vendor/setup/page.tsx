import type { Metadata } from "next";
import VendorPage from "@/components/vendor/VendorPage";
import VendorSetupForm from "@/components/vendor/VendorSetupForm";

export const metadata: Metadata = { title: "Your account" };

// First stop for a new vendor (components/vendor/RequireVendorSetup.tsx sends
// them here), and the account page afterwards.
export default function VendorSetupPage() {
  return (
    <VendorPage
      title="Your account"
      intro="Tell us about your business and your numbers. Every event's estimated profit is worked out from them."
    >
      <VendorSetupForm />
    </VendorPage>
  );
}
