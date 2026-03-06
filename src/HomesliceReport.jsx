import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Fab from '@mui/material/Fab';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { elementToPdfBlob, safePdfFilename, downloadBlob } from './utils/pdfUtils';
import { LineChart } from '@mui/x-charts/LineChart';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import reportBg from './assets/report-images/report-bg.png';
import digitalLogo from './assets/report-images/digital-logo.png';
import homesliceLogo from './assets/report-images/homeslicegroup (1).png';

// Figma asset URLs — valid for ~7 days from generation
// const ASSETS = {
//   bgMain:     'https://pub-633f8a68ce3b47509c3dc2e22ecfff28.r2.dev/4b61416a-5e88-4cc2-bd6f-c848ee76ce2b.png',
//   logo:       'https://www.figma.com/api/mcp/asset/aa7fb38c-0b35-4b90-9622-7d52968ec53f',
//   screenshot: 'https://www.figma.com/api/mcp/asset/5676c863-c126-4324-a818-6907fc66e2e6',
//   homeslice:  'https://www.figma.com/api/mcp/asset/df6679d5-8ad7-4af7-bed1-4403bbc8b25d',
//   icons: {
//     cost:        'https://www.figma.com/api/mcp/asset/f4cc193b-f759-4e12-9273-c657f31fb4b7',
//     clicks:      'https://www.figma.com/api/mcp/asset/77e9db22-28f6-42c8-afe6-edd21acfd7f1',
//     impressions: 'https://www.figma.com/api/mcp/asset/4908c8b2-0667-4d08-a154-db77dab4d674',
//     ctr:         'https://www.figma.com/api/mcp/asset/5fcc513c-ae46-4238-9773-0dc1c2e4627f',
//     cpc1: 'https://www.figma.com/api/mcp/asset/8c86aeb8-4b7e-4c9c-8ae5-0a85e58eec63',
//     cpm1: 'https://www.figma.com/api/mcp/asset/9e0ea44b-f008-42c1-8967-e96ef912f952',
//     cpc2: 'https://www.figma.com/api/mcp/asset/2b5dfb86-ab84-42ea-8899-0df53d267851',
//     cpm2: 'https://www.figma.com/api/mcp/asset/bd500f2e-fa7e-4129-9eed-16ef822e1eaa',
//     cpc3: 'https://www.figma.com/api/mcp/asset/1303c689-f740-417c-972c-e02f4ba4b3f5',
//     cpm3: 'https://www.figma.com/api/mcp/asset/5d32fa68-6967-4675-81b7-a84608316596',
//   },
// };

// In dev, route R2 assets through the Vite proxy (/r2-proxy → R2 bucket) so
// html2canvas can fetch them without hitting CORS restrictions.
// In production, use the direct R2 URL — you must add a CORS policy to the
// R2 bucket allowing your production domain (see README / Cloudflare dashboard).
const R2 = import.meta.env.DEV
  ? (path) => `/r2-proxy/${path}`
  : (path) => `https://pub-633f8a68ce3b47509c3dc2e22ecfff28.r2.dev/${path}`;

const ASSETS = {
  bgMain:     reportBg,
  logo:       'https://www.figma.com/api/mcp/asset/aa7fb38c-0b35-4b90-9622-7d52968ec53f',
  screenshot: digitalLogo,
  homeslice:  homesliceLogo,
  icons: {
    cost:        R2('icon-cost.svg'),
    clicks:      R2('icon-clicks.svg'),
    impressions: R2('icon-impressions.svg'),
    ctr:         R2('icon-ctr.svg'),
    cpc1:        R2('icon-cpc1.svg'),
    cpm1:        R2('icon-cpm1.svg'),
    cpc2:        R2('icon-cpc2.svg'),
    cpm2:        R2('icon-cpm2.svg'),
    cpc3:        R2('icon-cpc3.svg'),
    cpm3:        R2('icon-cpm3.svg'),
  },
};

const FONT = "'Futura PT', 'Trebuchet MS', Arial, sans-serif";

