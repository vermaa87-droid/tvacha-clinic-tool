import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/layout/Footer";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function PricingPage() {
  const faqItems = [
    {
      q: "Can I cancel my subscription anytime?",
      a: "Yes, cancel anytime with no lock-in contracts. Your access continues until the end of your billing period.",
    },
    {
      q: "Is setup and training included?",
      a: "Yes! We provide onboarding calls, video training, and email support. Dedicated support is available for all plans.",
    },
    {
      q: "Can I use this on mobile?",
      a: "The platform is optimized for desktop/laptop use. A mobile app for patient-side monitoring is available via the Tvacha consumer app.",
    },
    {
      q: "What if I have more than the standard patient limit?",
      a: "Unlimited patients are included in the Professional Plan. Any number of patients can use your referral code.",
    },
    {
      q: "How is patient data secured?",
      a: "All data is encrypted, HIPAA-compliant, and stored on secure servers. Regular backups and compliance audits are performed.",
    },
  ];

  return (
    <main className="min-h-screen">
      <nav className="bg-primary-50 border-b border-primary-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-text-secondary hover:text-text-primary font-medium"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="text-text-secondary hover:text-text-primary font-medium"
            >
              Sign In
            </Link>
            <Button
              size="sm"
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="py-20 bg-primary-50">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif font-bold text-text-primary mb-4">
            Pricing
          </h1>
          <p className="text-xl text-text-secondary font-light">
            One simple plan for all clinics
          </p>
        </div>
      </section>

      <PricingSection />

      {/* Comparison Section */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-4xl font-serif font-bold text-text-primary text-center mb-12">
            Why Choose Tvacha Clinic?
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary-200">
                  <th className="text-left py-4 px-4 font-semibold text-text-primary">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-primary-500">
                    Tvacha Clinic
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-text-secondary">
                    Manual OPD
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-text-secondary">
                    Competitors
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI Pre-screening", tvacha: true, manual: false, comp: false },
                  { feature: "Prescription Templates", tvacha: true, manual: false, comp: true },
                  { feature: "Patient Analytics", tvacha: true, manual: false, comp: true },
                  { feature: "Appointment Management", tvacha: true, manual: false, comp: true },
                  { feature: "Cost per Month", tvacha: "₹2,000", manual: "₹0 (Manual)", comp: "₹3,000-5,000" },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-primary-200 hover:bg-primary-100 transition-colors"
                  >
                    <td className="py-4 px-4 text-text-primary font-medium">
                      {row.feature}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.tvacha === "boolean" ? (
                        row.tvacha ? (
                          <span className="text-success-text font-bold">✓</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )
                      ) : (
                        <span className="font-semibold text-primary-500">
                          {row.tvacha}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.manual === "boolean" ? (
                        row.manual ? (
                          <span className="text-success-text">✓</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )
                      ) : (
                        <span className="text-text-secondary">{row.manual}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.comp === "boolean" ? (
                        row.comp ? (
                          <span className="text-success-text">✓</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )
                      ) : (
                        <span className="text-text-secondary">{row.comp}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-20 bg-primary-100">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-serif font-bold text-text-primary mb-4">
            Everything in One Platform
          </h2>
          <p className="text-xl text-text-secondary font-light mb-12">
            Built specifically for Indian dermatologists and GPs
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { title: "Manage Your Clinic", desc: "Patients, appointments, prescriptions, and analytics — all in one place." },
              { title: "AI Case Queue", desc: "Coming soon: review AI-screened cases from the consumer app and earn per diagnosis." },
              { title: "Grow Your Practice", desc: "Your referral code links patients directly to your clinic through the Tvacha app." },
            ].map((item) => (
              <div key={item.title} className="bg-primary-50 border border-primary-200 rounded-lg p-6">
                <h3 className="font-serif font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-text-secondary text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="text-4xl font-serif font-bold text-text-primary text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqItems.map((item, idx) => (
              <details
                key={idx}
                className="border border-primary-200 rounded-lg p-6 cursor-pointer group"
              >
                <summary className="font-semibold text-text-primary text-lg flex justify-between items-center">
                  {item.q}
                  <span className="text-primary-500 text-2xl group-open:rotate-180 transition-transform">
                    +
                  </span>
                </summary>
                <p className="text-text-secondary mt-4">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary-500 text-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-serif font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start your 2-week free trial today. No credit card required.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="bg-surface text-primary-500 hover:bg-primary-50"
          >
            <Link href="/signup">Start Your Free Trial</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
