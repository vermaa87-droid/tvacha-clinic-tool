"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language-context";
import { useSms, sendTestSMS } from "@/lib/useSms";
import type { SmsLog } from "@/lib/types";
import { Send, Save, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SmsSettingsPage() {
  const { doctor } = useAuthStore();
  const { t } = useLanguage();
  const { settings, usage, loading, saveSettings, refresh } = useSms(doctor?.id);

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [dltEntityId, setDltEntityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [testMsg, setTestMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!settings) return;
    setSmsEnabled(settings.smsEnabled);
    setSenderId(settings.senderId ?? "");
    setDltEntityId(settings.dltEntityId ?? "");
  }, [settings]);

  const needAllFieldsToEnable = useMemo(() => {
    if (!smsEnabled) return false;
    const keyOk = !!apiKey || (settings?.hasApiKey ?? false);
    return !(keyOk && senderId && dltEntityId);
  }, [smsEnabled, apiKey, senderId, dltEntityId, settings?.hasApiKey]);

  const handleSave = async () => {
    if (!doctor?.id) return;
    setSaveMsg(null);
    if (needAllFieldsToEnable) {
      setSaveMsg({ kind: "err", text: t("sms_need_all_fields") });
      return;
    }
    setSaving(true);
    const patch: Parameters<typeof saveSettings>[0] = {
      sms_enabled: smsEnabled,
      sender_id: senderId || null,
      dlt_entity_id: dltEntityId || null,
    };
    if (apiKey) patch.msg91_api_key = apiKey;
    const r = await saveSettings(patch);
    setSaving(false);
    if (r.ok) {
      setSaveMsg({ kind: "ok", text: t("sms_save_success") });
      setApiKey("");
    } else {
      setSaveMsg({ kind: "err", text: t("sms_save_error") });
    }
  };

  const handleSendTest = async () => {
    if (!settings?.isConfigured) {
      setTestMsg({ kind: "err", text: t("sms_test_need_config") });
      return;
    }
    if (!testPhone) return;
    setSending(true);
    setTestMsg(null);
    const r = await sendTestSMS({
      phone: testPhone,
      message: testMessage || undefined,
    });
    setSending(false);
    if (r.ok) {
      setTestMsg({ kind: "ok", text: t("sms_test_success") });
      setTestPhone("");
      setTestMessage("");
      refresh();
    } else {
      setTestMsg({ kind: "err", text: `${t("sms_test_error")}${r.error ? ` (${r.error})` : ""}` });
    }
  };

  const statusBadge = () => {
    if (!settings) return null;
    if (!settings.isConfigured) {
      return <Badge variant="warning">{t("sms_status_incomplete")}</Badge>;
    }
    if (!settings.smsEnabled) {
      return <Badge variant="default">{t("sms_status_disabled")}</Badge>;
    }
    return <Badge variant="success">{t("sms_status_configured")}</Badge>;
  };

  if (!doctor) {
    return (
      <main className="space-y-6">
        <div className="h-12 w-1/3 rounded bg-primary-100 animate-pulse" />
        <div className="h-64 rounded-lg bg-primary-100 animate-pulse" />
      </main>
    );
  }

  return (
    <main className="space-y-6 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {t("sms_back_to_settings")}
        </Link>
        <div className="flex items-center justify-between gap-3 mt-2">
          <div className="min-w-0">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t("sms_settings_title")}
            </h1>
            <p className="text-text-secondary mt-1">{t("sms_settings_subtitle")}</p>
          </div>
          <div className="flex-shrink-0">{statusBadge()}</div>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            {t("sms_section_config")}
          </h3>
        </CardHeader>
        <CardBody className="space-y-5">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-primary-300 accent-[#b8936a]"
            />
            <div className="min-w-0">
              <div className="font-medium text-text-primary">{t("sms_enabled")}</div>
              <div className="text-sm text-text-secondary">{t("sms_enabled_help")}</div>
            </div>
          </label>

          <div className="space-y-1">
            <Input
              label={t("sms_msg91_api_key")}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.hasApiKey ? "••••••••••••" : ""}
              autoComplete="new-password"
            />
            <p className="text-xs text-text-secondary">
              {settings?.hasApiKey
                ? t("sms_msg91_api_key_masked")
                : t("sms_msg91_api_key_help")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Input
                label={t("sms_sender_id")}
                value={senderId}
                onChange={(e) => setSenderId(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="TVACHA"
              />
              <p className="text-xs text-text-secondary">{t("sms_sender_id_help")}</p>
            </div>
            <div className="space-y-1">
              <Input
                label={t("sms_dlt_entity_id")}
                value={dltEntityId}
                onChange={(e) => setDltEntityId(e.target.value)}
              />
              <p className="text-xs text-text-secondary">{t("sms_dlt_entity_id_help")}</p>
            </div>
          </div>

          {saveMsg && (
            <div
              className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
                saveMsg.kind === "ok"
                  ? "bg-success-bg text-success-text"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {saveMsg.kind === "ok" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {saveMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving} disabled={loading}>
              <span className="inline-flex items-center gap-1.5">
                <Save size={14} />
                {saving ? t("sms_saving") : t("sms_save")}
              </span>
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Test SMS */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            {t("sms_section_test")}
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label={t("sms_test_phone")}
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder={t("sms_test_phone_placeholder")}
            />
          </div>
          <Textarea
            label={t("sms_test_message")}
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder={t("sms_test_message_placeholder")}
            rows={3}
          />
          {testMsg && (
            <div
              className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
                testMsg.kind === "ok"
                  ? "bg-success-bg text-success-text"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {testMsg.kind === "ok" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {testMsg.text}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleSendTest}
              loading={sending}
              disabled={!settings?.isConfigured || !testPhone}
            >
              <span className="inline-flex items-center gap-1.5">
                <Send size={14} />
                {sending ? t("sms_test_sending") : t("sms_test_send")}
              </span>
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">
            {t("sms_section_usage")}
          </h3>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <UsageStat label={t("sms_usage_today")} value={usage?.todayCount ?? 0} />
            <UsageStat label={t("sms_usage_month")} value={usage?.monthCount ?? 0} />
            <UsageStat
              label={t("sms_usage_failed")}
              value={usage?.failedCount ?? 0}
              tone={(usage?.failedCount ?? 0) > 0 ? "error" : "default"}
            />
            <UsageStat
              label={t("sms_usage_credits")}
              value={
                usage?.creditsRemaining != null
                  ? usage.creditsRemaining
                  : t("sms_usage_credits_none")
              }
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">
              {t("sms_recent_title")}
            </h4>
            {(!usage || usage.recent.length === 0) ? (
              <div className="rounded-md border border-dashed border-primary-200 px-4 py-6 text-center text-sm text-text-secondary">
                <MessageSquare size={16} className="inline mr-1 opacity-70" />
                {t("sms_recent_empty")}
              </div>
            ) : (
              <div className="rounded-md border border-primary-200 overflow-hidden">
                <ul className="divide-y divide-primary-200">
                  {usage.recent.map((r) => (
                    <SmsRecentRow key={r.id} r={r} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </main>
  );
}

function UsageStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "error";
}) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{
        borderColor: "rgba(184,147,106,0.25)",
        backgroundColor: "var(--color-card)",
      }}
    >
      <div className="text-[11px] uppercase tracking-wide text-text-secondary">
        {label}
      </div>
      <div
        className={`mt-0.5 font-serif text-2xl font-semibold ${
          tone === "error" ? "text-red-700" : "text-text-primary"
        }`}
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {value}
      </div>
    </div>
  );
}

function SmsRecentRow({ r }: { r: SmsLog }) {
  const { t } = useLanguage();
  const statusKey = `sms_recent_status_${r.status}` as const;
  const statusVariant =
    r.status === "delivered" || r.status === "sent"
      ? "success"
      : r.status === "failed"
      ? "error"
      : "warning";
  const templateKey = r.template_used
    ? (`sms_recent_template_${
        r.template_used === "reminder"
          ? "reminder"
          : r.template_used === "test"
          ? "test"
          : "custom"
      }` as const)
    : null;
  const when = r.sent_at || r.created_at;
  return (
    <li className="px-3 py-2.5 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary">
            {r.phone_number}
          </span>
          {templateKey && (
            <Badge variant="default">{t(templateKey as never)}</Badge>
          )}
          <Badge variant={statusVariant as "success" | "error" | "warning"}>
            {t(statusKey as never)}
          </Badge>
        </div>
        <div className="text-xs text-text-secondary mt-0.5 line-clamp-1">
          {r.message_content}
        </div>
        {r.error_message && (
          <div className="text-xs text-red-700 mt-0.5">
            {r.error_message}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 text-xs text-text-secondary whitespace-nowrap">
        {when ? format(new Date(when), "dd MMM HH:mm") : ""}
      </div>
    </li>
  );
}