// ─── Formatters ────────────────────────────────────────────────────────────────
function fmtCurrency(v) {
  return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNumber(v) {
  return Number(v).toLocaleString('en-US');
}
function fmtPercent(v) {
  return `${Number(v).toFixed(2)}%`;
}

function buildMetrics(cards, cpcIcon, cpmIcon) {
  const { icons } = ASSETS;
  return {
    left: [
      { icon: icons.cost,        label: 'Total Cost',        value: fmtCurrency(cards.total_cost) },
      { icon: icons.clicks,      label: 'Total Clicks',      value: fmtNumber(cards.total_clicks) },
      { icon: icons.impressions, label: 'Total Impressions', value: fmtNumber(cards.total_impressions) },
    ],
    right: [
      { icon: cpcIcon,     label: 'Total CPC', value: fmtCurrency(cards.total_cpc) },
      { icon: cpmIcon,     label: 'Total CPM', value: fmtCurrency(cards.total_cpm) },
      { icon: icons.ctr,  label: 'Total CTR', value: fmtPercent(cards.total_ctr) },
    ],
  };
}

// ─── Metric row ───────────────────────────────────────────────────────────────
function MetricItem({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: { xs: 2, md: 3 } }}>
      <Box
        component="img"
        src={icon}
        alt=""
        crossOrigin="anonymous"
        sx={{
          width: { xs: 28, md: 40 },
          height: { xs: 28, md: 40 },
          objectFit: 'contain',
          flexShrink: 0,
          mt: 0.5,
        }}
      />
      <Box>
        <Typography
          sx={{
            fontFamily: FONT,
            fontWeight: 400,
            fontSize: { xs: '0.65rem', md: '0.8rem' },
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: 1,
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: { xs: '1.25rem', md: '2.1rem' },
            color: '#fff',
            textTransform: 'uppercase',
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Dual-axis line chart (clicks left, impressions right) ───────────────────
function DigitalLineChart({ chartData = [] }) {
  const dates = chartData.map((d) => {
    const [, m, day] = d.date.split('-');
    return `${parseInt(m)}/${parseInt(day)}`;
  });
  const clicks      = chartData.map((d) => d.clicks);
  const impressions = chartData.map((d) => d.impressions);

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <LineChart
        height={320}
        xAxis={[{ scaleType: 'point', data: dates, tickLabelstyle: { fill: '#fff', fontSize: 11 } }]}
        yAxis={[
          { id: 'clicks',      position: 'left',  tickLabelstyle: { fill: '#81bbe6', fontSize: 11 } },
          { id: 'impressions', position: 'right', tickLabelstyle: { fill: '#000000', fontSize: 11 } },
        ]}
        series={[
          { yAxisId: 'clicks',      data: clicks,      label: 'Clicks',      color: '#81bbe6', showMark: false },
          { yAxisId: 'impressions', data: impressions, label: 'Impressions', color: '#000000', showMark: false },
        ]}
        sx={{
          '& .MuiChartsAxis-line':        { stroke: '#ffffff44' },
          '& .MuiChartsAxis-tick':        { stroke: '#ffffff44' },
          '& .MuiChartsLegend-label':     { fill: '#fff' },
          '& .MuiChartsGrid-line':        { stroke: '#ffffff22' },
          bgcolor: 'transparent',
        }}
        grid={{ horizontal: true }}
        slotProps={{ legend: { labelStyle: { fill: '#fff' } } }}
      />
    </Box>
  );
}

// ─── Campaign data grid ───────────────────────────────────────────────────────
const CAMPAIGN_COLUMNS = [
  { field: 'campaign',    headerName: 'Campaign',     flex: 2, minWidth: 140 },
  { field: 'cost',        headerName: 'Cost',         flex: 1, minWidth: 90,  valueFormatter: (v) => fmtCurrency(v) },
  { field: 'clicks',      headerName: 'Clicks',       flex: 1, minWidth: 80,  valueFormatter: (v) => fmtNumber(v) },
  { field: 'impressions', headerName: 'Impressions',  flex: 1, minWidth: 110, valueFormatter: (v) => fmtNumber(v) },
  { field: 'conversions', headerName: 'Conv.',        flex: 1, minWidth: 70  },
  { field: 'cpc',         headerName: 'CPC',          flex: 1, minWidth: 80,  valueFormatter: (v) => fmtCurrency(v) },
  { field: 'cpm',         headerName: 'CPM',          flex: 1, minWidth: 80,  valueFormatter: (v) => fmtCurrency(v) },
  { field: 'ctr',         headerName: 'CTR',          flex: 1, minWidth: 80,  valueFormatter: (v) => fmtPercent(v) },
];

function CampaignTable({ rows = [] }) {
  if (!rows.length) return null;
  const tableRows = rows.map((r, i) => ({ id: i, ...r }));
  return (
    <Box sx={{ mb: 2 }}>
      <DataGrid
        rows={tableRows}
        columns={CAMPAIGN_COLUMNS}
        hideFooter
        disableColumnMenu
        disableRowSelectionOnClick
        sx={{
          border: 'none',
          color: '#fff',
          '& .MuiDataGrid-columnHeader':          { bgcolor: 'rgba(0,0,0,0.25)', color: '#fff' },
          '& .MuiDataGrid-columnSeparator':       { display: 'none' },
          '& .MuiDataGrid-cell':                  { borderColor: 'rgba(255,255,255,0.12)', color: '#fff' },
          '& .MuiDataGrid-row:hover':             { bgcolor: 'rgba(255,255,255,0.08)' },
          '& .MuiDataGrid-filler':                { bgcolor: 'transparent' },
          '& .MuiDataGrid-scrollbarFiller':       { bgcolor: 'transparent' },
          '& .MuiDataGrid-columnHeaderTitle':     { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.8 },
          bgcolor: 'rgba(0,0,0,0.15)',
          borderRadius: 2,
        }}
      />
    </Box>
  );
}

// ─── Row of ad preview cards with lightbox ───────────────────────────────────
function ImageCardRow({ ads = [], height = 200 }) {
  const [lightbox, setLightbox] = useState(null); // { src, alt }
  const withImages = ads.filter((ad) => ad.image_url != null);
  if (!withImages.length) return null;

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.5, md: 2 }, mb: 2 }}>
        {withImages.map((ad, i) => (
          <Box
            key={i}
            onClick={() => setLightbox({ src: ad.image_url, alt: ad.campaign_name || '' })}
            sx={{
              flex: '0 0 auto',
              width: { xs: 'calc(50% - 6px)', sm: 'calc(25% - 6px)' },
              bgcolor: '#d9d9d9',
              borderRadius: { xs: 3, md: 4 },
              height,
              position: 'relative',
              overflow: 'hidden',
              cursor: 'zoom-in',
              '&:hover': { opacity: 0.85 },
              transition: 'opacity 0.15s',
            }}
          >
            <Box
              component="img"
              src={ad.image_url}
              alt={ad.campaign_name || ''}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        ))}
      </Box>

      <Dialog
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        maxWidth="xl"
        slotProps={{
          paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', position: 'relative' } },
          backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.88)' } },
        }}
      >
        <IconButton
          onClick={() => setLightbox(null)}
          sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        {lightbox && (
          <Box
            component="img"
            src={lightbox.src}
            alt={lightbox.alt}
            sx={{ maxHeight: '90vh', maxWidth: '90vw', display: 'block', borderRadius: 2 }}
          />
        )}
      </Dialog>
    </>
  );
}

