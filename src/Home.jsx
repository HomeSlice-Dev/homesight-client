import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

export default function Home({ onFetchSuccess }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/reports?client_id=${encodeURIComponent(input)}`);
      const data = await res.json();
      console.log('API results:', data);
      onFetchSuccess(data);
    } catch (err) {
      console.error('Fetch error:', err);
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        px: 2,
      }}
    >
      <Typography
        sx={{
          color: '#fff',
          fontSize: { xs: '1.8rem', md: '3rem' },
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 3,
        }}
      >
        HomeSight
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: 500 }}>
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter client ID..."
          variant="outlined"
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: '#fff' },
              '&:hover fieldset': { borderColor: '#81bbe6' },
            },
            '& .MuiInputBase-input::placeholder': { color: '#aaa' },
          }}
        />
        <Button
          variant="contained"
          onClick={handleFetch}
          disabled={loading}
          sx={{ whiteSpace: 'nowrap', bgcolor: '#1c5784', '&:hover': { bgcolor: '#81bbe6' }, paddingX: 4 }}
        >
          {loading ? 'Loading...' : 'Fetch Results'}
        </Button>
      </Box>
    </Box>
  );
}
