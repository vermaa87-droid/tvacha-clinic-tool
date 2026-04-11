import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service for Tvacha Clinic — clinic management and AI-assisted screening for licensed dermatologists in India.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="April 11, 2026">
      <p>
        Welcome to <strong>Tvacha Clinic</strong>. By accessing or using our website, desktop
        application, or any related services (collectively, the &quot;Service&quot;), you agree to
        be bound by these Terms of Service. If you do not agree, please do not use the Service.
      </p>

      <h2>1. Nature of the Service</h2>
      <p>
        Tvacha Clinic is a clinic management software platform designed for licensed medical
        professionals practicing dermatology in India. It is <strong>not</strong> a medical
        device, and it does not directly provide medical care to patients. The Service is a
        productivity and decision support tool used by doctors during their normal clinical
        practice.
      </p>

      <h2>2. AI Screening is Advisory Only</h2>
      <p>
        Our AI-assisted skin condition screening feature provides preliminary, advisory
        suggestions to support a doctor&apos;s clinical workflow. It is <strong>not</strong> a
        diagnostic tool. AI-generated outputs must always be reviewed and confirmed by a qualified
        medical professional before being used to inform any clinical decision. The AI feature is
        provided strictly as an aid to — not a substitute for — professional medical judgment.
      </p>

      <h2>3. Doctor Responsibility</h2>
      <p>
        All clinical decisions, including diagnoses, treatment plans, prescriptions, and follow-up
        care, are the sole responsibility of the treating doctor. Tvacha Clinic and its operators
        are not responsible for any clinical outcomes resulting from the use of the Service. By
        using the Service, you acknowledge that you remain fully responsible for your professional
        practice.
      </p>

      <h2>4. Eligibility</h2>
      <p>You may use the Service only if you:</p>
      <ul>
        <li>Are a licensed medical practitioner in India with a valid medical registration</li>
        <li>Are using the Service in the course of your professional medical practice</li>
        <li>Are at least 18 years of age</li>
        <li>Have the legal capacity to enter into a binding agreement</li>
      </ul>
      <p>
        We reserve the right to verify your medical registration and to suspend any account where
        we cannot confirm valid licensure.
      </p>

      <h2>5. Account &amp; Security</h2>
      <p>
        You are responsible for maintaining the confidentiality of your login credentials and for
        all activity that occurs under your account. You must notify us immediately of any
        unauthorized access. You may not share your account with other practitioners or with
        unlicensed personnel.
      </p>

      <h2>6. Patient Data &amp; Consent</h2>
      <p>
        When you upload patient information, photographs, or other data to the Service, you
        confirm that you have obtained the patient&apos;s informed consent to do so. You are
        responsible for handling patient data in accordance with the Digital Personal Data
        Protection Act, 2023 and all other applicable laws.
      </p>

      <h2>7. Acceptable Use</h2>
      <p>You agree that you will not:</p>
      <ul>
        <li>Use the Service for any unlawful, deceptive, or harmful purpose</li>
        <li>Upload data that you do not have the right to upload</li>
        <li>
          Attempt to reverse engineer, scrape, or interfere with the Service or its security
          features
        </li>
        <li>Use the Service to provide medical advice you are not qualified to give</li>
        <li>Misrepresent your professional credentials</li>
      </ul>
      <p>
        We reserve the right to suspend or terminate accounts that violate these terms or that
        are used in a manner that endangers patient safety or platform integrity.
      </p>

      <h2>8. Service &quot;As Is&quot;</h2>
      <p>
        The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the
        fullest extent permitted by law, Tvacha Clinic disclaims all warranties, express or
        implied, including warranties of merchantability, fitness for a particular purpose, and
        non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or
        that any AI output will be accurate.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Tvacha Clinic and its operators shall not be
        liable for any indirect, incidental, special, consequential, or punitive damages, or any
        loss of profits, revenue, data, or goodwill, arising out of or in connection with your
        use of the Service. Our total liability for any claim arising from the Service is limited
        to the amount you paid us for the Service in the three months preceding the claim.
      </p>

      <h2>10. Subscription &amp; Fees</h2>
      <p>
        Some features of the Service may require a paid subscription. Fees, billing cycles, and
        cancellation terms are described on our pricing page. You may cancel at any time, and
        access continues until the end of the paid period. Refunds, if any, are provided at our
        discretion.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may delete your account at any time. We may suspend or terminate your access to the
        Service if we believe you have violated these terms, if your medical registration cannot
        be verified, or if continued access would create legal or safety risk. Upon termination,
        your data will be handled in accordance with our Privacy Policy.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms of Service from time to time. We will notify registered users
        of significant changes. Your continued use of the Service after changes are posted
        constitutes acceptance of the updated terms.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These Terms of Service are governed by the laws of India. Any disputes arising out of or
        relating to the Service shall be subject to the exclusive jurisdiction of the courts in
        India.
      </p>

      <h2>14. Contact</h2>
      <p>
        For questions about these terms, contact us at{" "}
        <a href="mailto:support@tvacha-clinic.com">support@tvacha-clinic.com</a>.
      </p>
    </LegalPageShell>
  );
}
