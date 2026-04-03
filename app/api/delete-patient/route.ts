import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

async function deleteStorageFolder(bucket: string, prefix: string) {
  const { data: files, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });

  if (error || !files || files.length === 0) return;

  const paths = files.map((f) => `${prefix}/${f.name}`);
  await supabaseAdmin.storage.from(bucket).remove(paths);
}

export async function DELETE(req: NextRequest) {
  try {
    const { patientId, doctorId } = await req.json();

    if (!patientId || !doctorId) {
      return NextResponse.json({ error: "Missing patientId or doctorId" }, { status: 400 });
    }

    // 1. Delete storage files — patient-photos bucket
    const photoPrefix = `${doctorId}/${patientId}`;
    await deleteStorageFolder("patient-photos", photoPrefix);
    // Also delete the records sub-folder explicitly
    await deleteStorageFolder("patient-photos", `${photoPrefix}/records`);

    // 2. Delete storage files — lab-reports bucket
    await deleteStorageFolder("lab-reports", photoPrefix);

    // 3. Delete database rows (order matters for FK constraints)
    await supabaseAdmin.from("photos").delete().eq("patient_id", patientId);
    await supabaseAdmin.from("patient_photos").delete().eq("patient_id", patientId);
    await supabaseAdmin.from("visits").delete().eq("patient_id", patientId);
    await supabaseAdmin.from("prescriptions").delete().eq("patient_id", patientId);

    // 4. Delete the patient row itself
    const { error: patientError } = await supabaseAdmin
      .from("patients")
      .delete()
      .eq("id", patientId);

    if (patientError) {
      console.error("[delete-patient] patients delete error:", patientError);
      return NextResponse.json({ error: patientError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete-patient] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
