"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { Copy, Check, Mail, Phone, MessageCircle } from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { doctor, refreshDoctor } = useAuthStore();
  const { t } = useLanguage();
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
  });

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
        <h1 className="text-4xl font-serif font-bold text-text-primary">{t("settings_title")}</h1>
        <p className="text-text-secondary mt-2">{t("settings_subtitle")}</p>
      </div>

      {/* Doctor Profile */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{t("settings_profile")}</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label={t("settings_doctor_name")}
                value={editing ? editData.full_name : doctor.full_name}
                disabled={!editing}
                onChange={(e) => setEditData((p) => ({ ...p, full_name: e.target.value }))}
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
              <div className="flex gap-2">
                <Button className="bg-primary-500 hover:bg-primary-600 text-white" onClick={handleSave} loading={saving}>
                  {t("settings_save_changes")}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>{t("common_cancel")}</Button>
              </div>
            ) : (
              <Button variant="outline" className="border-primary-500 text-primary-500" onClick={handleStartEdit}>
                {t("settings_edit_profile")}
              </Button>
            )}
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

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">{t("settings_referral_title")}</h3>
        </CardHeader>
        <CardBody>
          <p className="text-text-secondary mb-4">
            {t("settings_referral_desc")}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-primary-100 border border-primary-200 rounded-lg px-4 py-3">
              <p className="font-mono font-bold text-lg text-primary-500">{doctor.referral_code}</p>
            </div>
            <Button variant="outline" className="border-primary-500 text-primary-500" onClick={handleCopyCode}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-2">
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
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-text-primary">{subscriptionLabel} Plan</p>
              <p className="text-sm text-text-secondary">₹2,000/month</p>
            </div>
            <Badge variant={doctor.subscription_status === "expired" ? "error" : "success"}>
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
              <a href="mailto:support@tvacha-clinic.com" className="flex items-center gap-2.5 text-sm hover:opacity-70 transition-opacity" style={{ color: "#5c4030" }}>
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
