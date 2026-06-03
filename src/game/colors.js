export const BALL_COLORS = [
  { base: '#e74c3c', dark: '#922b21', light: '#f1948a' },
  { base: '#e67e22', dark: '#935116', light: '#f0a96a' },
  { base: '#f1c40f', dark: '#9a7d0a', light: '#f7dc6f' },
  { base: '#27ae60', dark: '#1a7245', light: '#82e0aa' },
  { base: '#2980b9', dark: '#1a5276', light: '#7fb3d3' },
  { base: '#8e44ad', dark: '#6c3483', light: '#c39bd3' },
  { base: '#16a085', dark: '#0e6655', light: '#76d7c4' },
  { base: '#d35400', dark: '#873600', light: '#e59866' },
  { base: '#c0392b', dark: '#7b1f1f', light: '#e87168' },
  { base: '#1abc9c', dark: '#0e6655', light: '#76d7c4' },
  { base: '#e91e8c', dark: '#8c0050', light: '#f560b0' },
  { base: '#2c3e50', dark: '#141d26', light: '#5d6d7e' },
];

export function randomColor() {
  return BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
}

export function lightenHex(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

export const BG_GRADIENT = ['#060d1a', '#0d1e38', '#091526'];
