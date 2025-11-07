// Cloudflare Pagesではprerenderを無効化（AudioContext等のブラウザAPIを使用するため）
export const prerender = false;
export const ssr = false;

export const load = () => {
  return {
    title: 'ChordLens - Real-time Piano Chord Detection'
  };
};
