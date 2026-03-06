import { useState, useEffect, useRef, useCallback } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';
import HomesliceReport from '../HomesliceReport';
import ReportDrawer from '../components/ReportDrawer';
import { elementToPdfBlob, safePdfFilename, downloadBlob } from '../utils/pdfUtils';
import { apiFetch } from '../utils/api';

const COLUMNS = [
  { field: 'name',       headerName: 'Report Name', flex: 2, minWidth: 200 },
  { field: 'status',     headerName: 'Status',      flex: 1, minWidth: 120 },
  { field: 'created_at', headerName: 'Created',     flex: 1, minWidth: 160,
    valueFormatter: (value) => value ? new Date(value).toLocaleString() : '' },
];

const CAMPAIGN_COLUMNS = [
  { field: 'Campaing Name', headerName: 'Campaign Name', flex: 2, minWidth: 200 },
  { field: 'Channel',       headerName: 'Channel',       flex: 1, minWidth: 120 },
  { field: 'WO#',           headerName: 'WO #',          flex: 1, minWidth: 90  },
  { field: 'status',        headerName: 'Status',        flex: 1, minWidth: 80  },
  { field: 'campaign_start', headerName: 'Start Date',   flex: 1, minWidth: 130,
    valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : '' },
  { field: 'campaign_end',   headerName: 'End Date',     flex: 1, minWidth: 130,
    valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : '' },
  { field: 'gross',          headerName: 'Gross',        flex: 1, minWidth: 110,
    valueFormatter: (value) => value != null ? `$${Number(value).toFixed(2)}` : '' },
];

// Shared dark input styles
const darkInputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    bgcolor: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
    '&:hover fieldset': { borderColor: '#81bbe6' },
    '&.Mui-focused fieldset': { borderColor: '#81bbe6' },
  },
  '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#81bbe6' },
  // native date input color
  '& input[type="date"]': { colorScheme: 'dark' },
};

