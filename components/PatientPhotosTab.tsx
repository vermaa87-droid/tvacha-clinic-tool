"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BODY_LOCATIONS } from "@/lib/constants";
import { Camera, X, ZoomIn, MapPin, Calendar, Activity } from "lucide-react";
import { format } from "date-fns";

interface PatientPhoto {
  id: string;
  photo_url: string;
  photo_type: string | null;
  body_location: string | null;
  notes: string | null;
  created_at: string;
  source: "photos" | "patient_photos";
}

export function PatientPhotosTab({ patientId }: { patientId: string }) {
  const { user } = useAuthStore();
  const [skinPhotos, setSkinPhotos] = useState<PatientPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<PatientPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<PatientPhoto[]>([]);
  const [uploadForm, setUploadForm] = useState({ body_location: "", notes: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      // Query the wizard photos table (skin_scan + medical_record)
      const { data: wizardPhotos, error: wizardError } = await supabase
        .from("photos")
        .select("id, photo_url, photo_type, body_location, notes, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (wizardError) {
        console.error("[photos] fetch wizard photos error:", wizardError);
      }

      // Also query the legacy manual-upload table
      const { data: legacyPhotos, error: legacyError } = await supabase
        .from("patient_photos")
        .select("id, photo_url, photo_type, body_location, notes, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (legacyError && !legacyError.message.includes("does not exist")) {
        console.error("[photos] fetch legacy photos error:", legacyError);
      }

      const allSkin: PatientPhoto[] = [];

      for (const p of (wizardPhotos || []) as PatientPhoto[]) {
        const photo = { ...p, source: "photos" as const };
        if (photo.photo_type !== "medical_record") {
          allSkin.push(photo);
        }
      }

      for (const p of (legacyPhotos || []) as Omit<PatientPhoto, "source">[]) {
        allSkin.push({ ...p, photo_type: p.photo_type ?? "skin_scan", source: "patient_photos" as const });
      }

      setSkinPhotos(allSkin);
    } catch (err) {
      console.error("[photos] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patient_id", patientId);
      formData.append("doctor_id", user.id);
      if (uploadForm.body_location) formData.append("body_location", uploadForm.body_location);
      if (uploadForm.notes) formData.append("notes", uploadForm.notes);

      const res = await fetch("/api/upload-photo", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        console.error("[photos] upload failed:", body.error);
        alert("Upload failed: " + (body.error || "Unknown error"));
        return;
      }
      if (body.data) {
        setSkinPhotos((prev) => [{ ...body.data, source: "patient_photos" as const }, ...prev]);
      }
      setSelectedFile(null);
      setPreview(null);
      setUploadForm({ body_location: "", notes: "" });
      setShowUploadModal(false);
    } catch (err) {
      console.error("[photos] upload error:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: PatientPhoto) => {
    if (!confirm("Delete this photo?")) return;
    try {
      const table = photo.source === "patient_photos" ? "patient_photos" : "photos";
      await supabase.from(table).delete().eq("id", photo.id);
      setSkinPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setViewPhoto(null);
    } catch (err) {
      console.error("[photos] delete error:", err);
    }
  };

  const toggleCompare = (photo: PatientPhoto) => {
    if (comparePhotos.find((p) => p.id === photo.id)) {
      setComparePhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } else if (comparePhotos.length < 2) {
      setComparePhotos((prev) => [...prev, photo]);
    }
  };

  const selectClass =
    "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";


  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-primary-200 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-primary-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-semibold text-text-primary">Affected Area Photos</h3>
        <div className="flex items-center gap-2">
          {skinPhotos.length >= 2 && (
            <Button
              variant={compareMode ? "primary" : "outline"}
              size="sm"
              onClick={() => { setCompareMode(!compareMode); setComparePhotos([]); }}
            >
              {compareMode ? "Exit Compare" : "Compare"}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
            <span className="inline-flex items-center gap-2"><Camera size={16} /> Upload Photo</span>
          </Button>
        </div>
      </div>

      {/* Compare Mode Bar */}
      {compareMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          Select 2 photos to compare side by side. ({comparePhotos.length}/2 selected)
        </div>
      )}

      {/* Compare View */}
      {compareMode && comparePhotos.length === 2 && (
        <Card>
          <CardHeader>
            <h4 className="text-lg font-serif font-semibold text-text-primary">Before / After Comparison</h4>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              {comparePhotos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <img src={photo.photo_url} alt="Patient photo" className="w-full aspect-square object-cover rounded-lg" />
                  <div className="text-center text-sm">
                    <p className="font-medium text-text-primary">{format(new Date(photo.created_at), "dd MMM yyyy")}</p>
                    {photo.body_location && <p className="text-text-muted">{photo.body_location}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Skin Scan Photos */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "#b8936a" }}>
          Affected Area Photos
        </h4>
        {skinPhotos.length === 0 ? (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                <Camera size={36} className="mb-3 opacity-30" />
                <p className="text-sm">No photos uploaded yet.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowUploadModal(true)}>
                  Upload First Photo
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {skinPhotos.map((photo) => {
              const isSelected = comparePhotos.find((p) => p.id === photo.id);
              return (
                <div
                  key={photo.id}
                  className={`group relative rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-primary-200 hover:border-primary-400"
                  }`}
                  onClick={() => (compareMode ? toggleCompare(photo) : setViewPhoto(photo))}
                >
                  <img src={photo.photo_url} alt="Patient photo" className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-medium">{format(new Date(photo.created_at), "dd MMM yyyy")}</p>
                    {photo.body_location && (
                      <p className="text-white/80 text-xs flex items-center gap-1"><MapPin size={10} /> {photo.body_location}</p>
                    )}
                  </div>
                  {compareMode && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "bg-white/80 border-white"}`}>
                        {isSelected && "✓"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skin AI Placeholder */}
      <Card>
        <CardHeader>
          <h4 className="text-lg font-serif font-semibold text-text-primary">Skin AI Analysis</h4>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Activity size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Skin AI scanning coming soon</p>
          </div>
        </CardBody>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => { setShowUploadModal(false); setSelectedFile(null); setPreview(null); setUploadForm({ body_location: "", notes: "" }); }}
        title="Upload Clinical Photo"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowUploadModal(false); setSelectedFile(null); setPreview(null); }}>Cancel</Button>
            <Button variant="primary" onClick={handleUpload} loading={uploading} disabled={!selectedFile}>Upload Photo</Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); if (selectedFile) handleUpload(); }} className="space-y-4">
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-primary-200" />
                <button onClick={() => { setSelectedFile(null); setPreview(null); }} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-primary-300 rounded-lg p-8 flex flex-col items-center gap-3 text-text-muted hover:border-primary-500 hover:bg-primary-50 transition-colors">
                <Camera size={32} className="text-primary-400" />
                <span className="text-sm font-medium">Click to take photo or select from gallery</span>
                <span className="text-xs">JPG, PNG up to 10MB</span>
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Body Location</label>
            <select value={uploadForm.body_location} onChange={(e) => setUploadForm((prev) => ({ ...prev, body_location: e.target.value }))} className={selectClass}>
              <option value="">Select location (optional)</option>
              {BODY_LOCATIONS.map((loc) => (<option key={loc} value={loc}>{loc}</option>))}
            </select>
          </div>
          <Textarea label="Notes" placeholder="Any observations about this photo..." value={uploadForm.notes} onChange={(e) => setUploadForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} />
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      {/* View Photo Modal */}
      <Modal
        isOpen={!!viewPhoto}
        onClose={() => setViewPhoto(null)}
        title="Photo Details"
        size="xl"
        footer={
          <>
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => viewPhoto && handleDeletePhoto(viewPhoto)}>Delete</Button>
            <Button variant="ghost" onClick={() => setViewPhoto(null)}>Close</Button>
          </>
        }
      >
        {viewPhoto && (
          <div className="space-y-4">
            <img src={viewPhoto.photo_url} alt="Patient photo" className="w-full max-h-[60vh] object-contain rounded-lg" />
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Calendar size={14} />
                {format(new Date(viewPhoto.created_at), "dd MMMM yyyy, h:mm a")}
              </div>
              {viewPhoto.body_location && (
                <div className="flex items-center gap-1.5 text-text-secondary"><MapPin size={14} />{viewPhoto.body_location}</div>
              )}
            </div>
            {viewPhoto.notes && (
              <div className="bg-primary-50 rounded-lg p-3">
                <p className="text-sm text-text-secondary">{viewPhoto.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
