import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuth } from '../context/AuthContext';

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
    '&:hover fieldset': { borderColor: '#81bbe6' },
    '&.Mui-focused fieldset': { borderColor: '#81bbe6' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#81bbe6' },
};

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0d1b2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: '#111d2b',
          borderRadius: 3,
          p: { xs: 3, sm: 4 },
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <Typography
          sx={{
            color: '#81bbe6',
            fontWeight: 900,
            fontSize: '1.4rem',
            letterSpacing: 3,
            textTransform: 'uppercase',
            mb: 0.5,
          }}
        >
          HomeSight
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', mb: 3 }}>
          Sign in to your account
        </Typography>

        <TextField
          label="Email or Username"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          fullWidth
          required
          autoComplete="username"
          autoFocus
          sx={textFieldSx}
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          autoComplete="current-password"
          sx={{ ...textFieldSx, mt: 2 }}
        />

        {error && (
          <Typography sx={{ color: '#f08080', fontSize: '0.85rem', mt: 1.5 }}>
            {error}
          </Typography>
        )}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{
            mt: 3,
            bgcolor: '#1c5784',
            '&:hover': { bgcolor: '#81bbe6' },
            py: 1.25,
            fontWeight: 700,
          }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </Box>
    </Box>
  );
}
