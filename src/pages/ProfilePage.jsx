import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function ProfilePage() {
  return (
    <Box sx={{ px: 3, pt: 3 }}>
      <Typography
        sx={{ color: '#fff', fontWeight: 700, fontSize: '1.4rem', mb: 1, letterSpacing: 0.5 }}
      >
        Profile
      </Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
        User profile settings will appear here.
      </Typography>
    </Box>
  );
}
