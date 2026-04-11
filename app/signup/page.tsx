"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import {
  useFormValidation,
  isFilled,
  isValidEmail,
  isValidIndianPhone,
} from "@/lib/use-form-validation";
import { FieldError, FormErrorSummary } from "@/components/ui/FieldError";

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
  const router = useRouter();
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
  const [apiError, setApiError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);

  const { errors, setFieldRef, validateAll, clearError } = useFormValidation();

  // Friendly labels for the FormErrorSummary
  const fieldLabels: Record<string, string> = {
    doctorName: "Full Name",
    email: "Email",
    phone: "Phone Number",
    password: "Password",
    confirmPassword: "Confirm Password",
    qualifications: "Qualifications",
    registrationNumber: "Medical Registration Number",
    stateMedicalCouncil: "State Medical Council",
    clinicName: "Clinic Name",
    clinicCity: "Clinic City",
    clinicState: "Clinic State",
    agreeTerms: "Terms of Service",
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  // On-blur per-field validation for format-sensitive fields
  const handleEmailBlur = () => {
    if (!formData.email.trim()) return;
    if (!isValidEmail(formData.email)) {
      // setError directly via the hook would be cleaner, but we just re-run
      // the same rule the submit uses so users see the same message twice.
      validateAll([
        {
          field: "email",
          message: "Please enter a valid email address",
          valid: isValidEmail(formData.email),
        },
      ]);
    }
  };
  const handlePhoneBlur = () => {
    if (!formData.phone.trim()) return;
    if (!isValidIndianPhone(formData.phone)) {
      validateAll([
        {
          field: "phone",
          message: "Please enter a valid 10-digit phone number",
          valid: isValidIndianPhone(formData.phone),
        },
      ]);
    }
  };
  const handlePasswordBlur = () => {
    if (!formData.password) return;
    if (formData.password.length < 6) {
      validateAll([
        {
          field: "password",
          message: "Password must be at least 6 characters",
          valid: formData.password.length >= 6,
        },
      ]);
    }
  };
  const handleConfirmPasswordBlur = () => {
    if (!formData.confirmPassword) return;
    if (formData.password !== formData.confirmPassword) {
      validateAll([
        {
          field: "confirmPassword",
          message: "Passwords do not match",
          valid: formData.password === formData.confirmPassword,
        },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");

    const ok = validateAll([
      { field: "doctorName", message: "Please enter your full name", valid: isFilled(formData.doctorName) },
      { field: "email", message: "Please enter your email", valid: isFilled(formData.email) },
      { field: "email", message: "Please enter a valid email address", valid: isValidEmail(formData.email) },
      { field: "phone", message: "Please enter your phone number", valid: isFilled(formData.phone) },
      { field: "phone", message: "Please enter a valid 10-digit phone number", valid: isValidIndianPhone(formData.phone) },
      { field: "password", message: "Please choose a password", valid: isFilled(formData.password) },
      { field: "password", message: "Password must be at least 6 characters", valid: formData.password.length >= 6 },
      { field: "confirmPassword", message: "Please confirm your password", valid: isFilled(formData.confirmPassword) },
      { field: "confirmPassword", message: "Passwords do not match", valid: formData.password === formData.confirmPassword },
      { field: "qualifications", message: "Please enter your qualifications", valid: isFilled(formData.qualifications) },
      { field: "registrationNumber", message: "Please enter your medical registration number", valid: isFilled(formData.registrationNumber) },
      { field: "stateMedicalCouncil", message: "Please select a state medical council", valid: isFilled(formData.stateMedicalCouncil) },
      { field: "clinicName", message: "Please enter your clinic name", valid: isFilled(formData.clinicName) },
      { field: "clinicCity", message: "Please enter your clinic city", valid: isFilled(formData.clinicCity) },
      { field: "clinicState", message: "Please enter your clinic state", valid: isFilled(formData.clinicState) },
      { field: "agreeTerms", message: "Please accept the Terms of Service", valid: agreeTerms },
    ]);

    if (!ok) return;

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
      setApiError(error);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setShowSuccess(true);
    }
  };

  // ── Shared input style helpers ──
  const inputBase =
    "w-full px-4 py-3 rounded-lg outline-none transition-all text-[var(--auth-input-text)] placeholder-[var(--auth-input-placeholder)]";
  const inputStyle = {
    background: "var(--auth-input-bg)",
    border: "1px solid var(--auth-input-border)",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#b8936a";
    e.target.style.boxShadow = "0 0 0 3px rgba(184,147,106,0.14)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--auth-input-border)";
    e.target.style.boxShadow = "none";
  };
  const onSelectFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.target.style.borderColor = "#b8936a";
    e.target.style.boxShadow = "0 0 0 3px rgba(184,147,106,0.14)";
  };
  const onSelectBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.target.style.borderColor = "var(--auth-input-border)";
    e.target.style.boxShadow = "none";
  };

  const labelMuted = { color: "var(--auth-label-color)" };
  const req = <span style={{ color: "#c44a4a" }}>*</span>;

  return (
    <main className="min-h-screen flex flex-col md:flex-row">

      {/* ── Success Modal — unchanged ── */}
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
            <div
              className="rounded-xl px-4 py-3 text-center"
              style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.25)" }}
            >
              <p className="text-sm" style={{ color: "#2a2218" }}>
                WhatsApp{" "}
                <a
                  href="https://wa.me/917881154003?text=Hi%2C%20I%20just%20signed%20up%20on%20Tvacha%20Clinic%20Tool.%20Please%20verify%20my%20account."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                  style={{ color: "#25d366" }}
                >
                  +91 7881154003
                </a>{" "}
                with your details to get verified in less than an hour.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full bg-[#7a5c35] hover:bg-[#5c4527] text-white font-semibold"
              onClick={() => {
                useAuthStore.getState().signOut();
                router.push("/login");
              }}
            >
              {t("signup_goto_login")}
            </Button>
          </div>
        </div>
      )}

      {/* ── MOBILE TOP NAV ── */}
      <nav
        className="md:hidden border-b border-primary-200 px-4 py-4 flex items-center justify-between"
        style={{ background: "rgba(250,248,244,0.95)" }}
      >
        <div
          onClick={() => { router.push('/'); }}
          style={{ cursor: 'pointer', position: 'relative', zIndex: 9999 }}
        >
          <Logo />
        </div>
        <LanguageToggle />
      </nav>

      {/* ── LEFT BRANDED PANEL (desktop only, sticky) ── */}
      <div
        className="hidden md:flex md:w-[44%] lg:w-[42%] flex-col relative overflow-hidden"
        style={{
          background: "var(--auth-panel-bg)",
          position: "sticky",
          top: 0,
          height: "100vh",
          flexShrink: 0,
          alignSelf: "flex-start",
        }}
      >
        {/* Subtle decorative curves */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 480 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M -40 200 C 80 180 160 260 240 220 C 320 180 380 100 520 130" fill="none" stroke="rgba(184,147,106,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M -20 480 C 100 450 200 520 300 490 C 380 465 430 400 540 420" fill="none" stroke="rgba(184,147,106,0.10)" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M 60 750 C 160 720 240 780 340 755 C 420 735 460 680 540 700" fill="none" stroke="rgba(184,147,106,0.09)" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M 300 -20 C 340 100 280 200 320 340 C 360 480 420 540 400 680" fill="none" stroke="rgba(184,147,106,0.08)" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        <div className="relative z-10 flex flex-col h-full px-10 lg:px-14 py-10 lg:py-14">

          {/* Logo */}
          <div
            onClick={() => { router.push('/'); }}
            style={{ cursor: 'pointer', position: 'relative', zIndex: 9999 }}
          >
            <Logo />
          </div>

          {/* Tagline block — vertically centered */}
          <div className="flex-1 flex flex-col justify-center -mt-16">
            <p
              className="text-sm font-semibold uppercase mb-6"
              style={{ color: "#7a5c35", letterSpacing: "0.2em" }}
            >
              Create Your Account
            </p>
            <h2
              className="font-serif font-bold leading-snug mb-6"
              style={{ fontSize: "clamp(2rem, 3.2vw, 3rem)", color: "var(--auth-input-text)", maxWidth: "360px" }}
            >
              Intelligence Infrastructure for Modern Dermatology
            </h2>
            <p
              className="text-base leading-relaxed"
              style={{ color: "var(--auth-label-color)", maxWidth: "320px" }}
            >
              AI pre-screening, patient management, and prescription templates — all in one platform built for Indian clinicians.
            </p>

            {/* Gold accent rule */}
            <div
              className="mt-8 h-px w-14 rounded-full"
              style={{ background: "linear-gradient(90deg, #b8936a 0%, transparent 100%)" }}
            />
          </div>

          {/* Trust signal at bottom */}
          <div className="relative z-10 pb-2">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold" style={{ color: "#b8936a" }}>✓</span>
              <span className="text-sm" style={{ color: "var(--auth-label-color)" }}>
                NMC Verified Doctors Only
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="w-full md:flex-1 flex flex-col" style={{ background: "var(--auth-form-bg)" }}>

        {/* Language toggle — desktop top-right */}
        <div className="hidden md:flex justify-end px-8 py-5">
          <LanguageToggle />
        </div>

        {/* Form area */}
        <div className="flex-1 px-5 pb-10 pt-8 md:px-10 lg:px-16 md:pb-12 md:pt-2 flex flex-col items-center">
          <div className="w-full max-w-2xl">

            {/* Header */}
            <div className="mb-9">
              <h1
                className="font-serif font-bold text-text-primary"
                style={{ fontSize: "2rem" }}
              >
                {t("signup_title")}
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--auth-label-color)" }}>
                {t("signup_subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {apiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {apiError}
                </div>
              )}

              {/* Full Name — primary field */}
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={labelMuted}>
                  {t("signup_fullname")} {req}
                </label>
                <input
                  ref={setFieldRef("doctorName")}
                  name="doctorName"
                  placeholder="Dr. Priya Sharma"
                  value={formData.doctorName}
                  onChange={handleChange}
                  className={`${inputBase} ${errors.doctorName ? "field-error-input" : ""}`}
                  style={{ ...inputStyle }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <FieldError message={errors.doctorName} />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                    {t("signup_email")} {req}
                  </label>
                  <input
                    ref={setFieldRef("email")}
                    name="email"
                    type="email"
                    placeholder="dr.priya@clinic.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={`${inputBase} ${errors.email ? "field-error-input" : ""}`}
                    style={{ ...inputStyle }}
                    onFocus={onFocus}
                    onBlur={(e) => { onBlur(e); handleEmailBlur(); }}
                  />
                  <FieldError message={errors.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                    {t("signup_phone")} {req}
                  </label>
                  <input
                    ref={setFieldRef("phone")}
                    name="phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    maxLength={15}
                    value={formData.phone}
                    onChange={handleChange}
                    className={`${inputBase} ${errors.phone ? "field-error-input" : ""}`}
                    style={{ ...inputStyle }}
                    onFocus={onFocus}
                    onBlur={(e) => { onBlur(e); handlePhoneBlur(); }}
                  />
                  <FieldError message={errors.phone} />
                </div>
              </div>

              {/* Password + Confirm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                    {t("signup_password")} {req}
                  </label>
                  <input
                    ref={setFieldRef("password")}
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={`${inputBase} ${errors.password ? "field-error-input" : ""}`}
                    style={{ ...inputStyle }}
                    onFocus={onFocus}
                    onBlur={(e) => { onBlur(e); handlePasswordBlur(); }}
                  />
                  <FieldError message={errors.password} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                    {t("signup_confirm_password")} {req}
                  </label>
                  <input
                    ref={setFieldRef("confirmPassword")}
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`${inputBase} ${errors.confirmPassword ? "field-error-input" : ""}`}
                    style={{ ...inputStyle }}
                    onFocus={onFocus}
                    onBlur={(e) => { onBlur(e); handleConfirmPasswordBlur(); }}
                  />
                  <FieldError message={errors.confirmPassword} />
                </div>
              </div>

              {/* Qualifications */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                  {t("signup_qualifications")} {req}
                </label>
                <input
                  ref={setFieldRef("qualifications")}
                  name="qualifications"
                  placeholder="MBBS, MD (Dermatology)"
                  value={formData.qualifications}
                  onChange={handleChange}
                  className={`${inputBase} ${errors.qualifications ? "field-error-input" : ""}`}
                  style={{ ...inputStyle }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <FieldError message={errors.qualifications} />
              </div>

              {/* ── Medical Registration Section ── */}
              <div className="pl-5" style={{ borderLeft: "3px solid #b8936a" }}>
                <p
                  className="text-xs font-semibold uppercase mb-4"
                  style={{ color: "#2d4a3e", letterSpacing: "0.18em" }}
                >
                  {t("signup_reg_details")}
                </p>
                <div className="space-y-4">

                  {/* Registration Number — key verification field */}
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelMuted}>
                      <span className="flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8936a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        {t("signup_registration")} {req}
                      </span>
                    </label>
                    <input
                      ref={setFieldRef("registrationNumber")}
                      name="registrationNumber"
                      placeholder="e.g. MCI/2010-0245 or DMC/R/2015/4521"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      className={`${inputBase} ${errors.registrationNumber ? "field-error-input" : ""}`}
                      style={{ ...inputStyle }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                    <FieldError message={errors.registrationNumber} />
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      {t("signup_registration_help")}
                    </p>
                  </div>

                  {/* State Medical Council */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                      {t("signup_council")} {req}
                    </label>
                    <select
                      ref={setFieldRef("stateMedicalCouncil")}
                      name="stateMedicalCouncil"
                      value={formData.stateMedicalCouncil}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg outline-none transition-all ${
                        !formData.stateMedicalCouncil ? "text-[var(--auth-input-placeholder)]" : "text-[var(--auth-input-text)]"
                      } ${errors.stateMedicalCouncil ? "field-error-input" : ""}`}
                      style={{ ...inputStyle }}
                      onFocus={onSelectFocus}
                      onBlur={onSelectBlur}
                    >
                      <option value="" disabled>{t("signup_council_placeholder")}</option>
                      {STATE_MEDICAL_COUNCILS.map((council) => (
                        <option key={council} value={council} className="text-[var(--auth-input-text)]">
                          {council}
                        </option>
                      ))}
                    </select>
                    <FieldError message={errors.stateMedicalCouncil} />
                  </div>
                </div>
              </div>

              {/* Clinic Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                  {t("signup_clinic_name")} {req}
                </label>
                <input
                  ref={setFieldRef("clinicName")}
                  name="clinicName"
                  placeholder="Derma Care Clinic"
                  value={formData.clinicName}
                  onChange={handleChange}
                  className={`${inputBase} ${errors.clinicName ? "field-error-input" : ""}`}
                  style={{ ...inputStyle }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <FieldError message={errors.clinicName} />
              </div>

              {/* City + State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                    {t("signup_clinic_city")} {req}
                  </label>
                  <input
                    ref={setFieldRef("clinicCity")}
                    name="clinicCity"
                    placeholder="Mumbai"
                    value={formData.clinicCity}
                    onChange={handleChange}
                    className={`${inputBase} ${errors.clinicCity ? "field-error-input" : ""}`}
                    style={{ ...inputStyle }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <FieldError message={errors.clinicCity} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelMuted}>
                    {t("signup_clinic_state")} {req}
                  </label>
                  <input
                    ref={setFieldRef("clinicState")}
                    name="clinicState"
                    placeholder="Maharashtra"
                    value={formData.clinicState}
                    onChange={handleChange}
                    className={`${inputBase} ${errors.clinicState ? "field-error-input" : ""}`}
                    style={{ ...inputStyle }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <FieldError message={errors.clinicState} />
                </div>
              </div>

              {/* Terms */}
              <div>
                <div
                  ref={setFieldRef("agreeTerms")}
                  className={`flex items-start gap-2.5 rounded-md ${errors.agreeTerms ? "p-2 -m-2 field-error-input" : ""}`}
                >
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => {
                      setAgreeTerms(e.target.checked);
                      if (e.target.checked) clearError("agreeTerms");
                    }}
                    className="mt-1 flex-shrink-0"
                  />
                  <label htmlFor="terms" className="text-sm" style={{ color: "var(--auth-label-color)" }}>
                    {t("signup_agree")}{" "}
                    <Link
                      href="/terms"
                      className="transition-colors hover:text-[#9a6a3a]"
                      style={{ color: "#b8936a" }}
                    >
                      {t("signup_terms")}
                    </Link>{" "}
                    {t("signup_and")}{" "}
                    <Link
                      href="/privacy"
                      className="transition-colors hover:text-[#9a6a3a]"
                      style={{ color: "#b8936a" }}
                    >
                      {t("signup_privacy")}
                    </Link>
                  </label>
                </div>
                <FieldError message={errors.agreeTerms} />
              </div>

              <FormErrorSummary errors={errors} fieldLabels={fieldLabels} />

              <Button
                type="submit"
                loading={isLoading}
                className="w-full bg-[#7a5c35] hover:bg-[#5c4527] text-white font-semibold tracking-wide mt-1"
                size="lg"
              >
                {t("signup_button")}
              </Button>

              {/* Verification note with clock icon */}
              <div className="flex items-start gap-2.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2d4a3e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5"
                >
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p className="text-xs leading-relaxed" style={{ color: "var(--auth-label-color)" }}>
                  {t("signup_verification_note")}
                </p>
              </div>
            </form>

            {/* Divider + sign-in link */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex-1 border-t" style={{ borderColor: "var(--color-separator)" }} />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>or</span>
              <div className="flex-1 border-t" style={{ borderColor: "var(--color-separator)" }} />
            </div>
            <p className="text-center text-sm mt-4 mb-2" style={{ color: "var(--auth-label-color)" }}>
              {t("signup_have_account")}{" "}
              <Link
                href="/login"
                className="font-medium transition-colors hover:text-[#9a6a3a]"
                style={{ color: "#b8936a" }}
              >
                {t("signup_signin")}
              </Link>
            </p>

          </div>
        </div>

        <Footer />
      </div>

    </main>
  );
}
