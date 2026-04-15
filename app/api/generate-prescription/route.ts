import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

export const runtime = "nodejs";
export const maxDuration = 30;
import { supabaseAdmin } from "@/lib/supabase-server";
import { PrescriptionPDF } from "@/components/PrescriptionPDF";
import type { PrescriptionPDFData } from "@/components/PrescriptionPDF";
import React from "react";

// Fetch an image URL and convert to base64 data URI for @react-pdf/renderer
async function toDataUri(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const contentType = res.headers.get("content-type") || "image/png";
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  try {
    const data: PrescriptionPDFData = await req.json();

    // Convert image URLs to base64 data URIs so @react-pdf can render them
    console.log("[generate-prescription] signatureUrl:", data.doctor.signatureUrl);
    console.log("[generate-prescription] logoUrl:", data.doctor.logoUrl);

    if (data.doctor.signatureUrl) {
      const sig = await toDataUri(data.doctor.signatureUrl);
      console.log("[generate-prescription] signature fetch result:", sig ? `data URI (${sig.length} chars)` : "FAILED");
      data.doctor.signatureUrl = sig || undefined;
    }
    if (data.doctor.logoUrl) {
      const logo = await toDataUri(data.doctor.logoUrl);
      console.log("[generate-prescription] logo fetch result:", logo ? `data URI (${logo.length} chars)` : "FAILED");
      data.doctor.logoUrl = logo || undefined;
    }

    // Generate PDF buffer. The cast is needed because @react-pdf/renderer's
    // ambient types don't quite line up with React 18's element typings.
    const buffer = await renderToBuffer(
      React.createElement(PrescriptionPDF, { data }) as Parameters<typeof renderToBuffer>[0]
    );

    // Ensure bucket exists
    await supabaseAdmin.storage
      .createBucket("prescription-pdfs", { public: true, fileSizeLimit: 5242880 })
      .catch(() => {});

    // Upload to Supabase Storage
    const safeName = data.referenceNumber.replace(/[^a-zA-Z0-9-]/g, "_");
    const path = `${safeName}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("prescription-pdfs")
      .upload(path, Buffer.from(buffer), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-prescription] upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("prescription-pdfs")
      .getPublicUrl(path);

    return NextResponse.json({ success: true, pdfUrl: urlData.publicUrl });
  } catch (err) {
    console.error("[generate-prescription] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate prescription" },
      { status: 500 }
    );
  }
}
