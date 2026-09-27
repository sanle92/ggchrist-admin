"use client";
import { useState } from "react";
import { Eye, Pencil } from "lucide-react";
export function RichTextEditor({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  return (
    <div className="overflow-hidden border border-admin-border bg-white">
      <div className="flex items-center justify-between border-b border-admin-border p-2">
        <span className="text-xs text-admin-muted">
          HTML and Markdown supported
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`admin-button px-3 py-1 text-xs ${!preview ? "admin-button-primary" : ""}`}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`admin-button px-3 py-1 text-xs ${preview ? "admin-button-primary" : ""}`}
          >
            <Eye size={13} /> Preview
          </button>
        </div>
      </div>
      <textarea
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={20}
        className={`admin-textarea w-full border-0 font-mono leading-6 ${preview ? "hidden" : "block"}`}
        required
      />
      {preview ? (
        <iframe
          title="Content preview"
          sandbox=""
          srcDoc={`<!doctype html><html><head><style>body{font-family:Inter,system-ui;padding:24px;color:#202223;line-height:1.7}img{max-width:100%;height:auto}h1,h2,h3{line-height:1.2}</style></head><body>${value}</body></html>`}
          className="min-h-[480px] w-full bg-white"
        />
      ) : null}
    </div>
  );
}
