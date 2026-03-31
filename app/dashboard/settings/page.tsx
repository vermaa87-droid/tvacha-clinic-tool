"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Copy, Check } from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { doctor, refreshDoctor } = useAuthStore();
  const [copied, setCopied] = useState(false);
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
        <h1 className="text-4xl font-serif font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-2">Manage your account and clinic information</p>
      </div>

      {/* Doctor Profile */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Doctor Profile</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Doctor Name"
                value={editing ? editData.full_name : doctor.full_name}
                disabled={!editing}
                onChange={(e) => setEditData((p) => ({ ...p, full_name: e.target.value }))}
              />
              <Input label="Email" type="email" value={doctor.email} disabled />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={editing ? editData.phone : doctor.phone || ""}
                disabled={!editing}
                onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
              />
              <Input
                label="Qualifications"
                value={editing ? editData.qualifications : doctor.qualifications}
                disabled={!editing}
                onChange={(e) => setEditData((p) => ({ ...p, qualifications: e.target.value }))}
              />
            </div>
            <Input label="Medical Registration Number" value={doctor.registration_number} disabled />
            {editing ? (
              <div className="flex gap-2">
                <Button className="bg-primary-500 hover:bg-primary-600 text-white" onClick={handleSave} loading={saving}>
                  Save Changes
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" className="border-primary-500 text-primary-500" onClick={handleStartEdit}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Clinic Information</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <Input
              label="Clinic Name"
              value={editing ? editData.clinic_name : doctor.clinic_name}
              disabled={!editing}
              onChange={(e) => setEditData((p) => ({ ...p, clinic_name: e.target.value }))}
            />
            <Textarea
              label="Clinic Address"
              value={editing ? editData.clinic_address : doctor.clinic_address || ""}
              disabled={!editing}
              onChange={(e) => setEditData((p) => ({ ...p, clinic_address: e.target.value }))}
              rows={3}
            />
            {editing && (
              <div className="grid md:grid-cols-3 gap-4">
                <Input label="City" value={editData.clinic_city} onChange={(e) => setEditData((p) => ({ ...p, clinic_city: e.target.value }))} />
                <Input label="State" value={editData.clinic_state} onChange={(e) => setEditData((p) => ({ ...p, clinic_state: e.target.value }))} />
                <Input label="Pincode" value={editData.clinic_pincode} onChange={(e) => setEditData((p) => ({ ...p, clinic_pincode: e.target.value }))} />
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Referral Code</h3>
        </CardHeader>
        <CardBody>
          <p className="text-text-secondary mb-4">
            Share this code with patients to link them to your clinic
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
          <h3 className="text-lg font-semibold text-text-primary">Subscription</h3>
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
              {doctor.subscription_status === "trial" ? "Trial ends:" : "Next renewal date:"}
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
          <h3 className="text-lg font-semibold text-text-primary">Support</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <Button variant="ghost" className="w-full justify-start">Knowledge Base</Button>
          <Button variant="ghost" className="w-full justify-start">Contact Support</Button>
          <Button variant="ghost" className="w-full justify-start">Video Training</Button>
          <Button variant="ghost" className="w-full justify-start">FAQ</Button>
        </CardBody>
      </Card>
    </main>
  );
}
