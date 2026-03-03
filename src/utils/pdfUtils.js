import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// A4 landscape fixed dimensions in PDF points
const A4_W = 841.89;
const A4_H = 595.28;

/**
 * Captures a DOM element and converts it to a multi-page PDF Blob.
 *
 * Page breaks snap to [data-report-section] element boundaries so no
 * section is ever split across pages. Each PDF page is given a custom
 * height exactly matching its content slice — zero blank whitespace.
 */
export async function elementToPdfBlob(el) {
  const SCALE = 2;

  const canvas = await html2canvas(el, {
    scale: SCALE,
    useCORS: true,
    logging: false,
    backgroundColor: '#0d1b2a',
  });

  const elRect  = el.getBoundingClientRect();
  const cssToPt = A4_W / elRect.width;      // CSS px → PDF points
  const totalPt = elRect.height * cssToPt;

  // Collect top + bottom of every [data-report-section] in PDF points
  const boundarySet = new Set([0]);
  el.querySelectorAll('[data-report-section]').forEach((sEl) => {
    const r      = sEl.getBoundingClientRect();
    const top    = (r.top    - elRect.top) * cssToPt;
    const bottom = (r.bottom - elRect.top) * cssToPt;
    if (top    > 0       ) boundarySet.add(top);
    if (bottom < totalPt ) boundarySet.add(bottom);
  });
  boundarySet.add(totalPt);
  const boundaries = [...boundarySet].sort((a, b) => a - b);

  // Build page-break positions.
  // For each page we find the LAST section boundary that falls at or
  // before the ideal cut (pos + A4_H), while leaving at least 25% of
  // a page worth of content on the current page.  Falls back to the
  // ideal cut if no boundary qualifies (section taller than one page).
  const breaks = [0];
  let pos = 0;
  while (pos < totalPt - 1) {
    const ideal   = pos + A4_H;
    if (ideal >= totalPt) break;

    const minNext = pos + A4_H * 0.25;
    let best = ideal;

    for (const b of boundaries) {
      if (b <= minNext) continue; // too close to start of current page
      if (b >  ideal  ) break;   // past the ideal cut — stop
      best = b;                   // keep updating: want the LAST one ≤ ideal
    }

    breaks.push(best);
    pos = best;
  }
  breaks.push(totalPt);

  // Create the PDF.  The first page uses the exact slice height so there
  // is no blank whitespace.  Every subsequent page does the same.
  const firstH = breaks[1] - breaks[0];
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [A4_W, firstH] });

  for (let i = 0; i < breaks.length - 1; i++) {
    const slicePt  = breaks[i];
    const sliceHPt = breaks[i + 1] - slicePt;

    if (i > 0) pdf.addPage([A4_W, sliceHPt]);

    // Map PDF points → canvas pixels and extract the vertical slice
    const srcY = Math.round((slicePt  / cssToPt) * SCALE);
    const srcH = Math.max(1, Math.round((sliceHPt / cssToPt) * SCALE));

    const slice    = document.createElement('canvas');
    slice.width    = canvas.width;
    slice.height   = srcH;
    slice.getContext('2d').drawImage(
      canvas,
      0, srcY, canvas.width, srcH,
      0, 0,   canvas.width, srcH,
    );

    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W, sliceHPt);
  }

  return pdf.output('blob');
}

/** Converts a client display name to a safe PDF filename. */
export function safePdfFilename(displayName) {
  return (
    displayName
      .replace(/[^a-z0-9\s\-_]/gi, '')
      .trim()
      .replace(/\s+/g, '_') + '.pdf'
  );
}

/** Triggers a browser file download for a Blob. */
export function downloadBlob(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
