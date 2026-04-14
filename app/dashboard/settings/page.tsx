"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import { Copy, Check, Mail, Phone, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useFormValidation, isFilled } from "@/lib/use-form-validation";
import { FormErrorSummary } from "@/components/ui/FieldError";

export default function SettingsPage() {
  const { doctor, refreshDoctor } = useAuthStore();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    full_name: doctor?.full_name || "",
    phone: doctor?.phone || "",
    qualifications: doctor?.qualifications || "",
    clinic_name: doctor?.clinic_name || "",
    clinic_address: doctor?.clinic_address || "",
    clinic_city: doctor?.clinic_city || "",
    clinic_state: doctor?.clinic_state || "",
    clinic_pincode: doctor?.clinic_pincode || "",
    signature_url: doctor?.signature_url || "",
    logo_url: doctor?.logo_url || "",
  });

  // Prescription Letterhead state
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(doctor?.signature_url || null);
  const [logoPreview, setLogoPreview] = useState<string | null>(doctor?.logo_url || null);
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);

  // Billing
  const [defaultFee, setDefaultFee] = useState(doctor?.default_consultation_fee ? String(doctor.default_consultation_fee) : "");
  const [savingFee, setSavingFee] = useState(false);

  // GST / Tax
  const [gstin, setGstin] = useState(doctor?.gstin || "");
  const [legalBusinessName, setLegalBusinessName] = useState(doctor?.legal_business_name || "");
  const [stateCode, setStateCode] = useState(doctor?.state_code || "");
  const [savingGst, setSavingGst] = useState(false);
  const [gstMsg, setGstMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const gstForm = useFormValidation();

  // Validation hooks for the three forms on this page
  const profileForm = useFormValidation();
  const letterheadForm = useFormValidation();
  const feeForm = useFormValidation();
  const profileLabels = { full_name: "Doctor Name" };
  const letterheadLabels = { signatureFile: "Signature" };
  const feeLabels = { defaultFee: "Default Fee" };

  const handleSaveGst = async () => {
    if (!doctor) return;
    setGstMsg(null);
    const trimmedGstin = gstin.trim().toUpperCase();
    const trimmedState = stateCode.trim().toUpperCase();
    const gstinValid = !trimmedGstin || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmedGstin);
    const stateValid = !trimmedState || /^[0-9A-Z]{2}$/.test(trimmedState);
    const ok = gstForm.validateAll([
      { field: "gstin", message: t("settings_gst_gstin_invalid"), valid: gstinValid },
      { field: "state_code", message: t("settings_gst_state_code_invalid"), valid: stateValid },
    ]);
    if (!ok) return;

    setSavingGst(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({
          gstin: trimmedGstin || null,
          legal_business_name: legalBusinessName.trim() || null,
          state_code: trimmedState || null,
        })
        .eq("id", doctor.id);
      if (error) throw new Error(error.message);
      await refreshDoctor();
      setGstin(trimmedGstin);
      setStateCode(trimmedState);
      setGstMsg({ kind: "ok", text: t("settings_gst_save_success") });
    } catch (err) {
      console.error("[settings] save gst error:", err);
      setGstMsg({ kind: "err", text: t("settings_gst_save_error") });
    } finally {
      setSavingGst(false);
    }
  };

  const handleSaveDefaultFee = async () => {
    if (!doctor) return;

    const ok = feeForm.validateAll([
      { field: "defaultFee", message: "Please enter a default consultation fee", valid: isFilled(defaultFee) },
      { field: "defaultFee", message: "Please enter a valid amount", valid: !isNaN(parseFloat(defaultFee)) && parseFloat(defaultFee) >= 0 },
    ]);
    if (!ok) return;

    setSavingFee(true);
    try {
      await supabase.from("doctors").update({ default_consultation_fee: parseFloat(defaultFee) || null }).eq("id", doctor.id);
      await refreshDoctor();
    } catch (err) {
      console.error("[settings] save fee error:", err);
    } finally {
      setSavingFee(false);
    }
  };

  const handleLetterheadSave = async () => {
    if (!doctor) return;

    const ok = letterheadForm.validateAll([
      { field: "signatureFile", message: "Please choose a signature or logo file to upload", valid: !!signatureFile || !!logoFile },
    ]);
    if (!ok) return;

    setUploadingLetterhead(true);
    try {
      const uploads: Array<{ type: string; file: File }> = [];
      if (signatureFile) uploads.push({ type: "signature", file: signatureFile });
      if (logoFile) uploads.push({ type: "logo", file: logoFile });

      for (const upload of uploads) {
        const form = new FormData();
        form.append("doctorId", doctor.id);
        form.append("type", upload.type);
        form.append("file", upload.file);
        const res = await fetch("/api/upload-letterhead", { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed to upload ${upload.type}`);
        }
      }
      await refreshDoctor();
      setSignatureFile(null);
      setLogoFile(null);
      alert("Letterhead saved successfully!");
    } catch (err) {
      console.error("[settings] letterhead upload error:", err);
      alert(err instanceof Error ? err.message : "Failed to upload. Please try again.");
    } finally {
      setUploadingLetterhead(false);
    }
  };

  const handleCopyCode = () => {
    if (doctor?.referral_code) {
      navigator.clipboard.writeText(
        `Download Tvacha and use code ${doctor.referral_code} to link with me`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!doctor) return;

    const ok = profileForm.validateAll([
      { field: "full_name", message: "Please enter your name", valid: isFilled(editData.full_name) },
    ]);
    if (!ok) return;

    setSaving(true);
    await supabase.from("doctors").update(editData).eq("id", doctor.id);
    await refreshDoctor();
    setEditing(false);
    setSaving(false);
  };

  const handleStartEdit = () => {
    setEditData({
      full_name: doctor?.full_name || "",
      phone: doctor?.phone || "",
      qualifications: doctor?.qualifications || "",
      clinic_name: doctor?.clinic_name || "",
      clinic_address: doctor?.clinic_address || "",
      clinic_city: doctor?.clinic_city || "",
      clinic_state: doctor?.clinic_state || "",
      clinic_pincode: doctor?.clinic_pincode || "",
      signature_url: doctor?.signature_url || "",
      logo_url: doctor?.logo_url || "",
    });
    setEditing(true);
  };

  if (!doctor) {
    return (
      <main className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-primary-200 rounded w-1/3" />
          <div className="h-64 bg-primary-200 rounded-lg" />
        </div>
      </main>
    );
  }

  const subscriptionLabel =
    doctor.subscription_status === "trial" ? "Free Trial" :
    doctor.subscription_status === "active" ? "Professional" : doctor.subscription_status;

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-text-primary">{t("settings_title")}</h1>
        <p className="text-text-secondary mt-2">{t("settings_subtitle")}</p>
      </div>

      {/* Treatment Protocols link */}
      <a
        href="/dashboard/settings/protocols"
        className="block rounded-lg border p-4 sm:p-5 transition-colors hover:bg-primary-50"
        style={{
          borderColor: "rgba(184,147,106,0.3)",
          backgroundColor: "var(--color-card)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-lg font-serif font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t("settings_protocols_link")}
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              {t("settings_protocols_link_desc")}
            </p>
          </div>
          <span
            aria-hidden
            className="text-xl flex-shrink-0"
            style={{ color: "#b8936a" }}
          >
            →
          </span>
        </div>
      </a>

      {/* Consent Templates link */}
      <a
        href="/dashboard/settings/consents"
        className="block rounded-lg border p-4 sm:p-5 transition-colors hover:bg-primary-50"
        style={{
          borderColor: "rgba(184,147,106,0.3)",
          backgroundColor: "var(--color-card)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-lg font-serif font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t("settings_consents_link")}
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              {t("settings_consents_link_desc")}
            </p>
          </div>
          <span
            aria-hidden
            className="text-xl flex-shrink-0"
            style={{ color: "#b8936a" }}
          >
            →
          </span>
        </div>
      </a>

      {/* SMS Reminders link */}
      <a
        href="/dashboard/settings/sms"
        className="block rounded-lg border p-4 sm:p-5 transition-colors hover:bg-primary-50"
        style={{
          borderColor: "rgba(184,147,106,0.3)",
          backgroundColor: "var(--color-card)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-lg font-serif font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t("settings_sms_link")}
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              {t("settings_sms_link_desc")}
            </p>
          </div>
          <span
            aria-hidden
            className="text-xl flex-shrink-0"
            style={{ color: "#b8936a" }}
          >
            →
          </span>
        </div>
      </a>

      {/* Package Templates link */}
      <a
        href="/dashboard/packages/templates"
        className="block rounded-lg border p-4 sm:p-5 transition-colors hover:bg-primary-50"
        style={{
          borderColor: "rgba(184,147,106,0.3)",
          backgroundColor: "var(--color-card)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-lg font-serif font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t("settings_packages_link")}
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              {t("settings_packages_link_desc")}
            </p>
          </div>
          <span
            aria-hidden
            className="text-xl flex-shrink-0"
            style={{ color: "#b8936a" }}
          >
            →
          </span>
        </div>
      </a>

      {/* Doctor Profile */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{t("settings_profile")}</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                ref={profileForm.setFieldRef("full_name")}
                label={t("settings_doctor_name")}
                value={editing ? editData.full_name : doctor.full_name}
                disabled={!editing}
                onChange={(e) => { setEditData((p) => ({ ...p, full_name: e.target.value })); profileForm.clearError("full_name"); }}
                required={editing}
                error={profileForm.errors.full_name}
              />
              <Input label={t("settings_email")} type="email" value={doctor.email} disabled />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label={t("settings_phone")}
                value={editing ? editData.phone : doctor.phone || ""}
                disabled={!editing}
                onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
              />
              <Input
                label={t("settings_qualifications")}
                value={editing ? editData.qualifications : doctor.qualifications}
                disabled={!editing}
                onChange={(e) => setEditData((p) => ({ ...p, qualifications: e.target.value }))}
              />
            </div>
            <Input label={t("settings_reg_number")} value={doctor.registration_number} disabled />
            {editing ? (
              <>
                <FormErrorSummary errors={profileForm.errors} fieldLabels={profileLabels} />
                <div className="flex gap-2">
                  <Button className="bg-primary-500 hover:bg-primary-600 text-white" onClick={handleSave} loading={saving}>
                    {t("settings_save_changes")}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>{t("common_cancel")}</Button>
                </div>
              </>
            ) : (
              <Button variant="outline" className="border-primary-500 text-primary-500" onClick={handleStartEdit}>
                {t("settings_edit_profile")}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Appearance</h3>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-text-primary">Dark Mode</p>
              <p className="text-sm text-text-secondary">Switch between light and dark themes</p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-300"
              style={{ background: theme === "dark" ? "#b8936a" : "rgba(184,147,106,0.3)" }}
            >
              <span
                className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300"
                style={{ transform: theme === "dark" ? "translateX(22px)" : "translateX(4px)" }}
              />
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{t("settings_clinic_info")}</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <Input
              label={t("settings_clinic_name")}
              value={editing ? editData.clinic_name : doctor.clinic_name}
              disabled={!editing}
              onChange={(e) => setEditData((p) => ({ ...p, clinic_name: e.target.value }))}
            />
            <Textarea
              label={t("settings_clinic_address")}
              value={editing ? editData.clinic_address : doctor.clinic_address || ""}
              disabled={!editing}
              onChange={(e) => setEditData((p) => ({ ...p, clinic_address: e.target.value }))}
              rows={3}
            />
            {editing && (
              <div className="grid md:grid-cols-3 gap-4">
                <Input label={t("settings_city")} value={editData.clinic_city} onChange={(e) => setEditData((p) => ({ ...p, clinic_city: e.target.value }))} />
                <Input label={t("settings_state")} value={editData.clinic_state} onChange={(e) => setEditData((p) => ({ ...p, clinic_state: e.target.value }))} />
                <Input label={t("settings_pincode")} value={editData.clinic_pincode} onChange={(e) => setEditData((p) => ({ ...p, clinic_pincode: e.target.value }))} />
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Prescription Letterhead */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Prescription Letterhead</h3>
        </CardHeader>
        <CardBody>
          <p className="text-text-secondary text-sm mb-4">Upload your signature and clinic logo for auto-generated prescription PDFs.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Signature</label>
              {signaturePreview && (
                <div className="mb-2 p-2 border border-primary-200 rounded-lg bg-surface inline-block">
                  <img src={signaturePreview} alt="Signature" className="h-12 object-contain" />
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setSignatureFile(f); setSignaturePreview(URL.createObjectURL(f)); }
                }}
                className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Clinic Logo <span className="text-text-muted font-normal">(optional)</span></label>
              {logoPreview && (
                <div className="mb-2 p-2 border border-primary-200 rounded-lg bg-surface inline-block">
                  <img src={logoPreview} alt="Logo" className="h-12 object-contain" />
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
                }}
                className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200 cursor-pointer"
              />
            </div>
          </div>
          <FormErrorSummary errors={letterheadForm.errors} fieldLabels={letterheadLabels} />
          {(signatureFile || logoFile) && (
            <Button className="bg-primary-500 hover:bg-primary-600 text-white mt-4" onClick={handleLetterheadSave} loading={uploadingLetterhead}>
              Save Letterhead
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Billing</h3>
        </CardHeader>
        <CardBody>
          <p className="text-text-secondary text-sm mb-4">Set your default consultation fee. This will auto-populate when logging visits.</p>
          <div className="flex items-center gap-3 max-w-xs">
            <span className="text-text-primary font-medium text-lg">₹</span>
            <Input
              ref={feeForm.setFieldRef("defaultFee")}
              type="number"
              placeholder="e.g. 500"
              value={defaultFee}
              onChange={(e) => { setDefaultFee(e.target.value); feeForm.clearError("defaultFee"); }}
              error={feeForm.errors.defaultFee}
            />
            <Button
              className="bg-primary-500 hover:bg-primary-600 text-white shrink-0"
              onClick={handleSaveDefaultFee}
              loading={savingFee}
            >
              Save
            </Button>
          </div>
          <div className="max-w-xs mt-2">
            <FormErrorSummary errors={feeForm.errors} fieldLabels={feeLabels} />
          </div>
        </CardBody>
      </Card>

      {/* GST & Tax */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{t("settings_gst_title")}</h3>
        </CardHeader>
        <CardBody>
          <p className="text-text-secondary text-sm mb-4">{t("settings_gst_subtitle")}</p>
          <div className="space-y-4">
            <Input
              label={t("settings_gst_legal_name")}
              value={legalBusinessName}
              onChange={(e) => setLegalBusinessName(e.target.value)}
            />
            <p className="text-xs text-text-secondary -mt-3">{t("settings_gst_legal_name_help")}</p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Input
                  ref={gstForm.setFieldRef("gstin")}
                  label={t("settings_gst_gstin")}
                  value={gstin}
                  onChange={(e) => { setGstin(e.target.value.toUpperCase()); gstForm.clearError("gstin"); }}
                  maxLength={15}
                  placeholder="27AAAPL1234C1Z1"
                  error={gstForm.errors.gstin}
                />
                <p className="text-xs text-text-secondary">{t("settings_gst_gstin_help")}</p>
              </div>
              <div className="space-y-1">
                <Input
                  ref={gstForm.setFieldRef("state_code")}
                  label={t("settings_gst_state_code")}
                  value={stateCode}
                  onChange={(e) => { setStateCode(e.target.value.toUpperCase()); gstForm.clearError("state_code"); }}
                  maxLength={2}
                  placeholder="27"
                  error={gstForm.errors.state_code}
                />
                <p className="text-xs text-text-secondary">{t("settings_gst_state_code_help")}</p>
              </div>
            </div>

            {gstMsg && (
              <div
                className={`text-sm rounded-md px-3 py-2 ${
                  gstMsg.kind === "ok"
                    ? "bg-success-bg text-success-text"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {gstMsg.text}
              </div>
            )}

            <div>
              <Button
                className="bg-primary-500 hover:bg-primary-600 text-white"
                onClick={handleSaveGst}
                loading={savingGst}
              >
                {t("settings_gst_save")}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{t("settings_referral_title")}</h3>
        </CardHeader>
        <CardBody>
          <p className="text-text-secondary mb-4">
            {t("settings_referral_desc")}
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 bg-primary-100 border border-primary-200 rounded-lg px-3 sm:px-4 py-3">
              <p className="font-mono font-bold text-sm sm:text-lg text-primary-500 truncate">{doctor.referral_code}</p>
            </div>
            <Button variant="outline" className="border-primary-500 text-primary-500" onClick={handleCopyCode}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-2 break-words">
            Copies: &quot;Download Tvacha and use code {doctor.referral_code} to link with me&quot;
          </p>
        </CardBody>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{t("settings_subscription")}</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center gap-3">
            <div className="min-w-0">
              <p className="font-medium text-text-primary">{subscriptionLabel} Plan</p>
              <p className="text-sm text-text-secondary">₹2,000/month</p>
            </div>
            <Badge variant={doctor.subscription_status === "expired" ? "error" : "success"} className="flex-shrink-0">
              {doctor.subscription_status}
            </Badge>
          </div>
          <div className="border-t border-primary-200 pt-4">
            <p className="text-text-secondary text-sm mb-2">
              {doctor.subscription_status === "trial" ? t("settings_trial_ends") : t("settings_next_renewal")}
            </p>
            <p className="font-semibold text-text-primary">
              {doctor.subscription_end_date
                ? format(new Date(doctor.subscription_end_date), "dd MMM yyyy")
                : "N/A"}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{t("settings_support")}</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <Button variant="ghost" className="w-full justify-start" onClick={() => alert("Video tutorial coming soon!")}>{t("settings_video_training")}</Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => setShowContact(!showContact)}>{t("settings_contact_support")}</Button>
          {showContact && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "#faf8f4", border: "1px solid #e8ddd0" }}>
              <a href="mailto:support@tvacha-clinic.com" className="flex items-center gap-2.5 text-xs sm:text-sm hover:opacity-70 transition-opacity break-all" style={{ color: "#5c4030" }}>
                <Mail size={15} style={{ color: "#b8936a" }} /> support@tvacha-clinic.com
              </a>
              <a href="tel:+917881154003" className="flex items-center gap-2.5 text-sm hover:opacity-70 transition-opacity" style={{ color: "#5c4030" }}>
                <Phone size={15} style={{ color: "#b8936a" }} /> +91 7881154003
              </a>
              <a href="https://wa.me/917881154003" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm hover:opacity-70 transition-opacity" style={{ color: "#5c4030" }}>
                <MessageCircle size={15} style={{ color: "#b8936a" }} /> WhatsApp
              </a>
            </div>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
