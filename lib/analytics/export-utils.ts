import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportPdfOptions {
  reportName: string;
  description?: string;
  dimensions: string[];
  metrics: { id: string; label: string; isCurrency?: boolean }[];
  dateRange?: string;
  data: Record<string, any>[];
  summary?: Record<string, number>;
  filename?: string;
  companyName?: string;
}

export function exportToCsv(data: any[], filename: string) {
  if (!data || !data.length) {
    return;
  }

  const separator = ",";
  const keys = Object.keys(data[0]);

  const csvContent =
    keys.join(separator) +
    "\n" +
    data
      .map((row) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? "" : row[k];
            cell =
              cell instanceof Date
                ? cell.toLocaleString()
                : cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  if ((navigator as any).msSaveBlob) {
    // IE 10+
    (navigator as any).msSaveBlob(blob, filename);
  } else {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

export function exportToPdf(options: ExportPdfOptions) {
  const {
    reportName,
    description = "",
    dimensions,
    metrics,
    dateRange = "30d",
    data,
    summary = {},
    filename,
    companyName = "ANCHOR FASHION",
  } = options;

  if (!data || data.length === 0) {
    throw new Error("No data available to export");
  }

  const totalCols = dimensions.length + metrics.length;
  // Use landscape if more than 5 columns to guarantee plenty of breathing room
  const isLandscape = totalCols > 5;

  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. Top Brand Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(18, 43, 89); // Navy brand primary
  doc.text(companyName, margin, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(99, 102, 241); // Indigo accent badge
  doc.text("ENTERPRISE ANALYTICS REPORT", pageWidth - margin, 18, {
    align: "right",
  });

  // 2. Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(reportName, margin, 26);

  // 3. Description & Metadata
  let currentY = 32;
  if (description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(description, margin, currentY);
    currentY += 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);

  const dateRangeMap: Record<string, string> = {
    today: "Today",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    year_to_date: "Year to Date",
    all: "All Time",
  };
  const dateRangeLabel = dateRangeMap[dateRange] || dateRange;

  const nowFormatted = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const metaText = `Period: ${dateRangeLabel}   |   Generated: ${nowFormatted}   |   Total Rows: ${data.length}`;
  doc.text(metaText, margin, currentY);
  currentY += 3;

  // Thin dividing line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // 4. Summary KPI Cards
  const summaryKeys = metrics.filter((m) => summary[m.id] !== undefined);
  if (summaryKeys.length > 0) {
    const maxPerRow = isLandscape ? 5 : 3;
    const cardHeight = 14;
    const cardGap = 3.5;

    for (let i = 0; i < summaryKeys.length; i += maxPerRow) {
      const rowItems = summaryKeys.slice(i, i + maxPerRow);
      const availableWidth = pageWidth - margin * 2;
      const cardWidth =
        (availableWidth - (rowItems.length - 1) * cardGap) / rowItems.length;

      rowItems.forEach((met, idx) => {
        const x = margin + idx * (cardWidth + cardGap);

        // Box background and border
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, "FD");

        // KPI Label
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`TOTAL ${met.label.toUpperCase()}`, x + 3, currentY + 4.5);

        // KPI Value
        const rawVal = summary[met.id];
        const displayVal = met.isCurrency
          ? `BDT ${Number(rawVal).toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}`
          : Number(rawVal).toLocaleString("en-US");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(18, 43, 89);
        doc.text(displayVal, x + 3, currentY + 10.5);
      });

      currentY += cardHeight + 3.5;
    }
    currentY += 2;
  }

  // 5. Table Data Prep
  const headers = [
    ...dimensions.map(
      (d) => d.charAt(0).toUpperCase() + d.slice(1).replace(/_/g, " ")
    ),
    ...metrics.map((m) => m.label + (m.isCurrency ? " (BDT)" : "")),
  ];

  const tableBody = data.map((row) => {
    const dVals = dimensions.map((d) =>
      row[d] !== null && row[d] !== undefined ? String(row[d]) : "-"
    );
    const mVals = metrics.map((m) => {
      const v = row[m.id];
      if (v === null || v === undefined) return "-";
      if (m.isCurrency) {
        return `BDT ${Number(v).toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`;
      }
      return Number(v).toLocaleString("en-US");
    });
    return [...dVals, ...mVals];
  });

  // Alignment: metrics right-aligned
  const columnStyles: Record<number, any> = {};
  for (let i = dimensions.length; i < totalCols; i++) {
    columnStyles[i] = { halign: "right" };
  }

  // 6. Draw Table
  autoTable(doc, {
    head: [headers],
    body: tableBody,
    startY: currentY,
    theme: "striped",
    headStyles: {
      fillColor: [18, 43, 89],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: isLandscape ? 8.5 : 8,
    },
    bodyStyles: {
      fontSize: isLandscape ? 8 : 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: margin, right: margin, bottom: 15 },
  });

  // 7. Footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text(
      "Confidential - Generated by Anchor Fashion Enterprise Reporting",
      margin,
      pageHeight - 6
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: "right" }
    );
  }

  // 8. Trigger Download
  const finalFilename =
    filename ||
    `${reportName.toLowerCase().replace(/\s+/g, "_") || "report"}.pdf`;
  doc.save(finalFilename);
}
