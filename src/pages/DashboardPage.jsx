import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';
import ReportDrawer from '../components/ReportDrawer';
import { apiFetch } from '../utils/api';

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
  { field: 'month_year',        headerName: 'Period',        flex: 1, minWidth: 120 },
  { field: 'total_cost',        headerName: 'Total Cost',    flex: 1, minWidth: 130, valueFormatter: (v) => fmtCurrency(v) },
  { field: 'total_clicks',      headerName: 'Clicks',        flex: 1, minWidth: 100, valueFormatter: (v) => fmtNumber(v) },
  { field: 'total_impressions', headerName: 'Impressions',   flex: 1, minWidth: 130, valueFormatter: (v) => fmtNumber(v) },
  { field: 'total_ctr',         headerName: 'CTR',           flex: 1, minWidth: 90,  valueFormatter: (v) => fmtPercent(v) },
];

export default function DashboardPage() {
  const [filterText,     setFilterText]     = useState('');
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
      setReports(await res.json());
    } catch (err) {
      console.error('Fetch all error:', err);
      setError({ status: 0, message: 'Unable to reach the server. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRowClick(params) {
    const summary = reports[params.id];
    if (!summary) return;

    setSelectedRowId(params.id);
    setDrawerOpen(true);
    setSelectedReport(null);
    setDrawerLoading(true);
    try {
      const res = await apiFetch(`/api/reports?display_name=${encodeURIComponent(summary.display_name)}`);
      if (res.ok) setSelectedReport(await res.json());
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

  // Build flat rows for the DataGrid — use array index as id so that multiple
  // reports per client (different months share the same client_id) each get a unique row.
  const rows = reports.map((r, i) => ({
    id:                i,
    display_name:      r.display_name,
    month_year:        r.month_year,
    total_cost:        r.pages?.cover?.cards?.total_cost        ?? 0,
    total_clicks:      r.pages?.cover?.cards?.total_clicks      ?? 0,
    total_impressions: r.pages?.cover?.cards?.total_impressions ?? 0,
    total_ctr:         r.pages?.cover?.cards?.total_ctr         ?? 0,
  }));

  const filteredRows = filterText.trim()
    ? rows.filter((r) => r.display_name.toLowerCase().includes(filterText.toLowerCase()))
    : rows;

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
        </Box>
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
