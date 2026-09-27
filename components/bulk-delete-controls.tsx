"use client";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
export function BulkDeleteControls({ group }: { group: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const boxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `[data-bulk-group="${group}"]`,
      ),
    );
    const update = () => setCount(boxes.filter((x) => x.checked).length);
    boxes.forEach((x) => x.addEventListener("change", update));
    return () => boxes.forEach((x) => x.removeEventListener("change", update));
  }, [group]);
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          onChange={(e) =>
            document
              .querySelectorAll<HTMLInputElement>(
                `[data-bulk-group="${group}"]`,
              )
              .forEach((x) => {
                x.checked = e.target.checked;
                x.dispatchEvent(new Event("change", { bubbles: true }));
              })
          }
        />{" "}
        Select all
      </label>
      <button
        disabled={!count}
        onClick={(e) => {
          if (!confirm(`Permanently delete ${count} selected item(s)?`))
            e.preventDefault();
        }}
        className="admin-button border border-rose-200 bg-white text-rose-700 disabled:opacity-40"
      >
        <Trash2 size={15} /> Delete selected {count ? `(${count})` : ""}
      </button>
    </div>
  );
}
