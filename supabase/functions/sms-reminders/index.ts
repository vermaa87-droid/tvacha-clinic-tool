// Supabase Edge Function — sms-reminders
// Scheduled via pg_cron (hourly). For every upcoming appointment in the next
// 24h where reminder_sent_at IS NULL and the clinic has sms_enabled=true, send
// an SMS via MSG91 Flow API, insert an sms_log row, and stamp reminder_sent_at.
//
// NEVER log msg91_api_key. Redact provider error payloads.
//
// Deploy:
//   supabase functions deploy sms-reminders
// Schedule (run from SQL):
//   select cron.schedule(
//     'sms-reminders-hourly',
//     '0 * * * *',
//     $$ select net.http_post(
//          url := 'https://<PROJECT>.functions.supabase.co/sms-reminders',
//          headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
//        );
//     $$
//   );

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MSG91_FLOW_URL = "https://api.msg91.com/api/v5/flow";

interface ClinicConfig {
  clinic_id: string;
  msg91_api_key: string;
  sender_id: string;
  dlt_entity_id: string;
}

interface AppointmentRow {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  reminder_sent_at: string | null;
  patients: { name: string; phone: string | null } | null;
}

function redact(key: string): string {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 3)}***${key.slice(-3)}`;
}

function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);
  return null;
}

interface Msg91FlowPayload {
  template_id: string;
  short_url?: "0" | "1";
  recipients: { mobiles: string; [k: string]: string }[];
}

async function callMsg91(
  apiKey: string,
  templateId: string,
  mobile: string,
  variables: Record<string, string>
): Promise<{ ok: boolean; messageId: string | null; error: string | null }> {
  const payload: Msg91FlowPayload = {
    template_id: templateId,
    short_url: "0",
    recipients: [{ mobiles: mobile, ...variables }],
  };

  try {
    const res = await fetch(MSG91_FLOW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: apiKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-json response */
    }
    if (!res.ok) {
      return {
        ok: false,
        messageId: null,
        error: `MSG91 ${res.status}`, // deliberately vague — avoid leaking provider internals
      };
    }
    const messageId =
      json?.request_id ?? json?.data?.request_id ?? json?.message ?? null;
    return { ok: true, messageId: String(messageId ?? ""), error: null };
  } catch (err) {
    return {
      ok: false,
      messageId: null,
      error: "network_error",
    };
  }
}

function formatReminderText(
  patientName: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicName: string
): string {
  const d = new Date(`${appointmentDate}T${appointmentTime}`);
  const when = isNaN(d.getTime())
    ? `${appointmentDate} ${appointmentTime}`
    : d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
  return `Hi ${patientName}, reminder for your appointment at ${clinicName} on ${when}. Reply STOP to opt out.`;
}

// @ts-ignore — Deno global is provided by the Edge runtime.
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function runReminders() {
  const nowIso = new Date().toISOString();
  const inDay = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const today = nowIso.slice(0, 10);
  const tomorrow = inDay.slice(0, 10);

  // Load all clinics that have SMS enabled.
  const { data: configs, error: cfgErr } = await admin
    .from("clinic_settings")
    .select("clinic_id, msg91_api_key, sender_id, dlt_entity_id, sms_enabled")
    .eq("sms_enabled", true)
    .not("msg91_api_key", "is", null);

  if (cfgErr) {
    return { ok: false, error: "config_query_failed", processed: 0, sent: 0 };
  }

  const clinics: ClinicConfig[] = (configs ?? [])
    .filter(
      (c) =>
        c.msg91_api_key &&
        c.sender_id &&
        c.dlt_entity_id
    )
    .map((c) => ({
      clinic_id: c.clinic_id,
      msg91_api_key: c.msg91_api_key!,
      sender_id: c.sender_id!,
      dlt_entity_id: c.dlt_entity_id!,
    }));

  let processed = 0;
  let sent = 0;

  for (const clinic of clinics) {
    // Find this doctor's clinic name for message composition.
    const { data: doctorRow } = await admin
      .from("doctors")
      .select("clinic_name")
      .eq("id", clinic.clinic_id)
      .maybeSingle();
    const clinicName = doctorRow?.clinic_name ?? "the clinic";

    // Appointments in next 24h with no reminder yet.
    const { data: appts, error: apptErr } = await admin
      .from("appointments")
      .select(
        "id, doctor_id, patient_id, appointment_date, appointment_time, reminder_sent_at, patients ( name, phone )"
      )
      .eq("doctor_id", clinic.clinic_id)
      .gte("appointment_date", today)
      .lte("appointment_date", tomorrow)
      .is("reminder_sent_at", null)
      .in("status", ["scheduled", "confirmed"]);

    if (apptErr || !appts) continue;

    for (const raw of appts as unknown as AppointmentRow[]) {
      const starts = new Date(
        `${raw.appointment_date}T${raw.appointment_time}`
      );
      if (isNaN(starts.getTime())) continue;
      if (starts.getTime() < Date.now()) continue; // past
      if (starts.getTime() > Date.now() + 24 * 60 * 60 * 1000) continue;

      processed++;

      const phone = raw.patients?.phone ?? null;
      const name = raw.patients?.name ?? "Patient";
      if (!phone) continue;
      const e164 = toE164(phone);
      if (!e164) continue;

      const message = formatReminderText(
        name,
        raw.appointment_date,
        raw.appointment_time,
        clinicName
      );

      // Insert sms_log row as queued.
      const { data: logRow } = await admin
        .from("sms_log")
        .insert({
          clinic_id: clinic.clinic_id,
          doctor_id: clinic.clinic_id,
          patient_id: raw.patient_id,
          appointment_id: raw.id,
          phone_number: e164,
          template_used: "appointment_reminder",
          message_content: message,
          status: "queued",
        })
        .select("id")
        .single();

      const msg = await callMsg91(
        clinic.msg91_api_key,
        clinic.dlt_entity_id,
        e164,
        {
          name,
          clinic_name: clinicName,
          appointment_datetime: `${raw.appointment_date} ${raw.appointment_time}`,
        }
      );

      if (msg.ok) {
        sent++;
        if (logRow?.id) {
          await admin
            .from("sms_log")
            .update({
              status: "sent",
              provider_message_id: msg.messageId,
              sent_at: new Date().toISOString(),
            })
            .eq("id", logRow.id);
        }
        await admin
          .from("appointments")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", raw.id)
          .eq("doctor_id", clinic.clinic_id);
      } else {
        if (logRow?.id) {
          await admin
            .from("sms_log")
            .update({
              status: "failed",
              error_message: msg.error,
            })
            .eq("id", logRow.id);
        }
        // Log with redacted key so we can debug without leaking secrets.
        console.error(
          `sms-reminders: send failed clinic=${clinic.clinic_id} key=${redact(
            clinic.msg91_api_key
          )} error=${msg.error}`
        );
      }
    }
  }

  return { ok: true, processed, sent };
}

// @ts-ignore
Deno.serve(async (_req: Request) => {
  try {
    const result = await runReminders();
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
      status: result.ok ? 200 : 500,
    });
  } catch (err) {
    // Never echo internal errors verbatim.
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});
