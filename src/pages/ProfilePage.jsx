import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../context/AuthContext';

function ProfileField({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
      <Box sx={{ color: '#81bbe6', display: 'flex', flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.8, lineHeight: 1 }}>
          {label}
        </Typography>
        <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 500, mt: 0.4, wordBreak: 'break-all' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || '—'
    : null;

  return (
    <Box sx={{ px: 3, pt: 3, maxWidth: 520 }}>
      <Typography
        sx={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem', mb: 3, letterSpacing: 0.5 }}
      >
        Profile
      </Typography>

      <Box
        sx={{
          bgcolor: '#111d2b',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Avatar header */}
        <Box
          sx={{
            bgcolor: '#1c5784',
            px: 3,
            py: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <AccountCircleIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.7)' }} />
          <Box>
            {user ? (
              <>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', lineHeight: 1.2 }}>
                  {fullName}
                </Typography>
                {user.username && (
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', mt: 0.25 }}>
                    @{user.username}
                  </Typography>
                )}
              </>
            ) : (
              <>
                <Skeleton variant="text" width={160} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
                <Skeleton variant="text" width={100} height={18} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mt: 0.5 }} />
              </>
            )}
          </Box>
        </Box>

        {/* Fields */}
        <Box sx={{ px: 3 }}>
          {user ? (
            <>
              {user.email && (
                <>
                  <ProfileField
                    icon={<EmailIcon fontSize="small" />}
                    label="Email"
                    value={user.email}
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />
                </>
              )}
              {user.username && (
                <>
                  <ProfileField
                    icon={<PersonIcon fontSize="small" />}
                    label="Username"
                    value={user.username}
                  />
                  {(user.first_name || user.last_name) && (
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />
                  )}
                </>
              )}
              {(user.first_name || user.last_name) && (
                <ProfileField
                  icon={<PersonIcon fontSize="small" />}
                  label="Name"
                  value={[user.first_name, user.last_name].filter(Boolean).join(' ')}
                />
              )}
            </>
          ) : (
            // Skeleton fields while user is loading
            Array.from({ length: 2 }).map((_, i) => (
              <Box key={i}>
                <Box sx={{ py: 2 }}>
                  <Skeleton variant="text" width="25%" height={14} sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 0.75 }} />
                  <Skeleton variant="text" width="55%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                </Box>
                {i < 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />}
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
