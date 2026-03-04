import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;
const DRAWER_MINI  = 64;

function NavItem({ label, icon, active, onClick, expanded }) {
  const button = (
    <ListItemButton
      onClick={onClick}
      sx={{
        mx: 1,
        my: 0.5,
        borderRadius: 2,
        justifyContent: expanded ? 'initial' : 'center',
        px: expanded ? 2 : 1.5,
        minHeight: 44,
        color: active ? '#81bbe6' : 'rgba(255,255,255,0.7)',
        bgcolor: active ? 'rgba(129,187,230,0.15)' : 'transparent',
        '&:hover': {
          bgcolor: active ? 'rgba(129,187,230,0.2)' : 'rgba(255,255,255,0.08)',
        },
      }}
    >
      <ListItemIcon
        sx={{ color: 'inherit', minWidth: expanded ? 40 : 'auto', justifyContent: 'center' }}
      >
        {icon}
      </ListItemIcon>
      {expanded && (
        <ListItemText
          primary={label}
          slotProps={{
            primary: { sx: { fontWeight: active ? 600 : 400, fontSize: '0.9rem' } },
          }}
        />
      )}
    </ListItemButton>
  );

  return (
    <ListItem disablePadding sx={{ display: 'block' }}>
      {expanded ? button : (
        <Tooltip title={label} placement="right" arrow>
          {button}
        </Tooltip>
      )}
    </ListItem>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);
  const drawerWidth = open ? DRAWER_WIDTH : DRAWER_MINI;

  const navigate                    = useNavigate();
  const { pathname }                = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const activePage = pathname.startsWith('/profile') ? 'profile' : 'dashboard';

  function handleLoginToggle() {
    if (isAuthenticated) {
      logout();
      navigate('/login');
    } else {
      navigate('/login');
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0d1b2a' }}>
      {/* ── AppBar ── shifts width/margin with the drawer */}
      <AppBar
        className="print-hide"
        position="fixed"
        elevation={0}
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          bgcolor: '#111d2b',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: open
                ? theme.transitions.duration.enteringScreen
                : theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar>
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {activePage === 'dashboard' ? 'Dashboard' : 'Profile'}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* ── Persistent Drawer ── collapses to icon-only mini rail */}
      <Drawer
        className="print-hide"
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            overflowX: 'hidden',
            boxSizing: 'border-box',
            bgcolor: '#111d2b',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: open
                  ? theme.transitions.duration.enteringScreen
                  : theme.transitions.duration.leavingScreen,
              }),
          },
        }}
      >
        {/* Brand row + hamburger toggle */}
        <Toolbar
          sx={{
            px: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'space-between' : 'center',
          }}
        >
          {open && (
            <Typography
              sx={{
                color: '#81bbe6',
                fontWeight: 900,
                fontSize: '1.15rem',
                letterSpacing: 3,
                textTransform: 'uppercase',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              HomeSight
            </Typography>
          )}
          <IconButton
            onClick={() => setOpen((prev) => !prev)}
            sx={{ color: 'rgba(255,255,255,0.6)', p: 1 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </Toolbar>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <List sx={{ flexGrow: 1, pt: 1 }}>
            <NavItem
              label="Dashboard"
              icon={<DashboardIcon />}
              active={activePage === 'dashboard'}
              onClick={() => navigate('/')}
              expanded={open}
            />
            <NavItem
              label="Profile"
              icon={<PersonIcon />}
              active={activePage === 'profile'}
              onClick={() => navigate('/profile')}
              expanded={open}
            />
          </List>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

          <List sx={{ pb: 1 }}>
            <NavItem
              label={isAuthenticated ? 'Logout' : 'Login'}
              icon={isAuthenticated ? <LogoutIcon /> : <LoginIcon />}
              onClick={handleLoginToggle}
              expanded={open}
            />
          </List>
        </Box>
      </Drawer>

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: '#0d1b2a',
          overflow: 'hidden',
        }}
      >
        <Toolbar className="print-hide" />
        {children}
      </Box>
    </Box>
  );
}
