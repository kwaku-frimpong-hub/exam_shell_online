import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#c3eb7b', contrastText: '#1b2510' },
    background: { default: '#101210', paper: '#171a14' },
    text: { primary: '#e7e9e3', secondary: '#9ba292' },
    divider: '#30372a',
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minWidth: 0 } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#282f22' } } },
    MuiChip: { styleOverrides: { root: { fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, height: 25 } } },
  },
})

export default theme
