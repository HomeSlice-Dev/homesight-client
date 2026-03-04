import { useState, startTransition } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SearchIcon from '@mui/icons-material/Search';
import JSZip from 'jszip';
import HomesliceReport from '../HomesliceReport';
import { elementToPdfBlob, safePdfFilename, downloadBlob } from '../utils/pdfUtils';
import { apiFetch } from '../utils/api';

export default function DashboardPage() {
  const [input, setInput] = useState('');
  const [loadingType, setLoadingType] = useState(null); // null | 'single' | 'all'
  const [reports, setReports] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [mountedIds, setMountedIds] = useState(new Set()); // IDs where HomesliceReport is in the DOM
  const [downloadProgress, setDownloadProgress] = useState(null); // null | { current, total, name }
  const [error, setError] = useState(null); // null | { status: number, message: string }

  function toggleExpanded(clientId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
        // Schedule mounting the heavy report content after the accordion header animates open
        startTransition(() => {
          setMountedIds((m) => new Set([...m, clientId]));
        });
      }
      return next;
    });
  }

  async function handleFetch() {
    if (!input.trim()) return;
    setLoadingType('single');
    setError(null);
    setReports([]);
    setMountedIds(new Set());
    try {
      const res = await apiFetch(`/api/reports?client_id=${encodeURIComponent(input)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError({ status: res.status, message: body.detail || body.message || 'Something went wrong.' });
        return;
      }
      const data = await res.json();
      setReports([data]);
      setExpandedIds(new Set([data.client_id]));
      // Single result auto-expands — mount immediately (no need to defer)
      setMountedIds(new Set([data.client_id]));
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
    setMountedIds(new Set());
    try {
      const res = await apiFetch(`/api/reports`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError({ status: res.status, message: body.detail || body.message || 'Something went wrong.' });
        return;
      }
      const data = await res.json();
      setReports(data);
      setExpandedIds(new Set()); // all collapsed; mountedIds stays empty
    } catch (err) {
      console.error('Fetch all error:', err);
      setError({ status: 0, message: 'Unable to reach the server. Check your connection and try again.' });
    } finally {
      setLoadingType(null);
    }
  }

  async function handleDownloadAll() {
    if (!reports.length || downloadProgress) return;

    const previousExpandedIds = new Set(expandedIds);
    const allIds = new Set(reports.map((r) => r.client_id));

    // Expand and mount every report so their DOM nodes are rendered and visible
    setExpandedIds(allIds);
    setMountedIds(allIds);

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
      {/* ── Action bar ── */}
      <Box className="print-hide" sx={{ px: 3, pt: 3, pb: 3 }}>

        {/* Header row: title + All Clients */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem', letterSpacing: 0.5 }}>
            Client Report Lookup
          </Typography>
          <Button
            variant="outlined"
            startIcon={
              loadingType === 'all'
                ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                : <PeopleOutlineIcon fontSize="small" />
            }
            onClick={handleFetchAll}
            disabled={isLoading || isDownloading}
            sx={{
              whiteSpace: 'nowrap',
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.8rem',
              px: 2,
              '&:hover': { borderColor: '#81bbe6', color: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
              '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' },
            }}
          >
            {loadingType === 'all' ? 'Loading…' : 'All Clients'}
          </Button>
        </Box>

        {/* Toolbar surface */}
        <Box
          sx={{
            bgcolor: '#111d2b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
            px: 1.5,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {/* ── Client ID search ── */}
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Client ID"
            variant="outlined"
            size="small"
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            sx={{
              flex: '1 1 160px',
              maxWidth: 240,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.04)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                '&:hover fieldset': { borderColor: '#81bbe6' },
                '&.Mui-focused fieldset': { borderColor: '#81bbe6' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' },
            }}
          />
          <Button
            variant="contained"
            onClick={handleFetch}
            disabled={isLoading || isDownloading}
            startIcon={
              loadingType === 'single'
                ? <CircularProgress size={14} color="inherit" />
                : <SearchIcon fontSize="small" />
            }
            sx={{
              whiteSpace: 'nowrap',
              bgcolor: '#1c5784',
              '&:hover': { bgcolor: '#81bbe6' },
              '&.Mui-disabled': { bgcolor: 'rgba(28,87,132,0.35)', color: 'rgba(255,255,255,0.3)' },
              px: 2.5,
              fontSize: '0.875rem',
            }}
          >
            {loadingType === 'single' ? 'Searching…' : 'Search'}
          </Button>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 0.5 }} />

          {/* ── Date range (placeholder — functionality coming soon) ── */}
          <Tooltip title="Date filtering coming soon" placement="top" arrow>
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CalendarMonthIcon fontSize="small" />}
                disabled
                sx={{
                  whiteSpace: 'nowrap',
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'none',
                  fontWeight: 400,
                  fontSize: '0.8rem',
                  px: 1.5,
                  '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.25)' },
                }}
              >
                Start month
              </Button>
            </span>
          </Tooltip>
          <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', userSelect: 'none' }}>
            —
          </Typography>
          <Tooltip title="Date filtering coming soon" placement="top" arrow>
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CalendarMonthIcon fontSize="small" />}
                disabled
                sx={{
                  whiteSpace: 'nowrap',
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'none',
                  fontWeight: 400,
                  fontSize: '0.8rem',
                  px: 1.5,
                  '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.25)' },
                }}
              >
                End month
              </Button>
            </span>
          </Tooltip>

          {/* ── Spacer ── */}
          <Box sx={{ flexGrow: 1 }} />

          {/* ── Download All — right-anchored, visible when multiple reports loaded ── */}
          {reports.length > 1 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={handleDownloadAll}
              disabled={isLoading || isDownloading}
              sx={{
                whiteSpace: 'nowrap',
                borderColor: 'rgba(129,187,230,0.4)',
                color: '#81bbe6',
                fontSize: '0.8rem',
                px: 2,
                '&:hover': { borderColor: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
                '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' },
              }}
            >
              {isDownloading
                ? `${downloadProgress.current} / ${downloadProgress.total}`
                : 'Download All PDFs'}
            </Button>
          )}
        </Box>

        {/* Progress bar — below toolbar when generating PDFs */}
        {isDownloading && (
          <Box sx={{ mt: 1.5, maxWidth: 520 }}>
            <LinearProgress
              variant="determinate"
              value={(downloadProgress.current / downloadProgress.total) * 100}
              sx={{
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.08)',
                '& .MuiLinearProgress-bar': { bgcolor: '#81bbe6' },
              }}
            />
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', mt: 0.75 }}>
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
              TransitionProps={{ timeout: { enter: 300, exit: 100 } }}
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
                {mountedIds.has(report.client_id) ? (
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
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress sx={{ color: '#81bbe6' }} />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
}
