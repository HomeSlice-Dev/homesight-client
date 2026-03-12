import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';
import ReportDrawer from '../components/ReportDrawer';
import { apiFetch } from '../utils/api';
import { API_URL } from '../config';

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtCurrency(v) {
  return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNumber(v) {
  return Number(v).toLocaleString('en-US');
}
function fmtPercent(v) {
  return `${Number(v).toFixed(2)}%`;
}

const CLIENT_COLUMNS = [
  { field: 'display_name',      headerName: 'Client',       flex: 2, minWidth: 180 },
  { field: 'account_executive',      headerName: 'Account Executive',       flex: 2, minWidth: 180 },
  { field: 'month_year',        headerName: 'Period',        flex: 1, minWidth: 160,
    valueFormatter: (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '' },
  { field: 'total_cost',        headerName: 'Total Cost',    flex: 1, minWidth: 130, valueFormatter: (v) => fmtCurrency(v) },
  { field: 'total_clicks',      headerName: 'Clicks',        flex: 1, minWidth: 100, valueFormatter: (v) => fmtNumber(v) },
  { field: 'total_impressions', headerName: 'Impressions',   flex: 1, minWidth: 130, valueFormatter: (v) => fmtNumber(v) },
  { field: 'total_ctr',         headerName: 'CTR',           flex: 1, minWidth: 90,  valueFormatter: (v) => fmtPercent(v) },
];

export default function DashboardPage() {
  const [filterText,     setFilterText]     = useState('');
  const [filterAE,       setFilterAE]       = useState('');
  const [dlLoading,      setDlLoading]      = useState(false);
  const [dlProgress,     setDlProgress]     = useState(null); // { current, total, name }
  const [reports,        setReports]        = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [drawerLoading,  setDrawerLoading]  = useState(false);
  const [selectedRowId,  setSelectedRowId]  = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/reports');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError({ status: res.status, message: body.detail || body.message || 'Something went wrong.' });
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.reports ?? data.items ?? data.data ?? []);
      setReports(arr);
    } catch (err) {
      console.error('Fetch all error:', err);
      setError({ status: 0, message: 'Unable to reach the server. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRowClick(params) {
    const summary = reports[params.id];
    console.log('summary', summary)
    if (!summary) return;

    setSelectedRowId(params.id);
    setDrawerOpen(true);
    setSelectedReport(null);
    setDrawerLoading(true);
    try {
      const res = await apiFetch(`/api/reports?display_name=${encodeURIComponent(summary.pages.cover.customer_name)}`);
      if (res.ok) {
        const json = await res.json();
        const report = Array.isArray(json) ? json[0] : (json.reports?.[0] ?? json);
        setSelectedReport(report);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setDrawerLoading(false);
    }
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setSelectedRowId(null);
  }

  async function handleBatchDownload() {
    const reportsToDownload = filteredRows.map((row) => reports[row.id]);
    const token = localStorage.getItem('authToken');
    setDlLoading(true);
    setDlProgress({ current: 0, total: reportsToDownload.length, name: '' });
    try {
      const res = await fetch(`${API_URL}/api/reports/batch-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ae_name: filterAE, token, reports: reportsToDownload }),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let jobId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'progress') {
            setDlProgress({ current: event.current, total: event.total, name: event.name });
          } else if (event.type === 'done') {
            jobId = event.job_id;
          }
        }
      }

      if (!jobId) throw new Error('No job ID received from server');

      const dlRes = await fetch(
        `${API_URL}/api/reports/batch-pdf/download/${jobId}?ae_name=${encodeURIComponent(filterAE)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);

      const buf = await dlRes.arrayBuffer();
      const blob = new Blob([buf], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href:     url,
        download: `${filterAE} - Reports.zip`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Batch download error:', err);
      alert(`PDF generation failed: ${err?.message ?? String(err)}`);
    } finally {
      setDlLoading(false);
      setDlProgress(null);
    }
  }

  // Build flat rows for the DataGrid — use array index as id so that multiple
  // reports per client (different months share the same client_id) each get a unique row.
  const rows = reports.map((r, i) => ({
    id:                i,
    display_name:      r.pages.cover.customer_name ?? '-',
    account_executive: r.ae_name ?? '-',
    month_year:        r.date_start ?? '-',
    total_cost:        r.pages?.cover?.cards?.total_cost        ?? 0,
    total_clicks:      r.pages?.cover?.cards?.total_clicks      ?? 0,
    total_impressions: r.pages?.cover?.cards?.total_impressions ?? 0,
    total_ctr:         r.pages?.cover?.cards?.total_ctr         ?? 0,
  }));

  const filteredRows = rows.filter((r) => {
    const matchesName = !filterText.trim() || r.display_name.toLowerCase().includes(filterText.toLowerCase());
    const matchesAE   = !filterAE           || r.account_executive === filterAE;
    return matchesName && matchesAE;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── Action bar ── */}
      <Box className="print-hide" sx={{ px: 3, pt: 3, pb: 3, flexShrink: 0 }}>

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
          {/* ── Client name filter ── */}
          <TextField
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by client name…"
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.1rem' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              flex: '1 1 200px',
              maxWidth: 300,
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

          {/* ── Account executive filter ── */}
          <FormControl size="small" sx={{ flex: '1 1 180px', maxWidth: 220 }}>
            <Select
              displayEmpty
              value={filterAE}
              onChange={(e) => setFilterAE(e.target.value)}
              sx={{
                color: filterAE ? '#fff' : 'rgba(255,255,255,0.3)',
                bgcolor: 'rgba(255,255,255,0.04)',
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#81bbe6' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#81bbe6' },
                '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.3)' },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { bgcolor: '#111d2b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
                },
              }}
            >
              <MenuItem value="" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
                All account executives
              </MenuItem>
              {['Shelley Hughes', 'Brad Heid', 'Mitchell Stafford', 'House Digital',
                'Tyler Kaitfors', 'Therly Hofman', 'Tanya Wilson', 'Breezy Millar'].map((ae) => (
                <MenuItem key={ae} value={ae} sx={{ fontSize: '0.875rem' }}>{ae}</MenuItem>
              ))}
            </Select>
          </FormControl>

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

          <Box sx={{ flexGrow: 1 }} />

          {/* ── Row count indicator ── */}
          {!loading && reports.length > 0 && (
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>
              {filteredRows.length} of {reports.length} clients
            </Typography>
          )}

          {/* ── Batch PDF download ── */}
          <Tooltip
            title={!filterAE ? 'Select an account executive to enable bulk download' : `Download all ${filteredRows.length} report(s) as a ZIP of PDFs`}
            placement="top"
            arrow
          >
            <span>
              <Button
                variant="contained"
                size="small"
                startIcon={
                  dlLoading
                    ? <CircularProgress size={13} color="inherit" />
                    : <DownloadIcon fontSize="small" />
                }
                onClick={handleBatchDownload}
                disabled={!filterAE || filteredRows.length === 0 || dlLoading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  px: 1.5,
                  bgcolor: '#1c5784',
                  '&:hover': { bgcolor: '#245f8f' },
                  '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' },
                  whiteSpace: 'nowrap',
                }}
              >
                {dlProgress && dlProgress.total > 0
                  ? `Generating ${dlProgress.current}/${dlProgress.total}…`
                  : dlLoading
                    ? 'Starting…'
                    : `Download PDFs (${filteredRows.length})`}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* ── PDF generation progress bar ── */}
        {dlProgress && dlProgress.total > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                {dlProgress.name || 'Preparing…'}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
                {dlProgress.current} / {dlProgress.total}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(dlProgress.current / dlProgress.total) * 100}
              sx={{
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.08)',
                '& .MuiLinearProgress-bar': { bgcolor: '#1c5784', borderRadius: 1 },
              }}
            />
          </Box>
        )}
      </Box>

      {/* ── Error state ── */}
      {error && !loading && (
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
              ? 'Not Found'
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
            onClick={fetchAll}
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { borderColor: '#81bbe6', color: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
              px: 4,
            }}
          >
            Retry
          </Button>
        </Box>
      )}

      {/* ── DataGrid ── */}
      {!error && (
        <Box sx={{ flex: 1, minHeight: 0, mx: { xs: 1, md: 3 }, pb: 2 }}>
          <DataGrid
            rows={filteredRows}
            columns={CLIENT_COLUMNS}
            loading={loading}
            onRowClick={handleRowClick}
            getRowClassName={(params) => params.id === selectedRowId ? 'row-active' : ''}
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableColumnMenu
            sx={{
              height: '100%',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
              color: '#fff',
              bgcolor: '#111d2b',
              '& .MuiDataGrid-columnHeader':          { bgcolor: '#0d1b2a', color: 'rgba(255,255,255,0.65)' },
              '& .MuiDataGrid-columnHeaderTitle':     { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.8 },
              '& .MuiDataGrid-columnSeparator':       { display: 'none' },
              '& .MuiDataGrid-cell':                  { borderColor: 'rgba(255,255,255,0.06)', color: '#fff' },
              '& .MuiDataGrid-row':                   { cursor: 'pointer' },
              '& .MuiDataGrid-row:hover':             { bgcolor: 'rgba(129,187,230,0.08)' },
              '& .MuiDataGrid-row.row-active':        { bgcolor: 'rgba(255,255,255,0.07)' },
              '& .MuiDataGrid-row.row-active:hover':  { bgcolor: 'rgba(129,187,230,0.1)' },
              '& .MuiDataGrid-filler':                { bgcolor: 'transparent' },
              '& .MuiDataGrid-scrollbarFiller':       { bgcolor: 'transparent' },
              '& .MuiDataGrid-footerContainer':       { borderColor: 'rgba(255,255,255,0.08)' },
              '& .MuiTablePagination-root':           { color: 'rgba(255,255,255,0.45)' },
              '& .MuiTablePagination-selectIcon':     { color: 'rgba(255,255,255,0.45)' },
              '& .MuiDataGrid-overlay':               { bgcolor: 'rgba(13,27,42,0.7)', color: 'rgba(255,255,255,0.45)' },
            }}
          />
        </Box>
      )}

      <ReportDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        report={selectedReport}
        loading={drawerLoading}
      />
    </Box>
  );
}
