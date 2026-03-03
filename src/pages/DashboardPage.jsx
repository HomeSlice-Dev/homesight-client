import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import JSZip from 'jszip';
import HomesliceReport from '../HomesliceReport';
import { elementToPdfBlob, safePdfFilename, downloadBlob } from '../utils/pdfUtils';
import { API_URL } from '../config';

export default function DashboardPage() {
  const [input, setInput] = useState('');
  const [loadingType, setLoadingType] = useState(null); // null | 'single' | 'all'
  const [reports, setReports] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [downloadProgress, setDownloadProgress] = useState(null); // null | { current, total, name }
  const [error, setError] = useState(null); // null | { status: number, message: string }

  function toggleExpanded(clientId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  async function handleFetch() {
    if (!input.trim()) return;
    setLoadingType('single');
    setError(null);
    setReports([]);
    try {
      const res = await fetch(`${API_URL}/api/reports?client_id=${encodeURIComponent(input)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError({ status: res.status, message: body.detail || body.message || 'Something went wrong.' });
        return;
      }
      const data = await res.json();
      setReports([data]);
      setExpandedIds(new Set([data.client_id]));
    } catch (err) {
      console.error('Fetch error:', err);
      setError({ status: 0, message: 'Unable to reach the server. Check your connection and try again.' });
    } finally {
      setLoadingType(null);
    }
  }

  async function handleFetchAll() {
    setLoadingType('all');
    setError(null);
    setReports([]);
    try {
      const res = await fetch(`${API_URL}/api/reports`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError({ status: res.status, message: body.detail || body.message || 'Something went wrong.' });
        return;
      }
      const data = await res.json();
      setReports(data);
      setExpandedIds(new Set());
    } catch (err) {
      console.error('Fetch all error:', err);
      setError({ status: 0, message: 'Unable to reach the server. Check your connection and try again.' });
    } finally {
      setLoadingType(null);
    }
  }

  async function handleDownloadAll() {
    if (!reports.length || downloadProgress) return;

    // Remember which rows were open so we can restore afterward
    const previousExpandedIds = new Set(expandedIds);

    // Expand every accordion so their DOM nodes are rendered and visible
    setExpandedIds(new Set(reports.map((r) => r.client_id)));

    // Wait for React to commit the DOM update + MUI's expand transition (~300ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Wait for every image inside the reports to finish loading (or fail)
    const images = document.querySelectorAll('[id^="homesight-report-"] img');
    await Promise.all(
      Array.from(images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })
      )
    );

    const zip = new JSZip();

    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      setDownloadProgress({ current: i + 1, total: reports.length, name: report.display_name });

      const el = document.getElementById(`homesight-report-${report.client_id}`);
      if (!el) continue;

      try {
        const blob = await elementToPdfBlob(el);
        zip.file(safePdfFilename(report.display_name), blob);
      } catch (err) {
        console.error(`PDF failed for ${report.display_name}:`, err);
      }
    }

    // Restore accordion state before triggering the download
    setExpandedIds(previousExpandedIds);
    setDownloadProgress(null);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, 'HomeSight_Reports.zip');
  }

  const isLoading = loadingType !== null;
  const isDownloading = downloadProgress !== null;

  return (
    <Box>
      {/* Search / action bar */}
      <Box className="print-hide" sx={{ px: 3, pt: 3, pb: 3 }}>
        <Typography
          sx={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem', mb: 2, letterSpacing: 0.5 }}
        >
          Client Report Lookup
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 760 }}>
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter client ID..."
            variant="outlined"
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            sx={{
              flex: '1 1 220px',
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                '&:hover fieldset': { borderColor: '#81bbe6' },
                '&.Mui-focused fieldset': { borderColor: '#81bbe6' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)' },
            }}
          />

          <Button
            variant="contained"
            onClick={handleFetch}
            disabled={isLoading || isDownloading}
            sx={{ whiteSpace: 'nowrap', bgcolor: '#1c5784', '&:hover': { bgcolor: '#81bbe6' }, px: 4 }}
          >
            {loadingType === 'single' ? 'Loading...' : 'Fetch Results'}
          </Button>

          <Button
            variant="outlined"
            onClick={handleFetchAll}
            disabled={isLoading || isDownloading}
            sx={{
              whiteSpace: 'nowrap',
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { borderColor: '#81bbe6', color: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
              px: 4,
            }}
          >
            {loadingType === 'all' ? 'Loading...' : 'Fetch All'}
          </Button>

          {/* Download All — only visible when multiple reports are loaded */}
          {reports.length > 1 && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadAll}
              disabled={isLoading || isDownloading}
              sx={{
                whiteSpace: 'nowrap',
                borderColor: 'rgba(129,187,230,0.5)',
                color: '#81bbe6',
                '&:hover': { borderColor: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
                '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' },
                px: 3,
              }}
            >
              {isDownloading
                ? `Generating ${downloadProgress.current} / ${downloadProgress.total}…`
                : 'Download All PDFs'}
            </Button>
          )}
        </Box>

        {/* Progress bar shown while generating PDFs */}
        {isDownloading && (
          <Box sx={{ mt: 2, maxWidth: 520 }}>
            <LinearProgress
              variant="determinate"
              value={(downloadProgress.current / downloadProgress.total) * 100}
              sx={{
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.08)',
                '& .MuiLinearProgress-bar': { bgcolor: '#81bbe6' },
              }}
            />
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', mt: 0.75 }}>
              Generating PDF {downloadProgress.current} of {downloadProgress.total} — {downloadProgress.name}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Skeleton loading rows */}
      {isLoading && (
        <Box sx={{ mx: { xs: 1, md: 3 }, mb: 4 }}>
          {Array.from({ length: loadingType === 'single' ? 1 : 4 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                bgcolor: '#111d2b',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                px: 3,
                py: 2,
                '&:first-of-type': { borderRadius: '12px 12px 0 0' },
                '&:last-of-type': { borderRadius: '0 0 12px 12px', borderBottom: 'none' },
                '&:only-of-type': { borderRadius: '12px' },
              }}
            >
              <Skeleton variant="text" width="40%" height={22} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 0.5 }} />
              <Skeleton variant="text" width="20%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
            </Box>
          ))}
        </Box>
      )}

      {/* Error page */}
      {error && !isLoading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pt: 10,
            px: 3,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: '5rem', md: '8rem' },
              fontWeight: 900,
              lineHeight: 1,
              color: 'rgba(129,187,230,0.18)',
              letterSpacing: -4,
              mb: 2,
            }}
          >
            {error.status || 'ERR'}
          </Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem', mb: 1 }}>
            {error.status === 404
              ? 'Client Not Found'
              : error.status === 500
              ? 'Server Error'
              : error.status === 0
              ? 'Connection Error'
              : 'Request Failed'}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem', maxWidth: 420, mb: 4 }}>
            {error.message}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => { setError(null); setReports([]); setInput(''); }}
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { borderColor: '#81bbe6', color: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
              px: 4,
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      )}

      {/* Accordion client list */}
      {reports.length > 0 && (
        <Box sx={{ mx: { xs: 1, md: 3 }, mb: 4 }}>
          {reports.map((report) => (
            <Accordion
              key={report.client_id}
              expanded={expandedIds.has(report.client_id)}
              onChange={() => toggleExpanded(report.client_id)}
              disableGutters
              elevation={0}
              sx={{
                bgcolor: '#111d2b',
                color: '#fff',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                '&:first-of-type': { borderRadius: '12px 12px 0 0' },
                '&:last-of-type': {
                  borderRadius: expandedIds.has(report.client_id) ? '0 0 0 0' : '0 0 12px 12px',
                  borderBottom: 'none',
                },
                '&:only-of-type': {
                  borderRadius: expandedIds.has(report.client_id) ? '12px 12px 0 0' : '12px',
                },
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#81bbe6' }} />}
                sx={{
                  px: 3,
                  py: 0.5,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  '& .MuiAccordionSummary-content': { my: 1.5 },
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.3 }}>
                    {report.display_name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', mt: 0.25 }}>
                    {report.month_year}
                  </Typography>
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ p: 0 }}>
                <Box
                  sx={{
                    mx: { xs: 1, md: 3 },
                    mb: 3,
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                  }}
                >
                  <HomesliceReport data={report} />
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
}
