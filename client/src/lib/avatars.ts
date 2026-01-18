export function getAvatarUrl(seed: string): string {
  // Using DiceBear API for funky and funny avatars
  // Collection: 'fun-emoji' gives hilarious and expressive faces
  // Fallback to 'bottts' if you want robots, but 'fun-emoji' fits the request better
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodedSeed}&backgroundColor=transparent`;
}

export function getAvatarColor(seed: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899', // pink
    '#f43f5e'  // rose
  ];
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
