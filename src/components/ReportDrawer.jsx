import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import HomesliceReport from '../HomesliceReport';
import { elementToPdfBlob, safePdfFilename, downloadBlob } from '../utils/pdfUtils';

/**
 * Reusable right-side drawer that renders a HomesliceReport.
 *
 * Props:
 *   open    — boolean
 *   onClose — () => void
 *   report  — report data object passed to HomesliceReport (null = nothing shown)
 *   title   — optional header label; falls back to report.display_name
 *   loading — shows spinner instead of report while true (e.g. while fetching)
 */
export default function ReportDrawer({ open, onClose, report, title, loading = false }) {
  const [pdfSaving, setPdfSaving] = useState(false);

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

  const displayTitle = title ?? report?.display_name ?? '';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
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
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.25,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          bgcolor: '#111d2b',
          flexShrink: 0,
        }}
      >
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 600 }}>
          {displayTitle}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={pdfSaving ? <CircularProgress size={13} color="inherit" /> : <PictureAsPdfIcon fontSize="small" />}
            onClick={handleSavePdf}
            disabled={pdfSaving || loading || !report}
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
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress sx={{ color: '#81bbe6' }} />
          </Box>
        ) : (
          report && <HomesliceReport data={report} hideFab />
        )}
      </Box>
    </Drawer>
  );
}
