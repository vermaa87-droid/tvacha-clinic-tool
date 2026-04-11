import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tvacha Clinic collects, uses, and protects doctor and patient information.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="April 11, 2026">
      <p>
        <strong>Tvacha Clinic</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the website
        tvacha-clinic.com and the Tvacha Clinic application (the &quot;Service&quot;). This privacy
        policy explains how we collect, use, store, and protect your personal information when
        you use our Service.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect the following categories of information:</p>

      <p>
        <em>Account Information:</em> When a doctor or clinic registers, we collect their name,
        email address, phone number, clinic name, clinic address, medical registration number, and
        professional qualifications.
      </p>

      <p>
        <em>Patient Information:</em> When a doctor adds a patient through our Service, the
        following patient data is stored: patient name, age, gender, phone number, medical
        history, allergies, chronic conditions, and visit records.
      </p>

      <p>
        <em>Medical Images:</em> Photographs of skin conditions uploaded by the doctor or clinic
        staff for the purpose of AI-assisted screening and diagnosis support. These images are
        stored securely and linked to the patient&apos;s record.
      </p>

      <p>
        <em>Screening Data:</em> Responses to clinical screening questions including symptom
        duration, pain level, body location, and skin type (Fitzpatrick scale).
      </p>

      <p>
        <em>Prescription Data:</em> Diagnosis information, prescribed medicines, dosages,
        instructions, consultation fees, and follow-up dates.
      </p>

      <p>
        <em>Usage Data:</em> We automatically collect information about how you interact with our
        Service, including pages visited, features used, browser type, device information, and IP
        address.
      </p>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide and maintain our clinic management Service</li>
        <li>
          Run AI-assisted skin condition screening to support (not replace) the doctor&apos;s
          clinical judgment
        </li>
        <li>Generate prescription documents</li>
        <li>Manage patient records, appointments, and follow-ups</li>
        <li>Provide clinic analytics and reporting</li>
        <li>Improve and optimize our AI screening models</li>
        <li>Send important service-related communications</li>
        <li>Provide technical support</li>
      </ul>

      <h2>3. AI Screening Disclaimer</h2>
      <p>
        Our AI skin screening feature is a clinical decision support tool only. It does not
        provide medical diagnoses. All AI-generated results are preliminary screenings that must
        be reviewed, confirmed, or overridden by a qualified medical professional. The final
        diagnosis and treatment decisions are always made by the treating doctor.
      </p>

      <h2>4. Data Storage and Security</h2>
      <ul>
        <li>
          All data is stored on secure cloud servers provided by Supabase (hosted on AWS
          infrastructure)
        </li>
        <li>Data is encrypted in transit (TLS/SSL) and at rest</li>
        <li>
          Access to patient data is restricted to the registered doctor/clinic account that
          created the record
        </li>
        <li>
          We implement row-level security to ensure no clinic can access another clinic&apos;s
          data
        </li>
        <li>We perform regular security reviews of our infrastructure</li>
        <li>Medical images are stored in secure, access-controlled storage buckets</li>
      </ul>

      <h2>5. Data Sharing</h2>
      <p>
        We do <strong>NOT</strong> sell, rent, or trade any personal or patient information to
        third parties.
      </p>
      <p>We may share data only in the following limited circumstances:</p>
      <ul>
        <li>
          <em>With service providers:</em> We use third-party services (Supabase for database,
          Vercel for hosting) that process data on our behalf under strict data processing
          agreements
        </li>
        <li>
          <em>Legal compliance:</em> If required by law, court order, or government regulation
        </li>
        <li>
          <em>With patient consent:</em> If a doctor chooses to share a prescription via WhatsApp
          or email to a patient, this is initiated by the doctor
        </li>
      </ul>

      <h2>6. Data Retention</h2>
      <ul>
        <li>Account data is retained as long as the account is active</li>
        <li>
          Patient records are retained as long as the associated doctor&apos;s account is active
        </li>
        <li>
          If a doctor deletes their account, all associated patient records, images,
          prescriptions, and clinic data are permanently deleted within 30 days
        </li>
        <li>Deleted data cannot be recovered after this period</li>
      </ul>

      <h2>7. Your Rights</h2>
      <p>As a user of our Service, you have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your account and all associated data</li>
        <li>Export your patient data in standard formats (CSV)</li>
        <li>Withdraw consent for data processing at any time by deleting your account</li>
      </ul>

      <h2>8. Doctor&apos;s Responsibilities</h2>
      <p>Doctors and clinic staff using our Service are responsible for:</p>
      <ul>
        <li>
          Obtaining appropriate consent from patients before uploading their photographs and
          personal information
        </li>
        <li>Ensuring the accuracy of patient data entered into the system</li>
        <li>
          Complying with all applicable medical regulations and data protection laws
        </li>
        <li>Not sharing login credentials with unauthorized personnel</li>
      </ul>

      <h2>9. Cookies</h2>
      <p>
        We use essential cookies to maintain your login session and remember your preferences
        (language, theme). We do not use advertising or tracking cookies.
      </p>

      <h2>10. Children&apos;s Privacy</h2>
      <p>
        Our Service is designed for use by medical professionals. We do not knowingly collect
        information from children under 18. Patient records of minors are entered by the treating
        doctor under their professional responsibility.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this privacy policy from time to time. We will notify registered users of
        significant changes via email or in-app notification. Continued use of the Service after
        changes constitutes acceptance of the updated policy.
      </p>

      <h2>12. Compliance</h2>
      <p>
        We are committed to complying with the Digital Personal Data Protection Act, 2023 (DPDP
        Act) of India and all applicable data protection regulations.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        If you have questions about this privacy policy or our data practices, contact us at:
      </p>
      <p>
        Email: <a href="mailto:privacy@tvacha-clinic.com">privacy@tvacha-clinic.com</a>
        <br />
        Website: <a href="https://www.tvacha-clinic.com">https://www.tvacha-clinic.com</a>
      </p>
    </LegalPageShell>
  );
}
