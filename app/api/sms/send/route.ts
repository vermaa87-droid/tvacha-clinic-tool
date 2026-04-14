import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const MSG91_FLOW_URL = "https://api.msg91.com/api/v5/flow";

function redact(key: string | null | undefined): string {
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

async function getSessionDoctorId(): Promise<string | null> {
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const doctorId = await getSessionDoctorId();
    if (!doctorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as {
      phone: string;
      templateId?: string;
      variables?: Record<string, string>;
      patientId?: string;
      appointmentId?: string;
      message?: string;
    };

    if (!body.phone) {
      return NextResponse.json({ error: "phone required" }, { status: 400 });
    }

    const e164 = toE164(body.phone);
    if (!e164) {
      return NextResponse.json(
        { error: "invalid phone — expected 10-digit Indian mobile" },
        { status: 400 }
      );
    }

    const { data: cfg, error: cfgErr } = await supabaseAdmin
      .from("clinic_settings")
      .select("msg91_api_key, sender_id, dlt_entity_id, sms_enabled")
      .eq("clinic_id", doctorId)
      .maybeSingle();

    if (cfgErr || !cfg) {
      return NextResponse.json(
        { error: "SMS settings not configured" },
        { status: 400 }
      );
    }

    if (!cfg.sms_enabled || !cfg.msg91_api_key || !cfg.sender_id || !cfg.dlt_entity_id) {
      return NextResponse.json(
        { error: "SMS not enabled — configure MSG91 first" },
        { status: 400 }
      );
    }

    const templateId = body.templateId ?? cfg.dlt_entity_id;
    const messageContent =
      body.message ??
      `Test message from ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    const { data: logRow } = await supabaseAdmin
      .from("sms_log")
      .insert({
        clinic_id: doctorId,
        doctor_id: doctorId,
        patient_id: body.patientId ?? null,
        appointment_id: body.appointmentId ?? null,
        phone_number: e164,
        template_used: body.templateId ? "manual" : "test",
        message_content: messageContent,
        status: "queued",
      })
      .select("id")
      .single();

    let providerMessageId: string | null = null;
    let providerError: string | null = null;
    let ok = false;

    try {
      const res = await fetch(MSG91_FLOW_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: cfg.msg91_api_key,
        },
        body: JSON.stringify({
          template_id: templateId,
          short_url: "0",
          recipients: [
            {
              mobiles: e164,
              ...(body.variables ?? {}),
            },
          ],
        }),
      });
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* ignore */
      }
      if (res.ok) {
        ok = true;
        providerMessageId =
          json?.request_id ?? json?.data?.request_id ?? null;
      } else {
        providerError = `provider_${res.status}`;
      }
    } catch {
      providerError = "network_error";
    }

    if (logRow?.id) {
      await supabaseAdmin
        .from("sms_log")
        .update(
          ok
            ? {
                status: "sent",
                provider_message_id: providerMessageId,
                sent_at: new Date().toISOString(),
              }
            : { status: "failed", error_message: providerError }
        )
        .eq("id", logRow.id);
    }

    if (!ok) {
      console.error(
        `[sms/send] failed doctor=${doctorId} key=${redact(cfg.msg91_api_key)} error=${providerError}`
      );
      return NextResponse.json(
        { error: "Send failed", reason: providerError },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      smsLogId: logRow?.id ?? null,
      providerMessageId,
    });
  } catch (err) {
    console.error("[sms/send] unexpected:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
