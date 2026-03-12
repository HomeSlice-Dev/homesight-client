import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import HomesliceReport from '../HomesliceReport';

const CAPTURE_WIDTH = 720; // matches @page letter content width
const RENDER_WAIT_MS = 2500; // time for React + MUI charts + images to fully render

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reportToPdfBuffer(reportData) {
  // Create a visible-but-off-screen container so html2canvas can capture it.
  // Do NOT use visibility:hidden — html2canvas skips hidden content.
  const el = document.createElement('div');
  Object.assign(el.style, {
    position:      'fixed',
    left:          '-9999px',
    top:           '0',
    width:         `${CAPTURE_WIDTH}px`,
    pointerEvents: 'none',
    zIndex:        '-1',
    background:    '#0d1b2a',
  });
  document.body.appendChild(el);

  const root = createRoot(el);
  root.render(createElement(HomesliceReport, { data: reportData, hideFab: true }));

  // Wait for React, MUI X Charts, and images to finish rendering
  await wait(RENDER_WAIT_MS);

  try {
    const canvas = await html2canvas(el, {
      scale:       1.5,
      useCORS:     true,
      allowTaint:  true,
      logging:     false,
      scrollX:     0,
      scrollY:     0,
      backgroundColor: '#0d1b2a',
    });

    const pdf   = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH  = pageW * (canvas.height / canvas.width);
    const img   = canvas.toDataURL('image/jpeg', 0.88);

    let y = 0;
    while (y < imgH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', 0, -y, pageW, imgH);
      y += pageH;
    }

    return pdf.output('arraybuffer');
  } finally {
    root.unmount();
    el.remove();
  }
}

/**
 * Renders each report as a PDF, bundles them into a ZIP, and triggers a download.
 *
 * @param {object[]} reports   - Full report data objects (from /api/reports)
 * @param {string}   aeName    - Account executive name (used in the ZIP filename)
 * @param {function} onProgress - Called with (current, total) after each PDF is generated
 */
export async function downloadReportsAsZip({ reports, aeName, onProgress }) {
  const zip = new JSZip();

  for (let i = 0; i < reports.length; i++) {
    onProgress(i + 1, reports.length);
    try {
      const buf    = await reportToPdfBuffer(reports[i]);
      const client = (reports[i].pages?.cover?.customer_name ?? `report-${i + 1}`)
                       .replace(/[/\\?%*:|"<>]/g, '-');
      const period = reports[i].date_start ?? '';
      zip.file(`${client}${period ? ` - ${period}` : ''}.pdf`, buf);
    } catch (err) {
      console.error(`PDF generation failed for report ${i}:`, err);
    }
  }

  const today = new Date()
    .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    .replace(/\//g, '-');

  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: `${aeName} - Reports ${today}.zip`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
