export function numberToWordsBDT(num: number): string {
  if (!num || num === 0) return "Zero Taka Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + a[n % 10] : "") + " ";
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred " + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + "Thousand " + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + "Lakh " + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + "Crore " + inWords(n % 10000000);
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let result = inWords(integerPart).trim() + " Taka";
  if (decimalPart > 0) {
    result += " and " + inWords(decimalPart).trim() + " Poisha";
  }
  return result + " Only";
}

export interface GRNPrintData {
  inwardNumber: string;
  receivedAt?: string;
  warehouseName: string;
  supplierName: string;
  inwardType: string;
  receivedBy?: string;
  notes?: string;
  totalQuantity: number;
  totalCost: number;
  items: Array<{
    sku?: string;
    name?: string;
    attributes?: any;
    batchNumber?: string;
    previousQuantity?: number;
    quantity: number;
    newQuantity?: number;
    unitCost: number;
    lineTotal: number;
  }>;
}

export function generateGRNPrintHTML(data: GRNPrintData): string {
  const dateStr = data.receivedAt
    ? new Date(data.receivedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  const timeStr = data.receivedAt
    ? new Date(data.receivedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

  const words = numberToWordsBDT(data.totalCost || 0);

  const rowsHTML = (data.items || [])
    .map((item, idx) => {
      const attrStr =
        item.attributes && typeof item.attributes === "object"
          ? Object.entries(item.attributes)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" | ")
          : "";

      return `
      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-mono font-bold">${item.sku || "—"}</td>
        <td>
          <div class="font-semibold text-dark">${item.name || "Product Item"}</div>
          ${attrStr ? `<div class="sub-text">${attrStr}</div>` : ""}
        </td>
        <td class="font-mono text-center">${item.batchNumber || "—"}</td>
        <td class="text-center font-mono text-muted">${item.previousQuantity ?? "—"}</td>
        <td class="text-center font-mono font-bold text-accent">+${item.quantity}</td>
        <td class="text-center font-mono font-bold">${item.newQuantity ?? "—"}</td>
        <td class="text-right font-mono">${(item.unitCost || 0).toFixed(2)}</td>
        <td class="text-right font-mono font-bold">${(item.lineTotal || 0).toFixed(2)}</td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Goods Received Note (GRN) - ${data.inwardNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.35;
      padding: 4mm 0;
    }

    .container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }

    /* Top Letterhead */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .header-table td {
      vertical-align: top;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.1;
    }

    .brand-sub {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }

    .brand-contact {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.3;
    }

    .doc-badge-box {
      text-align: right;
    }

    .doc-type-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 4px;
    }

    .doc-number {
      font-size: 15px;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 4px;
    }

    .doc-meta {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
    }

    /* Metadata 2-Column Cards */
    .meta-grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px 0;
      margin-bottom: 12px;
    }

    .meta-card {
      width: 50%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
      vertical-align: top;
    }

    .card-title {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 10px;
    }

    .meta-label {
      color: #64748b;
      font-weight: 500;
    }

    .meta-val {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }

    /* Itemized Inward Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 10px;
    }

    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.4px;
      padding: 6px 6px;
      border: 1px solid #0f172a;
    }

    .items-table td {
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }

    .items-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .text-dark { color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-accent { color: #047857; }
    .sub-text { font-size: 8.5px; color: #64748b; margin-top: 1px; }

    .totals-row td {
      background: #f1f5f9 !important;
      font-weight: 800;
      border-top: 2px solid #0f172a;
      padding: 6px;
    }

    /* Valuation & Words Summary */
    .summary-box {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      background: #f8fafc;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .words-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .words-val {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
      font-style: italic;
      margin-top: 2px;
    }

    .valuation-block {
      text-align: right;
      padding-left: 16px;
      border-left: 2px solid #cbd5e1;
    }

    .valuation-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .valuation-amount {
      font-size: 16px;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
    }

    /* Legal Certification */
    .cert-box {
      border: 1px solid #e2e8f0;
      background: #ffffff;
      border-left: 3px solid #0f172a;
      padding: 6px 10px;
      font-size: 8.5px;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 16px;
    }

    /* 4-Column Physical Sign-off */
    .signature-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      page-break-inside: avoid;
    }

    .signature-cell {
      width: 25%;
      text-align: center;
      padding: 0 6px;
      vertical-align: bottom;
    }

    .sig-line {
      border-top: 1px dashed #64748b;
      padding-top: 6px;
      margin-bottom: 2px;
    }

    .sig-title {
      font-weight: 800;
      font-size: 9.5px;
      color: #0f172a;
      text-transform: uppercase;
    }

    .sig-role {
      font-size: 8.5px;
      color: #64748b;
    }

    .sig-date {
      font-size: 8px;
      color: #94a3b8;
      margin-top: 2px;
    }

    /* Footer */
    .footer-bar {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 58%;">
          <div class="brand-title">ANCHOR FASHION</div>
          <div class="brand-sub">Central Warehouse & Logistics Network</div>
          <div class="brand-contact">
            Plot # 42, Sector 7, Uttara Model Town, Dhaka-1230, Bangladesh<br>
            Direct: +880 9612-ANCHOR | Email: inventory@anchorfashion.com<br>
            VAT / BIN Registration: <strong>002948192-0101</strong>
          </div>
        </td>
        <td style="width: 42%;" class="doc-badge-box">
          <div class="doc-type-badge">Goods Received Note (GRN)</div>
          <div class="doc-number">${data.inwardNumber}</div>
          <div class="doc-meta">
            Date: <strong>${dateStr}</strong> | Time: <strong>${timeStr}</strong>
          </div>
          <div class="doc-meta" style="color: #047857; font-weight: 700; margin-top: 3px;">
            ● STATUS: VERIFIED & RESTOCKED
          </div>
        </td>
      </tr>
    </table>

    <!-- Metadata Grid -->
    <table class="meta-grid">
      <tr>
        <td class="meta-card">
          <div class="card-title">Destination & Inward Info</div>
          <div class="meta-row">
            <span class="meta-label">Destination Warehouse:</span>
            <span class="meta-val">${data.warehouseName}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Inward Nature:</span>
            <span class="meta-val">${data.inwardType}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Received Date:</span>
            <span class="meta-val">${dateStr}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Received / Checked By:</span>
            <span class="meta-val">${data.receivedBy || "Store In-Charge"}</span>
          </div>
        </td>
        <td class="meta-card">
          <div class="card-title">Source & Shipment Reference</div>
          <div class="meta-row">
            <span class="meta-label">Supplier / Source:</span>
            <span class="meta-val">${data.supplierName}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Document Reference:</span>
            <span class="meta-val">${data.notes ? data.notes.slice(0, 32) : "Direct Warehouse Inward"}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Total SKUs:</span>
            <span class="meta-val font-mono">${(data.items || []).length} Line Items</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Total Physical Quantity:</span>
            <span class="meta-val font-mono" style="color: #047857;">${data.totalQuantity} Garment Units</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Table of Received Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 25px;">#</th>
          <th style="width: 110px;">SKU Code</th>
          <th>Item Description & Attributes</th>
          <th style="width: 70px;">Lot #</th>
          <th style="width: 55px;">Prev Qty</th>
          <th style="width: 65px;">Inward Qty</th>
          <th style="width: 55px;">New Qty</th>
          <th style="width: 70px;">Unit Cost</th>
          <th style="width: 80px;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
        <tr class="totals-row">
          <td colspan="4" class="text-right">GRAND TOTALS:</td>
          <td class="text-center font-mono text-muted">—</td>
          <td class="text-center font-mono text-accent text-dark" style="font-size: 11px;">+${data.totalQuantity}</td>
          <td class="text-center font-mono text-muted">—</td>
          <td class="text-right font-mono text-muted">—</td>
          <td class="text-right font-mono text-dark" style="font-size: 11px;">
            BDT ${data.totalCost?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Valuation & Words Summary -->
    <div class="summary-box">
      <div>
        <div class="words-label">Amount in Words (BDT)</div>
        <div class="words-val">${words}</div>
      </div>
      <div class="valuation-block">
        <div class="valuation-label">Total GRN Valuation</div>
        <div class="valuation-amount">
          BDT ${data.totalCost?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>

    <!-- Certification / Verification Statement -->
    <div class="cert-box">
      <strong>INSPECTION & RECEIVING CERTIFICATION:</strong> I hereby certify that the merchandise enumerated above has been physically counted, inspected for fabric/stitching quality, verified against accompanying challan/PO, and posted into the Anchor Fashion inventory system with full serial traceability.
    </div>

    <!-- Signatures (4 Columns) -->
    <table class="signature-grid">
      <tr>
        <td class="signature-cell">
          <div style="height: 38px;"></div>
          <div class="sig-line"></div>
          <div class="sig-title">Received By</div>
          <div class="sig-role">Storekeeper / Receiving Officer</div>
          <div class="sig-date">Date: ____________________</div>
        </td>
        <td class="signature-cell">
          <div style="height: 38px;"></div>
          <div class="sig-line"></div>
          <div class="sig-title">QA Inspected By</div>
          <div class="sig-role">Quality Control Specialist</div>
          <div class="sig-date">Date: ____________________</div>
        </td>
        <td class="signature-cell">
          <div style="height: 38px;"></div>
          <div class="sig-line"></div>
          <div class="sig-title">Delivered By</div>
          <div class="sig-role">Supplier / Carrier Agent</div>
          <div class="sig-date">Date: ____________________</div>
        </td>
        <td class="signature-cell">
          <div style="height: 38px;"></div>
          <div class="sig-line"></div>
          <div class="sig-title">Authorized By</div>
          <div class="sig-role">Warehouse / IMS Manager</div>
          <div class="sig-date">Date: ____________________</div>
        </td>
      </tr>
    </table>

    <!-- Footer -->
    <div class="footer-bar">
      <span>Anchor Fashion Enterprise IMS • Central Distribution Hub</span>
      <span>Official Commercial Inward Voucher (Valid without manual seal)</span>
      <span>Page 1 of 1</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Open an isolated hidden iframe, inject the pristine A4 print HTML, and trigger browser print dialog.
 */
export function printGRNChallan(data: GRNPrintData): void {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.zIndex = "-9999";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      console.error("Unable to access print iframe document");
      return;
    }

    const html = generateGRNPrintHTML(data);
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 400);
  } catch (error) {
    console.error("Print GRN Challan error:", error);
    window.print();
  }
}
