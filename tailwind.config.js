/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"DM Sans"', 'system-ui', 'sans-serif'], marca: ['"Playfair Display"', 'Georgia', 'serif'] },
      colors: {
        chao: '#F1F0EB', folha: '#FFFFFF', tinta: '#1C1B18', cinza: '#6B6A64', linha: '#E7E5DF', bandeja: '#F6F5F1',
        ouro: { DEFAULT: '#9A7A30', escuro: '#7A5E1E', claro: '#EFE4C8' },
        ruim: { DEFAULT: '#B42318', texto: '#8F2A1E', fundo: '#FDE7E5' },
        alerta: { texto: '#7A5300', fundo: '#FDF1D6' },
        bom: { texto: '#1E6B3D', fundo: '#E0F2E6' },
      },
    },
  },
  plugins: [],
}
