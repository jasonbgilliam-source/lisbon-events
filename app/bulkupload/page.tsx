"use client";

import { useState } from "react";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BulkUploadPage() {
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("");
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];

        // Clean up empty keys and trim whitespace
        const cleanRows = rows.map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [k.trim(), typeof v === "string" ? v.trim() : v])
          )
        );

        const { error } = await supabase.from("event_submissions").insert(cleanRows);

        if (error) {
          console.error(error);
          setStatus(`❌ Upload failed: ${error.message}`);
        } else {
          setStatus(`✅ Successfully uploaded ${cleanRows.length} events!`);
        }

        setUploading(false);
      },
      error: (err) => {
        console.error(err);
        setStatus("❌ Error parsing CSV.");
        setUploading(false);
      },
    });
  }

  function downloadTemplate() {
    const templateHeaders = [
      "title",
      "description",
      "starts_at",
      "ends_at",
      "location_name",
      "address",
      "city",
      "category",
      "price",
      "age",
      "organizer_email",
      "ticket_url",
      "image_url",
      "youtube_url",
      "spotify_url",
      "is_free",
    ];
    const blob = new Blob([templateHeaders.join(",")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "event-upload-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="min-h-screen bg-[#fff8f2] text-[#40210f] px-4 py-10">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-md border border-orange-200 p-6 text-center">
        <h1 className="text-3xl font-bold mb-4 text-[#c94917]">Bulk Upload Events</h1>
        <p className="text-gray-700 text-sm mb-4">
          Upload a CSV file with event details. Each row should match your database fields.
        </p>

        <div className="mb-4">
          <button
            onClick={downloadTemplate}
            className="text-sm bg-[#c94917] text-white px-4 py-2 rounded-lg hover:bg-[#a53f12] transition"
          >
            Download CSV Template
          </button>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="border border-orange-200 rounded-lg p-2 w-full text-sm bg-[#fffaf5]"
        />

        {fileName && (
          <p className="mt-2 text-gray-600 text-sm italic">File: {fileName}</p>
        )}

        <p className="mt-4 text-sm text-gray-700">
          {uploading ? "Uploading…" : status}
        </p>
      </div>
    </main>
  );
}
