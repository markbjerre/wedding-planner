import Konva from 'konva';
import jsPDF from 'jspdf';

/** Export Konva stage to PNG and trigger download. */
export function exportToPNG(stage: Konva.Stage, filename = 'wedding-layout.png'): void {
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  a.click();
}

/** Export Konva stage to PDF (A3 landscape) and trigger download. */
export function exportToPDF(stage: Konva.Stage, filename = 'wedding-layout.pdf'): void {
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(dataURL, 'PNG', 10, 10, pageW - 20, pageH - 20);
  pdf.save(filename);
}