export default function CustomReportsPage() {
  // Page-level state
  const [filterText,     setFilterText]     = useState('');
  const [customReports,  setCustomReports]  = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form state
  const [inputValue,      setInputValue]      = useState('');
  const [options,         setOptions]         = useState([]);
  const [optLoading,      setOptLoading]      = useState(false);
  const [selectedName,    setSelectedName]    = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [startMonth,      setStartMonth]      = useState('');
  const [endMonth,        setEndMonth]        = useState('');

  // Campaign selection state
  const [campaigns,           setCampaigns]           = useState([]);
  const [campaignLoading,     setCampaignLoading]     = useState(false);
  const [campaignError,       setCampaignError]       = useState(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);

  // Create-drawer report state
  const [reportId,          setReportId]          = useState(null);
  const [report,            setReport]            = useState(null);
  const [reportDrawerOpen,  setReportDrawerOpen]  = useState(false);
  const [fetchLoading,      setFetchLoading]      = useState(false);
  const [error,             setError]             = useState(null);
  const [pdfSaving,         setPdfSaving]         = useState(false);
  const [saveLoading,       setSaveLoading]       = useState(false);
  const [reportNameInput,   setReportNameInput]   = useState('');
  const [saveError,         setSaveError]         = useState(null);

  // View-drawer state (clicking a saved row)
  const [viewDrawerOpen,    setViewDrawerOpen]    = useState(false);
  const [viewReport,        setViewReport]        = useState(null);
  const [viewDrawerLoading, setViewDrawerLoading] = useState(false);
  const [viewReportTitle,   setViewReportTitle]   = useState('');
  const [selectedRowId,     setSelectedRowId]     = useState(null);

  const debounceRef = useRef(null);

  // ── Load saved custom reports on mount ────────────────────────────────────
  useEffect(() => { fetchSavedReports(); }, []);

  async function fetchSavedReports() {
    setReportsLoading(true);
    try {
      const res = await apiFetch('/api/custom-report');
      if (res.ok) {
        const data = await res.json();
        setCustomReports(data.map((r, i) => ({ ...r, id: r.report_id ?? r.id ?? i })));
      }
    } catch (err) {
      console.error('Fetch saved reports error:', err);
    } finally {
      setReportsLoading(false);
    }
  }

  // ── Autocomplete debounce ──────────────────────────────────────────────────
  const handleInputChange = useCallback((_, value) => {
    setInputValue(value);
    setSelectedClientId(null);
    clearTimeout(debounceRef.current);
    if (!value.trim()) { setOptions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setOptLoading(true);
      try {
        const res = await apiFetch(`/api/clients?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setOptions(data); // full objects { display_name, client_id, ... }
        }
      } catch { /* ignore */ } finally {
        setOptLoading(false);
      }
    }, 300);
  }, []);

  // ── Find campaigns ─────────────────────────────────────────────────────────
  async function handleFindCampaigns() {
    if (!selectedClientId) return;
    setCampaignLoading(true);
    setCampaignError(null);
    setCampaigns([]);
    setSelectedCampaignIds([]);
    setReport(null);
    try {
      const params = new URLSearchParams({ client_id: selectedClientId });
      if (startMonth) params.set('date_start', startMonth);
      if (endMonth)   params.set('date_end',   endMonth);
      const res = await apiFetch(`/api/custom-report?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCampaignError(body.detail || body.message || `Error ${res.status}`);
        return;
      }
      const data = await res.json();
      setCampaigns(data.map((c, i) => ({ ...c, id: c.campaign_id ?? i })));
    } catch (err) {
      console.error('Campaign fetch error:', err);
      setCampaignError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setCampaignLoading(false);
    }
  }

  // ── Generate report ────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (selectedCampaignIds.length === 0) return;
    setFetchLoading(true);
    setError(null);
    setReport(null);
    try {
      const params = new URLSearchParams();
      if (startMonth) params.set('date_start', startMonth);
      if (endMonth)         params.set('date_end',   endMonth);
      if (reportId)         params.set('report_id',  reportId);
      selectedCampaignIds.forEach((id) => params.append('campaign_id', id));
      const res = await apiFetch(`/api/custom-report?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || body.message || `Error ${res.status}`);
        return;
      }
      const data = await res.json();
      setReport(data);
      setReportDrawerOpen(true);
    } catch (err) {
      console.error('Report fetch error:', err);
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setFetchLoading(false);
    }
  }

  function handleCloseReportDrawer() {
    setReportDrawerOpen(false);
    setReport(null);
    setReportNameInput('');
    setSaveError(null);
  }

  // ── Save as PDF ────────────────────────────────────────────────────────────
  async function handleSavePdf() {
    if (!report || pdfSaving) return;
    setPdfSaving(true);
    try {
      const el = document.getElementById(`homesight-report-${report.client_id}`);
      if (!el) return;
      const blob = await elementToPdfBlob(el);
      downloadBlob(blob, safePdfFilename(report.display_name));
    } finally {
      setPdfSaving(false);
    }
  }

  // ── Save custom report to backend ─────────────────────────────────────────
  async function handleSaveReport() {
    if (!report || saveLoading) return;
    setSaveError(null);
    const customName = reportNameInput.trim();
    const fallbackName = selectedName || inputValue.trim();
    const dateLabel = startMonth && endMonth
      ? `${startMonth} – ${endMonth}`
      : startMonth || endMonth || '';
    const reportName = customName || [fallbackName, dateLabel].filter(Boolean).join(' · ');

    setSaveLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('report_name', reportName);
      if (startMonth) params.set('date_start', startMonth);
      if (endMonth)   params.set('date_end',   endMonth);
      selectedCampaignIds.forEach((id) => params.append('campaign_id', id));
      const res = await apiFetch(`/api/save-custom-report?${params}`, { method: 'POST' });
      if (res.ok) {
        handleCloseReportDrawer();
        fetchSavedReports();
      } else {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.detail || body.message || `Error ${res.status}`);
      }
    } catch (err) {
      console.error('Save report error:', err);
      setSaveError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setSaveLoading(false);
    }
  }

  // ── View saved report ─────────────────────────────────────────────────────
  async function handleRowClick(params) {
    const row = customReports.find((r) => r.id === params.id);
    if (!row) return;
    setSelectedRowId(params.id);
    setViewDrawerOpen(true);
    setViewReport(null);
    setViewReportTitle(row.name ?? '');
    setViewDrawerLoading(true);
    try {
      const res = await apiFetch(`/api/custom-report?report_id=${row.id}`);
      if (res.ok) setViewReport(await res.json());
    } catch (err) {
      console.error('View report error:', err);
    } finally {
      setViewDrawerLoading(false);
    }
  }

  function handleCloseViewDrawer() {
    setViewDrawerOpen(false);
    setSelectedRowId(null);
  }

  // ── Drawer open/close ──────────────────────────────────────────────────────
  function handleOpenDrawer() {
    setDrawerOpen(true);
    setReportId(null);
    setReport(null);
    setReportDrawerOpen(false);
    setError(null);
    setInputValue('');
    setSelectedName(null);
    setSelectedClientId(null);
    setOptions([]);
    setStartMonth('');
    setEndMonth('');
    setCampaigns([]);
    setCampaignLoading(false);
    setCampaignError(null);
    setSelectedCampaignIds([]);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setReportDrawerOpen(false);
    setReport(null);
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredReports = filterText.trim()
    ? customReports.filter((r) =>
        r.report_name?.toLowerCase().includes(filterText.toLowerCase())
      )
    : customReports;

  const canFindCampaigns = !campaignLoading && !!selectedClientId;
  const canGenerate      = !fetchLoading && selectedCampaignIds.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* ── Page toolbar ── */}
      <Box className="print-hide" sx={{ px: 3, pt: 3, pb: 3, flexShrink: 0 }}>
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
          <TextField
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search custom reports…"
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
              ...darkInputSx,
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            onClick={handleOpenDrawer}
            sx={{
              whiteSpace: 'nowrap',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              px: 1.5,
              borderColor: 'rgba(129,187,230,0.4)',
              color: '#81bbe6',
              '&:hover': { borderColor: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
            }}
          >
            Create Custom Report
          </Button>
        </Box>
      </Box>

      {/* ── DataGrid ── */}
      <Box sx={{ flex: 1, minHeight: 0, mx: { xs: 1, md: 3 }, pb: 2 }}>
        <DataGrid
          rows={filteredReports}
          columns={COLUMNS}
          loading={reportsLoading}
          disableColumnMenu
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          getRowClassName={(params) => params.id === selectedRowId ? 'row-active' : ''}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          sx={{
            height: '100%',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
            color: '#fff',
            bgcolor: '#111d2b',
            '& .MuiDataGrid-columnHeader':      { bgcolor: '#0d1b2a', color: 'rgba(255,255,255,0.65)' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.8 },
            '& .MuiDataGrid-columnSeparator':   { display: 'none' },
            '& .MuiDataGrid-cell':              { borderColor: 'rgba(255,255,255,0.06)', color: '#fff' },
            '& .MuiDataGrid-filler':            { bgcolor: 'transparent' },
            '& .MuiDataGrid-scrollbarFiller':   { bgcolor: 'transparent' },
            '& .MuiDataGrid-footerContainer':   { borderColor: 'rgba(255,255,255,0.08)' },
            '& .MuiTablePagination-root':       { color: 'rgba(255,255,255,0.45)' },
            '& .MuiTablePagination-selectIcon': { color: 'rgba(255,255,255,0.45)' },
            '& .MuiDataGrid-overlay':           { bgcolor: 'rgba(13,27,42,0.7)', color: 'rgba(255,255,255,0.45)' },
            '& .MuiDataGrid-row':                   { cursor: 'pointer' },
            '& .MuiDataGrid-row:hover':             { bgcolor: 'rgba(129,187,230,0.08)' },
            '& .MuiDataGrid-row.row-active':        { bgcolor: 'rgba(255,255,255,0.07)' },
            '& .MuiDataGrid-row.row-active:hover':  { bgcolor: 'rgba(129,187,230,0.1)' },
          }}
        />
      </Box>

      <ReportDrawer
        open={viewDrawerOpen}
        onClose={handleCloseViewDrawer}
        report={viewReport}
        title={viewReportTitle}
        loading={viewDrawerLoading}
      />

      {/* ── Create Custom Report drawer ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100vw', md: '80vw', lg: '70vw' },
              maxWidth: 1200,
              bgcolor: '#0d1b2a',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* ── Drawer action bar ── */}
        <Box
          sx={{
            bgcolor: '#111d2b',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            px: 2,
            py: 1,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Custom Report
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <IconButton onClick={handleCloseDrawer} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* ── Drawer form panel ── */}
        <Box
          sx={{
            bgcolor: '#111d2b',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            px: 3,
            py: 2.5,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          {/* Row 1: Client name */}
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.75 }}>
              Client Name
            </Typography>
            <Autocomplete
              freeSolo
              options={options}
              getOptionLabel={(opt) => typeof opt === 'string' ? opt : (opt.display_name ?? '')}
              loading={optLoading}
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onChange={(_, value) => {
                if (typeof value === 'string') {
                  setSelectedName(value);
                  setSelectedClientId(null);
                } else {
                  setSelectedName(value?.display_name ?? null);
                  setSelectedClientId(value?.client_id ?? null);
                }
                setCampaigns([]);
                setSelectedCampaignIds([]);
              }}
              sx={{ maxWidth: 420 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search client name…"
                  size="small"
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {optLoading && <CircularProgress size={14} color="inherit" />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                  sx={{
                    ...darkInputSx,
                    '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.3)' },
                    '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.3)' },
                  }}
                />
              )}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: '#111d2b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    '& .MuiAutocomplete-option': {
                      '&:hover':                { bgcolor: 'rgba(129,187,230,0.08)' },
                      '&[aria-selected="true"]': { bgcolor: 'rgba(129,187,230,0.15)' },
                    },
                  },
                },
              }}
            />
          </Box>

          {/* Row 2: Date range + Find Campaigns */}
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.75 }}>
              Date Range
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                type="date"
                size="small"
                label="Start date"
                value={startMonth}
                onChange={(e) => { setStartMonth(e.target.value); setCampaigns([]); setSelectedCampaignIds([]); }}
                inputProps={{ max: endMonth || undefined }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ ...darkInputSx, width: 180 }}
              />
              <Typography sx={{ color: 'rgba(255,255,255,0.2)', userSelect: 'none' }}>—</Typography>
              <TextField
                type="date"
                size="small"
                label="End date"
                value={endMonth}
                onChange={(e) => { setEndMonth(e.target.value); setCampaigns([]); setSelectedCampaignIds([]); }}
                inputProps={{ min: startMonth || undefined }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ ...darkInputSx, width: 180 }}
              />
              <Tooltip title={!selectedClientId ? 'Select a client from the dropdown first' : ''} placement="top" arrow>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={campaignLoading ? <CircularProgress size={13} color="inherit" /> : <SearchIcon fontSize="small" />}
                    onClick={handleFindCampaigns}
                    disabled={!canFindCampaigns}
                    sx={{
                      whiteSpace: 'nowrap',
                      textTransform: 'none',
                      borderColor: 'rgba(129,187,230,0.4)',
                      color: '#81bbe6',
                      fontWeight: 600,
                      px: 2,
                      '&:hover': { borderColor: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
                      '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    {campaignLoading ? 'Finding…' : 'Find Campaigns'}
                  </Button>
                </span>
              </Tooltip>
              {campaignError && (
                <Typography sx={{ color: '#f87171', fontSize: '0.8rem', flexBasis: '100%' }}>
                  {campaignError}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Row 3: Campaign selection DataGrid (shown once campaigns are loaded) */}
          {(campaignLoading || campaigns.length > 0) && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Select Campaigns
                </Typography>
                {selectedCampaignIds.length > 0 && (
                  <Typography sx={{ color: '#81bbe6', fontSize: '0.75rem' }}>
                    {selectedCampaignIds.length} selected
                  </Typography>
                )}
              </Box>
              <Box sx={{ height: 280 }}>
                <DataGrid
                  rows={campaigns}
                  columns={CAMPAIGN_COLUMNS}
                  loading={campaignLoading}
                  checkboxSelection
                  disableColumnMenu
                  disableRowSelectionOnClick={false}
                  onRowSelectionModelChange={(model) => setSelectedCampaignIds([...(model.ids ?? model)])}
                  hideFooter={campaigns.length <= 25}
                  sx={{
                    height: '100%',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 2,
                    color: '#fff',
                    bgcolor: '#0d1b2a',
                    '& .MuiDataGrid-columnHeader':      { bgcolor: '#111d2b', color: 'rgba(255,255,255,0.65)' },
                    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.8 },
                    '& .MuiDataGrid-columnSeparator':   { display: 'none' },
                    '& .MuiDataGrid-cell':              { borderColor: 'rgba(255,255,255,0.06)', color: '#fff' },
                    '& .MuiDataGrid-row:hover':         { bgcolor: 'rgba(129,187,230,0.08)' },
                    '& .MuiDataGrid-filler':            { bgcolor: 'transparent' },
                    '& .MuiDataGrid-scrollbarFiller':   { bgcolor: 'transparent' },
                    '& .MuiDataGrid-overlay':           { bgcolor: 'rgba(13,27,42,0.7)', color: 'rgba(255,255,255,0.45)' },
                    '& .MuiCheckbox-root':                     { color: 'rgba(255,255,255,0.3)' },
                    '& .MuiCheckbox-root.Mui-checked':         { color: '#81bbe6' },
                    '& .MuiDataGrid-row.Mui-selected':         { bgcolor: 'rgba(255,255,255,0.07)' },
                    '& .MuiDataGrid-row.Mui-selected:hover':   { bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Row 4: Generate Report (shown once campaigns are loaded) */}
          {campaigns.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={fetchLoading ? <CircularProgress size={13} color="inherit" /> : <SearchIcon fontSize="small" />}
                onClick={handleGenerate}
                disabled={!canGenerate}
                sx={{
                  textTransform: 'none',
                  bgcolor: '#81bbe6',
                  color: '#0d1b2a',
                  fontWeight: 700,
                  px: 2.5,
                  '&:hover': { bgcolor: '#a3cff0' },
                  '&.Mui-disabled': { bgcolor: 'rgba(129,187,230,0.2)', color: 'rgba(255,255,255,0.3)' },
                }}
              >
                {fetchLoading ? 'Generating…' : 'Generate Report'}
              </Button>
              {error && (
                <Typography sx={{ color: '#f87171', fontSize: '0.82rem' }}>
                  {error}
                </Typography>
              )}
            </Box>
          )}
        </Box>

      </Drawer>

      {/* ── Report sub-drawer ── */}
      <Drawer
        anchor="right"
        open={reportDrawerOpen}
        onClose={handleCloseReportDrawer}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100vw', md: '80vw', lg: '70vw' },
              maxWidth: 1200,
              bgcolor: '#0d1b2a',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* Sub-drawer action bar */}
        <Box
          sx={{
            bgcolor: '#111d2b',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            px: 2,
            py: 1,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Generated Report
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <TextField
            value={reportNameInput}
            onChange={(e) => setReportNameInput(e.target.value)}
            placeholder="Report name (optional)"
            size="small"
            sx={{
              width: 220,
              ...darkInputSx,
              '& .MuiOutlinedInput-root': {
                ...darkInputSx['& .MuiOutlinedInput-root'],
                fontSize: '0.8rem',
              },
            }}
          />

          <Button
            variant="outlined"
            size="small"
            startIcon={saveLoading ? <CircularProgress size={13} color="inherit" /> : <BookmarkAddIcon fontSize="small" />}
            onClick={handleSaveReport}
            disabled={!report || saveLoading}
            sx={{
              whiteSpace: 'nowrap',
              textTransform: 'none',
              borderColor: 'rgba(129,187,230,0.4)',
              color: '#81bbe6',
              fontSize: '0.78rem',
              px: 1.5,
              '&:hover': { borderColor: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
              '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' },
            }}
          >
            {saveLoading ? 'Saving…' : 'Save Custom Report'}
          </Button>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

          <Button
            variant="outlined"
            size="small"
            startIcon={pdfSaving ? <CircularProgress size={13} color="inherit" /> : <PictureAsPdfIcon fontSize="small" />}
            onClick={handleSavePdf}
            disabled={pdfSaving || !report}
            sx={{
              whiteSpace: 'nowrap',
              borderColor: 'rgba(129,187,230,0.4)',
              color: '#81bbe6',
              fontSize: '0.78rem',
              px: 1.5,
              '&:hover': { borderColor: '#81bbe6', bgcolor: 'rgba(129,187,230,0.08)' },
              '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' },
            }}
          >
            {pdfSaving ? 'Generating…' : 'Save as PDF'}
          </Button>

          <IconButton onClick={handleCloseReportDrawer} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Save error banner */}
        {saveError && (
          <Box sx={{ bgcolor: 'rgba(248,113,113,0.1)', borderBottom: '1px solid rgba(248,113,113,0.25)', px: 3, py: 1 }}>
            <Typography sx={{ color: '#f87171', fontSize: '0.82rem' }}>{saveError}</Typography>
          </Box>
        )}

        {/* Sub-drawer report content */}
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {report && <HomesliceReport data={report} hideFab />}
        </Box>
      </Drawer>
    </Box>
  );
}
