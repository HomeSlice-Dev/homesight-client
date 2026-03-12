import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PrintIcon from '@mui/icons-material/Print';
import HomesliceReport from '../HomesliceReport';

// Key is passed via ?key= query param; data lives in localStorage so it crosses tabs.
const STORAGE_PREFIX = 'batch-print-';

export default function BatchPrintPage() {
  const [reports, setReports] = useState(null); // null = loading

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('key');
    if (!key) return;

    // Poll every 100 ms for up to 10 s — Playwright injects localStorage *after*
    // the page loads, so a one-shot read on mount misses the data.
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        if (raw) {
          clearInterval(interval);
          setReports(JSON.parse(raw));
          localStorage.removeItem(STORAGE_PREFIX + key);
        } else if (attempts >= 100) {
          clearInterval(interval);
          setReports([]); // timed out
        }
      } catch (err) {
        clearInterval(interval);
        console.error('BatchPrintPage: failed to parse reports', err);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!reports?.length) return;
    // Give React + MUI charts + images time to fully render before opening print dialog.
    const t = setTimeout(() => window.print(), 1800);
    return () => clearTimeout(t);
  }, [reports]);

  if (reports === null) {
    return (
      <Box sx={{ color: '#fff', p: 5, bgcolor: '#0d1b2a', minHeight: '100vh' }}>
        Loading reports…
      </Box>
    );
  }

  if (!reports.length) {
    return (
      <Box sx={{ color: '#fff', p: 5, bgcolor: '#0d1b2a', minHeight: '100vh' }}>
        No reports to print.
      </Box>
    );
  }

  return (
    <>
      {/* Floating print button — hidden by .print-hide during actual print */}
      <Box
        className="print-hide"
        sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}
      >
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          sx={{ bgcolor: '#1c5784', '&:hover': { bgcolor: '#245f8f' } }}
        >
          Print / Save as PDF
        </Button>
      </Box>

      {/* Reports rendered back-to-back; each starts on its own print page */}
      {reports.map((report, i) => (
        <Box
          key={i}
          sx={{
            // Force each report to start on a new page (after the first)
            pageBreakBefore: i > 0 ? 'always' : 'auto',
            breakBefore:     i > 0 ? 'page'   : 'auto',
          }}
        >
          <HomesliceReport data={report} hideFab />
        </Box>
      ))}
    </>
  );
}
