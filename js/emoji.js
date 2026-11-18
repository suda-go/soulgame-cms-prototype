/* 局内表情团子：从 app 原型 js/ui.js 拷来的同一套造型（星形、12 种表情），只读不改 */
(() => {
  'use strict';
  const star = (cx, cy, r, inner = 0.45) => {
    let d = '';
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * inner : r;
      d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
    }
    return d + 'Z';
  };
  /* ---------- 局内表情：蓝色团子脸，和 Figma 局内表情同一套造型 ---------- */
  const L = [26.8, 22.8];
  const R = [38.2, 22.8];
  const pill = ([cx, cy], h = 8) => `<rect x="${cx - 1.8}" y="${cy - h / 2}" width="3.6" height="${h}" rx="1.8" fill="#111"/>`;
  const line = (d, w = 2.6, c = '#111') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const NAVY = '#0a1a5c';
  const smile = line('M25.5 39.5q7 6 14 0', 2.6, NAVY);
  const hearts = '<path d="M27.557 14.537C26.395 14.96 25.734 16.505 25.338 17.629C24.312 17.023 22.813 16.264 21.651 16.687C19.556 17.449 18.462 19.746 19.213 21.807C19.66 23.036 20.584 23.677 21.327 24.191C23.485 25.685 27.982 26.885 28.172 26.935C28.356 26.984 28.545 26.973 28.716 26.91C28.887 26.848 29.039 26.735 29.148 26.58C29.262 26.419 31.935 22.61 32.628 20.078C32.867 19.206 33.163 18.121 32.716 16.892C31.966 14.831 29.651 13.775 27.557 14.537Z" fill="#FF5D7D"/><path d="M41.769 20.365C41.014 20.09 40.041 20.583 39.375 20.976C39.118 20.247 38.689 19.244 37.935 18.969C36.575 18.474 35.073 19.16 34.586 20.498C34.295 21.296 34.488 22 34.642 22.566C35.092 24.209 36.828 26.682 36.901 26.787C36.972 26.887 37.071 26.961 37.182 27.001C37.293 27.042 37.416 27.049 37.535 27.017C37.658 26.985 40.578 26.206 41.978 25.236C42.461 24.902 43.061 24.486 43.351 23.688C43.838 22.35 43.128 20.859 41.769 20.365Z" fill="#FF5D7D"/>';
  const FACES = {
    happy: () => pill(L) + pill(R) + smile,
    love: () => hearts + smile,
    laugh: () => line('M24 24.5l2.8-3.6 2.8 3.6') + line('M35.4 24.5l2.8-3.6 2.8 3.6')
      + `<path d="M22.5 37.5h20a10 10 0 0 1-20 0z" fill="${NAVY}"/><ellipse cx="32.5" cy="44.2" rx="5" ry="2.6" fill="#ff5d7d"/>`,
    wink: () => pill(L) + line('M35.4 23.6q2.8-3.2 5.6 0') + smile + '<path d="M33 42.6h4.4v1.6a2.2 2.2 0 0 1-4.4 0z" fill="#ff5d7d"/>',
    cool: () => '<path d="M18.5 18.5h28v3.5c0 4.5-2.8 7.5-6.8 7.5s-6-2.7-6.7-6.2h-1.5c-.7 3.5-2.7 6.2-6.7 6.2s-6.3-3-6.3-7.5z" fill="#111"/>'
      + line('M22 21.6l3-2.2', 1.4, '#fff') + line('M27 40.5q6 3.6 12-1.4', 2.6, NAVY),
    tongue: () => pill(L) + pill(R) + line('M26 39h13', 2.6, NAVY) + '<path d="M30.4 39h5.2v3.4a2.6 2.6 0 0 1-5.2 0z" fill="#ff5d7d"/>',
    shock: () => `<circle cx="${L[0]}" cy="${L[1]}" r="2.6" fill="#111"/><circle cx="${R[0]}" cy="${R[1]}" r="2.6" fill="#111"/><ellipse cx="32.5" cy="42" rx="3.6" ry="4.6" fill="${NAVY}"/>`,
    cry: () => line('M24 21.6q2.8 2.6 5.6 0') + line('M35.4 21.6q2.8 2.6 5.6 0')
      + '<path d="M26.6 27c-1.6 3-2.2 5.4-.9 6.4 1.3 1 3-1 2.4-3.4z" fill="#9fdcff"/><path d="M38.4 27c1.6 3 2.2 5.4.9 6.4-1.3 1-3-1-2.4-3.4z" fill="#9fdcff"/>'
      + line('M26 44.5q6.5-5 13 0', 2.6, NAVY),
    angry: () => line('M22.6 18.4l6.6 3', 2.8) + line('M42.4 18.4l-6.6 3', 2.8) + pill([L[0], 25], 5.6) + pill([R[0], 25], 5.6)
      + line('M26.5 44.5q6-4.6 12 0', 2.6, NAVY) + line('M48 9.5l2.6 2.6M53.8 9.5l-2.6 2.6M48 15.3l2.6-2.6M53.8 15.3l-2.6-2.6', 2.2, '#ff2d55'),
    sleepy: () => line('M24 23.5h5.6') + line('M35.4 23.5h5.6') + `<ellipse cx="32.5" cy="42" rx="2.2" ry="2.6" fill="${NAVY}"/>`
      + '<text x="45" y="13" font-size="9" font-weight="900" fill="#fff" font-family="Arial, sans-serif">z</text><text x="50.5" y="8.5" font-size="12" font-weight="900" fill="#fff" font-family="Arial, sans-serif">Z</text>',
    dizzy: () => [L, R].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="none" stroke="#111" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="1.2" fill="#111"/>`).join('')
      + line('M24.5 41.5q2-2.6 4 0t4 0 4 0 4 0', 2.4, NAVY),
    star: () => [L, R].map(([x, y]) => `<path d="${star(x, y, 4.8)}" fill="#ffc93c" stroke="#e08a00" stroke-width=".8"/>`).join('')
      + `<path d="M22.5 37.5h20a10 10 0 0 1-20 0z" fill="${NAVY}"/>`,
  };
  const blob = (type, size = 48) => `<svg class="blob" width="${size}" height="${size}" viewBox="0 0 65 65" aria-hidden="true">
    <circle cx="32.5" cy="32.5" r="32.5" fill="url(#blobg)"/>${type === 'angry' ? '<circle cx="32.5" cy="32.5" r="32.5" fill="#ff3355" opacity=".3"/>' : ''}
    <ellipse cx="22" cy="12" rx="9" ry="5" fill="#fff" opacity=".18" transform="rotate(-25 22 12)"/>
    <g fill="#fff"><rect x="19.8" y="14.3" width="12.2" height="17.9" rx="6.1" transform="rotate(15 19.8 14.3)"/><rect width="12.2" height="17.9" rx="6.1" transform="matrix(.966 -.259 -.259 -.966 37.9 34.8)"/><rect x="17.85" y="15.6" width="29.3" height="15" rx="7.5"/></g>
    ${(FACES[type] || FACES.happy)()}
  </svg>`;
  window.Emoji = { blob, types: Object.keys(FACES) };
})();
