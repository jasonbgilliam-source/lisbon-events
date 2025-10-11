"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EventRow = Record<string, any>;

export default function BulkUploadPage() {
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<EventRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stage, setStage] = useState<"upload" | "review" | "done">("upload");

  // ✅ Load categories for dropdowns and template
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase.from("category_catalog").select("name");
      if (error) console.error(error);
      else setCategories(data.map((c: any) => c.name));
    }
    loadCategories();
  }, []);

  // ✅ Handle CSV upload and parse preview
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("");
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as EventRow[];

        const cleanRows = rows.map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [k.trim(), typeof v === "string" ? v.trim() : v])
          )
        );

        setPreview(cleanRows);
        setStage("review");
        setUploading(false);
      },
      error: (err) => {
        console.error(err);
        setStatus("❌ Error parsing CSV.");
        setUploading(false);
      },
    });
  }

  // ✅ Allow inline category correction
  function updateCategory(index: number, newCategory: string) {
    const updated = [...preview];
    updated[index].category = newCategory;
    setPreview(updated);
  }

  // ✅ Validate categories and upload
  async function handleConfirmUpload() {
    setUploading(true);
    setStatus("");

    const invalidRows = preview.filter(
      (r) => !categories.includes(r.category?.trim())
    );

    if (invalidRows.length > 0) {
      setStatus("❌ Please correct highlighted categories before uploading.");
      setUploading(false);
      return;
    }

    const { error } = await supabase.from("event_submissions").insert(preview);
    if (error) {
      console.error(error);
      setStatus(`❌ Upload failed: ${error.message}`);
    } else {
      setStatus(`✅ Successfully uploaded ${preview.length} events!`);
      setStage("done");
    }
    setUploading(false);
  }

  // ✅ Download CSV template with categories appended
  async function downloadTemplate() {
    const { data, error } = await supabase.from("category_catalog").select("name");
    const catList = error ? [] : data.map((c: any) => c.name);

    const templateHeaders = [
      "title","description","starts_at","ends_at","location_name","address",
      "city","category","price","age","organizer_email","ticket_url",
      "image_url","youtube_url","spotify_url","is_free"
    ];

    const categoriesText = `\n\n# Allowed categories:\n# ${catList.join(", ")}`;

    const blob = new Blob([templateHeaders.join(",") + categoriesText], {
      type: "text/csv;charset=utf-8;",
    });

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
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md border border-orange-200 p-6 text-center">
        <h1 className="text-3xl font-bold mb-4 text-[#c94917]">
          Bulk Upload Events
        </h1>

        {stage === "upload" && (
          <>
            <p className="text-gray-700 text-sm mb-4">
              Upload a CSV file with event details. Each row should match your event fields.
            </p>
            <div className="mb-4 flex flex-col items-center gap-3">
              <button
                onClick={downloadTemplate}
                className="text-sm bg-[#c94917] text-white px-4 py-2 rounded-lg hover:bg-[#a53f12] transition"
              >
                Download CSV Template
              </button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="border border-orange-200 rounded-lg p-2 w-full text-sm bg-[#fffaf5] max-w-sm"
              />
              {fileName && (
                <p className="text-gray-600 text-sm italic">File: {fileName}</p>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-700">{uploading ? "Parsing…" : status}</p>
          </>
        )}

        {stage === "review" && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3">Review Your Upload</h2>
            <p className="text-sm text-gray-600 mb-4">
              Invalid categories are highlighted in red — select a valid one before confirming.
            </p>

            <div className="overflow-x-auto border rounded-lg max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-[#fff1e8] sticky top-0">
                  <tr>
                    {Object.keys(preview[0] || {}).map((key) => (
                      <th
                        key={key}
                        className="border border-orange-200 px-2 py-1 font-medium text-[#40210f]"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const invalid = !categories.includes(row.category?.trim());
                    return (
                      <tr key={i} className="odd:bg-[#fffaf5] even:bg-white">
                        {Object.entries(row).map(([key, value]) => (
                          <td
                            key={key}
                            className={`border border-orange-100 px-2 py-1 ${
                              key === "category" && invalid ? "bg-red-100" : ""
                            }`}
                          >
                            {key === "category" && invalid ? (
                              <select
                                value={row.category || ""}
                                onChange={(e) =>
                                  updateCategory(i, e.target.value)
                                }
                                className="border border-orange-300 rounded px-1 py-0.5 text-sm"
                              >
                                <option value="">Select...</option>
                                {categories.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setStage("upload")}
                className="border border-orange-300 text-[#40210f] px-4 py-1.5 rounded-lg hover:bg-orange-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="bg-[#c94917] text-white px-5 py-1.5 rounded-lg hover:bg-[#a53f12] transition"
              >
                {uploading ? "Uploading…" : "Confirm Upload"}
              </button>
            </div>

            <p className="mt-4 text-sm text-gray-700">{status}</p>
          </div>
        )}

        {stage === "done" && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-green-700 mb-3">
              Upload Complete!
            </h2>
            <p className="text-sm mb-5">{status}</p>
            <button
              onClick={() => {
                setPreview([]);
                setStage("upload");
                setStatus("");
                setFileName("");
              }}
              className="bg-[#c94917] text-white px-4 py-2 rounded-lg hover:bg-[#a53f12] transition"
            >
              Upload Another File
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
