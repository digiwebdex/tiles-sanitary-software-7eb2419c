import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
  format?: "currency" | "number" | "percent" | "date";
}

/**
 * Export data to Excel (.xlsx) and trigger download.
 */
export function exportToExcel(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
) {
  if (data.length === 0) return;

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return "";
      if (col.format === "currency" || col.format === "number") return Number(val);
      if (col.format === "percent") return Number(val) / 100;
      return String(val);
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-width columns
  ws["!cols"] = columns.map((col, i) => {
    const maxLen = Math.max(
      col.header.length,
      ...rows.map((r) => String(r[i] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Common column definitions for reuse
export const commonColumns = {
  products: [
    { header: "SKU", key: "sku" },
    { header: "Name", key: "name" },
    { header: "Brand", key: "brand" },
    { header: "Category", key: "category" },
    { header: "Unit Type", key: "unitType" },
    { header: "Box Qty", key: "boxQty", format: "number" as const },
    { header: "SFT Qty", key: "sftQty", format: "number" as const },
    { header: "Piece Qty", key: "pieceQty", format: "number" as const },
    { header: "Avg Cost", key: "avgCost", format: "currency" as const },
    { header: "Stock Value", key: "stockValue", format: "currency" as const },
    { header: "Reorder Level", key: "reorderLevel", format: "number" as const },
  ],
  customers: [
    { header: "Name", key: "name" },
    { header: "Type", key: "type" },
    { header: "Phone", key: "phone" },
    { header: "Email", key: "email" },
    { header: "Address", key: "address" },
    { header: "Credit Limit", key: "credit_limit", format: "currency" as const },
    { header: "Opening Balance", key: "opening_balance", format: "currency" as const },
  ],
  suppliers: [
    { header: "Name", key: "name" },
    { header: "Phone", key: "phone" },
    { header: "Email", key: "email" },
    { header: "Contact Person", key: "contact_person" },
    { header: "GSTIN", key: "gstin" },
    { header: "Address", key: "address" },
    { header: "Opening Balance", key: "opening_balance", format: "currency" as const },
  ],
};
