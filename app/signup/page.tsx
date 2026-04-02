"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const STATE_MEDICAL_COUNCILS = [
  "National Medical Commission (NMC)",
  "Andhra Pradesh Medical Council",
  "Bihar Medical Council",
  "Chhattisgarh Medical Council",
  "Delhi Medical Council",
  "Goa Medical Council",
  "Gujarat Medical Council",
  "Haryana Medical Council",
  "Himachal Pradesh Medical Council",
  "Jammu & Kashmir Medical Council",
  "Jharkhand Medical Council",
  "Karnataka Medical Council",
  "Kerala Medical Council",
  "Madhya Pradesh Medical Council",
  "Maharashtra Medical Council",
  "Manipur Medical Council",
  "Meghalaya Medical Council",
  "Mizoram Medical Council",
  "Nagaland Medical Council",
  "Odisha Medical Council",
  "Punjab Medical Council",
  "Rajasthan Medical Council",
  "Sikkim Medical Council",
  "Tamil Nadu Medical Council",
  "Telangana Medical Council",
  "Tripura Medical Council",
  "Uttar Pradesh Medical Council",
  "Uttarakhand Medical Council",
  "West Bengal Medical Council",
  "Other",
];

export default function SignupPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    doctorName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    qualifications: "",
    registrationNumber: "",
    stateMedicalCouncil: "",
    clinicName: "",
    clinicCity: "",
    clinicState: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.stateMedicalCouncil) {
      setError(t("signup_error_council"));
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t("signup_error_password_match"));
      return;
    }
    if (formData.password.length < 6) {
      setError(t("signup_error_password_length"));
      return;
    }
    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits.length !== 10 && !(phoneDigits.length === 12 && phoneDigits.startsWith("91"))) {
        setError("Please enter a valid 10-digit phone number.");
        return;
      }
    }

    setIsLoading(true);

    const { error } = await signUp(formData.email, formData.password, {
      full_name: formData.doctorName,
      qualifications: formData.qualifications,
      registration_number: formData.registrationNumber,
      state_medical_council: formData.stateMedicalCouncil,
      clinic_name: formData.clinicName,
      clinic_city: formData.clinicCity,
      clinic_state: formData.clinicState,
      phone: formData.phone,
    });

    if (error) {
      setError(error);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setShowSuccess(true);
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="w-full max-w-md rounded-2xl p-5 sm:p-8 text-center space-y-5 mx-4"
            style={{
              background: "#f5f2ed",
              border: "1px solid rgba(184,147,106,0.35)",
              boxShadow: "0 8px 40px rgba(26,22,18,0.15)",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "rgba(74,154,74,0.12)" }}
            >
              <span className="text-3xl">&#10003;</span>
            </div>
            <h2 className="text-2xl font-serif font-semibold text-text-primary">
              {t("signup_success_title")}
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              {t("signup_success_msg")}
            </p>
            <p className="text-text-muted text-xs">
              {t("signup_success_verify")}
            </p>
            <Button
              size="lg"
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold"
              onClick={() => {
                useAuthStore.getState().signOut();
                window.location.href = "/login";
              }}
            >
              {t("signup_goto_login")}
            </Button>
          </div>
        </div>
      )}

      <nav className="border-b border-primary-200" style={{ background: "rgba(250,248,244,0.90)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
          <Logo />
          <LanguageToggle />
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 md:px-8 py-8 md:py-20">
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text-primary">
                {t("signup_title")}
              </h1>
              <p className="text-text-secondary mt-2">
                {t("signup_subtitle")}
              </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label={t("signup_fullname")}
                  name="doctorName"
                  placeholder="Dr. Priya Sharma"
                  value={formData.doctorName}
                  onChange={handleChange}
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={t("signup_email")}
                    name="email"
                    type="email"
                    placeholder="dr.priya@clinic.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label={t("signup_phone")}
                    name="phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    maxLength={15}
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={t("signup_password")}
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label={t("signup_confirm_password")}
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Input
                  label={t("signup_qualifications")}
                  name="qualifications"
                  placeholder="MBBS, MD (Dermatology)"
                  value={formData.qualifications}
                  onChange={handleChange}
                  required
                />

                <div className="border border-primary-300 rounded-lg p-4 bg-primary-50 space-y-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {t("signup_reg_details")}
                  </p>
                  <Input
                    label={t("signup_registration")}
                    name="registrationNumber"
                    placeholder="e.g. MCI/2010-0245 or DMC/R/2015/4521"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    helpText={t("signup_registration_help")}
                    required
                  />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      {t("signup_council")} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="stateMedicalCouncil"
                      value={formData.stateMedicalCouncil}
                      onChange={handleChange}
                      required
                      className={cn(
                        "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors",
                        !formData.stateMedicalCouncil && "text-text-muted"
                      )}
                    >
                      <option value="" disabled>{t("signup_council_placeholder")}</option>
                      {STATE_MEDICAL_COUNCILS.map((council) => (
                        <option key={council} value={council}>{council}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label={t("signup_clinic_name")}
                  name="clinicName"
                  placeholder="Derma Care Clinic"
                  value={formData.clinicName}
                  onChange={handleChange}
                  required
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label={t("signup_clinic_city")}
                    name="clinicCity"
                    placeholder="Mumbai"
                    value={formData.clinicCity}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label={t("signup_clinic_state")}
                    name="clinicState"
                    placeholder="Maharashtra"
                    value={formData.clinicState}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="flex items-start gap-2">
                  <input type="checkbox" id="terms" className="mt-1" required />
                  <label htmlFor="terms" className="text-text-secondary text-sm">
                    {t("signup_agree")}{" "}
                    <Link href="/terms" className="text-primary-500 hover:text-primary-600">
                      {t("signup_terms")}
                    </Link>{" "}
                    {t("signup_and")}{" "}
                    <Link href="/privacy" className="text-primary-500 hover:text-primary-600">
                      {t("signup_privacy")}
                    </Link>
                  </label>
                </div>

                <Button
                  type="submit"
                  loading={isLoading}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold mt-6"
                  size="lg"
                >
                  {t("signup_button")}
                </Button>

                <p className="text-text-muted text-xs text-center leading-relaxed">
                  {t("signup_verification_note")}
                </p>
              </form>

              <div className="mt-6 pt-6 border-t border-primary-200">
                <p className="text-text-secondary text-center">
                  {t("signup_have_account")}{" "}
                  <Link href="/login" className="text-primary-500 font-medium hover:text-primary-600">
                    {t("signup_signin")}
                  </Link>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  );
}
