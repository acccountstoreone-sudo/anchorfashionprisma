export function exportToCsv<T>(filename: string, rows: T[]) {
  if (!rows || !rows.length) {
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0] as object);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k as keyof T] === null || row[k as keyof T] === undefined ? '' : row[k as keyof T];
        cell = cell instanceof Date
          ? cell.toLocaleString()
          : String(cell).replace(/"/g, '""');
        if (typeof cell === 'string' && cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  if ((navigator as any).msSaveBlob) {
    // IE 10+
    (navigator as any).msSaveBlob(blob, filename);
  } else {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
