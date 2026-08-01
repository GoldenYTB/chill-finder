export const themes = {
  dark: {
    bg: '#180f28',
    surface: '#241b38',
    surface2: '#2d2244',
    border: '#3a2d54',
    coral: '#ff8a65',
    amber: '#ffb454',
    mint: '#7ee8c1',
    red: '#ff6b6b',
    text: '#f5f0ff',
    textDim: '#b4a8d4',
    textFaint: '#6b5f8a',
  },
  light: {
    bg: '#faf7f5',
    surface: '#ffffff',
    surface2: '#f2ede8',
    border: '#e5ddd4',
    coral: '#e8703f',
    amber: '#d4890f',
    mint: '#1a9e75',
    red: '#d33f3f',
    text: '#2a1f1a',
    textDim: '#6b5f52',
    textFaint: '#9c9084',
  },
};

// Kept for any leftover static references -- prefer useApp().colors in
// components so theme switching actually works live.
export const colors = themes.dark;