// ─── Rotated sidebar label — desktop only ────────────────────────────────────
function SectionLabel({ name, side }) {
  return (
    <Box
      sx={{
        width: '17%',
        flexShrink: 0,
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        py: 4,
        pl: side === 'right' ? 0 : 1,
        pr: side === 'right' ? 1 : 0,
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: {
            md: name.length > 6 ? '5.5rem' : '8rem',
            lg: name.length > 6 ? '7rem'   : '11rem',
          },
          color: '#fff',
          textTransform: 'uppercase',
          transform: 'rotate(-90deg)',
          whiteSpace: 'nowrap',
          letterSpacing: { md: -3, lg: -5 },
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {name}
      </Typography>
    </Box>
  );
}

// ─── Channel section card ─────────────────────────────────────────────────────
function ChannelSection({ name, bgcolor, labelSide = 'right', metrics, charts }) {
  const isLabelLeft = labelSide === 'left';
  const label = <SectionLabel name={name} side={labelSide} />;

  const content = (
    <Box sx={{ flex: 1, p: { xs: 2.5, md: 5 }, minWidth: 0 }}>
      <Typography
        sx={{
          display: { xs: 'block', md: 'none' },
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: '2rem',
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: -1,
          lineHeight: 1,
          mb: 2.5,
        }}
      >
        {name}
      </Typography>

      <Grid container spacing={{ xs: 1.5, md: 4 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid size={{ xs: 6 }}>
          {metrics.left.map((m) => <MetricItem key={m.label} {...m} />)}
        </Grid>
        <Grid size={{ xs: 6 }}>
          {metrics.right.map((m) => <MetricItem key={m.label} {...m} />)}
        </Grid>
      </Grid>

      {charts}
    </Box>
  );

  return (
    <Box
      data-report-section
      sx={{
        bgcolor,
        borderRadius: 5,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        mb: 2,
        ml: isLabelLeft ? { xs: 0, md: '-30px' } : { xs: 0, md: '30px' },
        mr: isLabelLeft ? { xs: 0, md: '30px' } : { xs: 0, md: '-30px' },
        minHeight: { xs: 'unset', md: 580 },
        '@media print': {
          overflow: 'visible',
          breakInside: 'avoid',
        },
      }}
    >
      {isLabelLeft ? <>{label}{content}</> : <>{content}{label}</>}
    </Box>
  );
}

// ─── Root report ──────────────────────────────────────────────────────────────
export default function HomesliceReport({ data, hideFab = false }) {
  const { icons } = ASSETS;

  if (!data) return null;

  const pages = data.pages;
  const coverPage   = pages['cover'];
  const socialPage  = pages['social'];
  const displayPage = pages['display'];
  const searchPage  = pages['search'];
  const websitePage = pages['website'];

  const sections = [
    coverPage && {
      name: 'Digital',
      bgcolor: '#1c5784',
      labelSide: 'right',
      metrics: buildMetrics(coverPage.cards, icons.cpc1, icons.cpm1),
      charts: <DigitalLineChart chartData={coverPage.chart_data || []} />,
    },
    socialPage && {
      name: 'Social',
      bgcolor: '#aedfe6',
      labelSide: 'left',
      metrics: buildMetrics(socialPage.cards, icons.cpc2, icons.cpm2),
      charts: (
        <>
          <CampaignTable rows={socialPage.campaign_table || []} />
          <ImageCardRow ads={socialPage.ad_media || []} height={195} />
        </>
      ),
    },
    displayPage && {
      name: 'Display',
      bgcolor: '#161f29',
      labelSide: 'right',
      metrics: buildMetrics(displayPage.cards, icons.cpc2, icons.cpm2),
      charts: (
        <>
          <CampaignTable rows={displayPage.campaign_table || []} />
          <ImageCardRow ads={displayPage.ad_media || []} height={195} />
        </>
      ),
    },
    searchPage && {
      name: 'Search',
      bgcolor: '#333535',
      labelSide: 'left',
      metrics: buildMetrics(searchPage.cards, icons.cpc3, icons.cpm3),
      charts: <CampaignTable rows={searchPage.campaign_table || []} />,
    },
    websitePage && {
      name: 'RC Post',
      bgcolor: '#81bbe6',
      labelSide: 'right',
      metrics: buildMetrics(websitePage.cards, icons.cpc3, icons.cpm3),
      charts: (
        <>
          <CampaignTable rows={websitePage.campaign_table || []} />
          <ImageCardRow ads={websitePage.ad_media || []} height={160} />
        </>
      ),
    },
  ].filter(Boolean);

  const reportId = `homesight-report-${data.client_id}`;
  const [saving, setSaving] = useState(false);

  async function handleSavePdf() {
    if (saving) return;
    setSaving(true);
    try {
      const el = document.getElementById(reportId);
      const blob = await elementToPdfBlob(el);
      downloadBlob(blob, safePdfFilename(data.display_name));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box
      id={reportId}
      sx={{
        bgcolor: '#0d1b2a',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        '@media print': { overflow: 'visible' },
      }}
    >
      {/* Decorative background image */}
      <Box
        component="img"
        src={ASSETS.bgMain}
        alt=""
        crossOrigin="anonymous"
        sx={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          minWidth: 1920,
          width: '100%',
          height: 'auto',
          pointerEvents: 'none',
          objectFit: 'cover',
          opacity: 0.55,
          zIndex: 0,
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>

        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <Box
          data-report-section
          sx={{
            textAlign: 'center',
            pt: { xs: 4, md: 7 },
            pb: { xs: 5, md: 8 },
            px: { xs: 2, md: 4 },
            position: 'relative',
          }}
        >
          <Box
            sx={{
              top: { xs: 12, md: 40 },
              right: { xs: 12, md: 80 },
              display: 'flex',
              gap: { xs: 1, md: 2 },
              alignItems: 'center',
            }}
          >
            <Box
              component="img"
              src={ASSETS.homeslice}
              alt="Homeslice"
              crossOrigin="anonymous"
              sx={{ height: '100px', width: '100px', display: 'block' }}
            />
            <Box
              component="img"
              src={ASSETS.screenshot}
              alt=""
              crossOrigin="anonymous"
              sx={{ height: { xs: 44, md: 70 }, width: 'auto', display: 'block' }}
            />
          </Box>

          <Typography
            sx={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: { xs: '1.7rem', sm: '2.8rem', md: '4.2rem', lg: '6.25rem' },
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: { xs: 1, md: 4 },
              lineHeight: 1,
            }}
          >
            Digital Marketing Summary
          </Typography>

          <Typography
            sx={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: { xs: '0.7rem', sm: '1rem', md: '1.5rem', lg: '2rem' },
              color: '#fff',
              textTransform: 'uppercase',
              mt: 0.5,
              mb: { xs: 3, md: 5 },
            }}
          >
            {(() => {
              const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
              return data.date_start && data.date_end
                ? `${fmt(data.date_start)} – ${fmt(data.date_end)}`
                : fmt(data.date_start) || fmt(data.date_end) || '';
            })()}
          </Typography>

          <Box
            component="img"
            src={data.pages?.cover?.logo_url ?? ASSETS.homeslice}
            alt={data.display_name}
            crossOrigin="anonymous"
            sx={{
              display: 'block',
              mx: 'auto',
              width: { xs: 160, sm: 240, md: 360, lg: 460 },
              height: 'auto',
              mb: { xs: 2, md: 3 },
            }}
          />

          <Typography
            sx={{
              fontFamily: FONT,
              fontWeight: 400,
              fontSize: { xs: '0.85rem', sm: '1.3rem', md: '2rem', lg: '3.125rem' },
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: { xs: 3, md: 8 },
            }}
          >
            {data.display_name}
          </Typography>
        </Box>

        {/* ── CHANNEL SECTIONS ─────────────────────────────────────────── */}
        <Box
          sx={{
            px: { xs: 1, md: 4 },
            pb: 8,
          }}
        >
          {sections.map((section) => (
            <ChannelSection key={section.name} {...section} />
          ))}
        </Box>
      </Box>

      {/* ── SAVE AS PDF ─────────────────────────────────────────────────── */}
      {!hideFab && (
        <Fab
          color="primary"
          title={saving ? 'Generating PDF…' : 'Save as PDF'}
          onClick={handleSavePdf}
          disabled={saving}
          sx={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            '@media print': { display: 'none' },
          }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon />}
        </Fab>
      )}

    </Box>
  );
}
