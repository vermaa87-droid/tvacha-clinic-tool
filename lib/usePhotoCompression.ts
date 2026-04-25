"use client";

import { useCallback, useState } from "react";
import type { ClinicalPhoto } from "./types";

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  stripExif?: boolean;
}

export const DEFAULT_COMPRESSION: Required<CompressionOptions> = {
  maxSizeMB: 1.0,
  maxWidthOrHeight: 1600,
  quality: 0.82,
  stripExif: true,
};

export interface CompressionResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  ratio: number;
}

/**
 * Compress an image file using browser-image-compression.
 * - Resizes longest edge to `maxWidthOrHeight` (default 1600px)
 * - Re-encodes as JPEG at `quality` (default 0.82)
 * - Targets `maxSizeMB` (default 1MB) — library iterates until met
 * - Strips EXIF (including GPS) by default — important for patient privacy
 */
export async function compressImage(
  file: File,
  opts: CompressionOptions = {}
): Promise<CompressionResult> {
  const { maxSizeMB, maxWidthOrHeight, quality, stripExif } = {
    ...DEFAULT_COMPRESSION,
    ...opts,
  };

  const mod = await import("browser-image-compression");
  const compress = (mod as any).default ?? mod;

  const compressed: File = await compress(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    initialQuality: quality,
    fileType: "image/jpeg",
    exifOrientation: stripExif ? 1 : undefined,
  });

  const renamed =
    compressed.name.toLowerCase().endsWith(".jpg") ||
    compressed.name.toLowerCase().endsWith(".jpeg")
      ? compressed
      : new File(
          [compressed],
          compressed.name.replace(/\.[^.]+$/, ".jpg") || "photo.jpg",
          { type: "image/jpeg" }
        );

  return {
    file: renamed,
    originalBytes: file.size,
    compressedBytes: renamed.size,
    ratio: file.size > 0 ? renamed.size / file.size : 1,
  };
}

export async function compressBatch(
  files: File[],
  opts: CompressionOptions = {},
  onProgress?: (done: number, total: number) => void
): Promise<CompressionResult[]> {
  const out: CompressionResult[] = [];
  for (let i = 0; i < files.length; i++) {
    out.push(await compressImage(files[i], opts));
    onProgress?.(i + 1, files.length);
  }
  return out;
}

export interface UploadClinicalPhotoParams {
  doctorId: string;
  patientId: string;
  file: File;                            // already-compressed is fine, will skip if size <= threshold
  photoType: ClinicalPhoto["photo_type"];
  angle?: ClinicalPhoto["angle"];
  bodyRegion?: string | null;
  visitId?: string | null;
  packageSessionId?: string | null;
  notes?: string | null;
  takenAt?: string;                      // ISO, defaults now
  compression?: CompressionOptions;
  skipCompressionIfSmallerThanMB?: number;  // default 0.8
}

export interface UploadClinicalPhotoResult {
  record: ClinicalPhoto | null;
  publicUrl: string | null;
  compression: { originalBytes: number; compressedBytes: number } | null;
  error: Error | null;
}

/**
 * One-call flow: compress on the client (saves upload bandwidth), then POST to the
 * server route which uploads via the admin client and inserts the clinical_photos
 * row. The admin client bypasses storage RLS, so this works regardless of the
 * patient's linked_doctor_id state.
 */
export async function uploadClinicalPhoto(
  params: UploadClinicalPhotoParams
): Promise<UploadClinicalPhotoResult> {
  const {
    doctorId,
    patientId,
    file,
    photoType,
    angle = "other",
    bodyRegion = null,
    visitId = null,
    packageSessionId = null,
    notes = null,
    takenAt,
    compression: compressionOpts,
    skipCompressionIfSmallerThanMB = 0.8,
  } = params;

  if (!doctorId || !patientId || !file) {
    return {
      record: null,
      publicUrl: null,
      compression: null,
      error: new Error("doctorId, patientId, and file are required"),
    };
  }

  const sizeMB = file.size / (1024 * 1024);
  let uploadFile = file;
  let compressionMeta: UploadClinicalPhotoResult["compression"] = null;

  if (sizeMB > skipCompressionIfSmallerThanMB) {
    const compressed = await compressImage(file, compressionOpts);
    uploadFile = compressed.file;
    compressionMeta = {
      originalBytes: compressed.originalBytes,
      compressedBytes: compressed.compressedBytes,
    };
  }

  const formData = new FormData();
  formData.append("file", uploadFile);
  formData.append("patient_id", patientId);
  formData.append("doctor_id", doctorId);
  formData.append("photo_type", photoType);
  formData.append("angle", angle);
  if (bodyRegion) formData.append("body_region", bodyRegion);
  if (visitId) formData.append("visit_id", visitId);
  if (packageSessionId) formData.append("package_session_id", packageSessionId);
  if (notes) formData.append("notes", notes);
  if (takenAt) formData.append("taken_at", takenAt);

  try {
    const res = await fetch("/api/upload-clinical-photo", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        record: null,
        publicUrl: null,
        compression: compressionMeta,
        error: new Error(json.error || `Upload failed (${res.status})`),
      };
    }
    return {
      record: json.data as ClinicalPhoto,
      publicUrl: (json.photoUrl as string) ?? null,
      compression: compressionMeta,
      error: null,
    };
  } catch (err) {
    return {
      record: null,
      publicUrl: null,
      compression: compressionMeta,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export interface PhotoCompressionState {
  compressing: boolean;
  uploading: boolean;
  progress: { done: number; total: number } | null;
  lastError: Error | null;
}

/**
 * Hook: batch compress + upload with progress. Returns stable callbacks.
 */
export function usePhotoCompression(opts: CompressionOptions = {}) {
  const [state, setState] = useState<PhotoCompressionState>({
    compressing: false,
    uploading: false,
    progress: null,
    lastError: null,
  });

  const compress = useCallback(
    async (files: File[]) => {
      setState((s) => ({
        ...s,
        compressing: true,
        progress: { done: 0, total: files.length },
        lastError: null,
      }));
      try {
        const results = await compressBatch(files, opts, (done, total) =>
          setState((s) => ({ ...s, progress: { done, total } }))
        );
        return results;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setState((s) => ({ ...s, lastError: e }));
        throw e;
      } finally {
        setState((s) => ({ ...s, compressing: false }));
      }
    },
    [opts]
  );

  const uploadMany = useCallback(
    async (
      base: Omit<UploadClinicalPhotoParams, "file">,
      files: File[]
    ): Promise<UploadClinicalPhotoResult[]> => {
      setState((s) => ({
        ...s,
        uploading: true,
        progress: { done: 0, total: files.length },
        lastError: null,
      }));
      const out: UploadClinicalPhotoResult[] = [];
      try {
        for (let i = 0; i < files.length; i++) {
          const r = await uploadClinicalPhoto({
            ...base,
            file: files[i],
            compression: opts,
          });
          out.push(r);
          if (r.error) {
            setState((s) => ({ ...s, lastError: r.error }));
          }
          setState((s) => ({
            ...s,
            progress: { done: i + 1, total: files.length },
          }));
        }
        return out;
      } finally {
        setState((s) => ({ ...s, uploading: false }));
      }
    },
    [opts]
  );

  return { ...state, compress, uploadMany };
}
