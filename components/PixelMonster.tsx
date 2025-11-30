
import React from 'react';

interface Props {
  name: string;
  isBoss?: boolean;
  className?: string;
}

// Simple pixel art maps (12x12 grid ideally)
// Color codes:
// . = transparent
// # = primary color
// 0 = outline/black
// W = white (eyes/teeth)
// R = red (eyes/blood)
// Y = yellow/gold
const ART_MAPS: Record<string, string[]> = {
  'slime': [
    '............',
    '............',
    '.....00.....',
    '...00##00...',
    '..0######0..',
    '.0#W#00#W#0.',
    '.0########0.',
    '.0##0##0##0.',
    '..0######0..',
    '...000000...',
    '............',
    '............',
  ],
  'rat': [
    '............',
    '............',
    '......00....',
    '.....0##0...',
    '...00####0..',
    '..0##0##R#0.',
    '.0#########0',
    '0#W#######0.',
    '.000000000..',
    '..0.0..0.0..',
    '............',
    '............',
  ],
  'goblin': [
    '............',
    '....0000....',
    '...0####0...',
    '..0#R##R#0..',
    '000######000',
    '0#0#WWWW#0#0',
    '..0######0..',
    '..0#0000#0..',
    '..00....00..',
    '............',
    '............',
    '............',
  ],
  'skeleton': [
    '............',
    '....0000....',
    '...0WWWW0...',
    '..0W0WW0W0..',
    '..0WW00WW0..',
    '..0WWWWWW0..',
    '...00WW00...',
    '....0WW0....',
    '...0W00W0...',
    '..0W0..0W0..',
    '............',
    '............',
  ],
  'orc': [
    '............',
    '...00000....',
    '..0#####0...',
    '.0#######0..',
    '.0#R###R#0..',
    '.0#######0..',
    '.0##WWW##0..',
    '..0#####0...',
    '.00#####00..',
    '0#0000000#0.',
    '............',
    '............',
  ],
  'ghost': [
    '............',
    '....0000....',
    '...0WWWW0...',
    '..0WWWWWW0..',
    '.0WW0WW0WW0.',
    '.0WWWWWWWW0.',
    '.0WWWWWWWW0.',
    '.0WWWWWWWW0.',
    '.0W0WWWW0W0.',
    '.00.0000.00.',
    '............',
    '............',
  ],
  'troll': [
    '............',
    '...000000...',
    '..0######0..',
    '.0#0####0#0.',
    '.0########0.',
    '.0#R####R#0.',
    '.0###WW###0.',
    '..0##WW##0..',
    '...000000...',
    '..0######0..',
    '.0########0.',
    '............',
  ],
  'golem': [
    '............',
    '...000000...',
    '..0WWTWWT0..',
    '..0TTTTTT0..',
    '.0TTTRRTTT0.',
    '.0TTTRRTTT0.',
    '.0TTTRRTTT0.',
    '..0TTTTTT0..',
    '...000000...',
    '..0TTTTTT0..',
    '..0T0000T0..',
    '............',
  ],
  'wyvern': [
    '............',
    '.......00...',
    '......0##0..',
    '.....0###0..',
    '.00..0#R#0..',
    '.0#00####0..',
    '.0#######0..',
    '..0#####0...',
    '...00000....',
    '..0.0.0.....',
    '............',
    '............',
  ],
  'dragon': [
    '............',
    '......000...',
    '.....0###0..',
    '...00#####0.',
    '..0##R###R0.',
    '.0#########0',
    '.0###WWW###0',
    '..0#######0.',
    '...0#####0..',
    '....00000...',
    '............',
    '............',
  ],
  'demon': [
    '............',
    '...00..00...',
    '..0##00##0..',
    '.0########0.',
    '.0#R####R#0.',
    '.0########0.',
    '.0##WWWW##0.',
    '..0######0..',
    '...000000...',
    '...0####0...',
    '..00....00..',
    '............',
  ],
  'default': [
    '............',
    '....0000....',
    '...0????0...',
    '..0??????0..',
    '..0?0??0?0..',
    '..0??????0..',
    '..0??00??0..',
    '...0????0...',
    '....0000....',
    '............',
    '............',
    '............',
  ]
};

const PALETTES: Record<string, Record<string, string>> = {
  'slime': { '#': '#4ade80', '0': '#14532d', 'W': '#ffffff', 'R': '#ffffff' }, // Green
  'rat': { '#': '#a8a29e', '0': '#44403c', 'W': '#ffffff', 'R': '#ef4444' }, // Grey/Brown
  'goblin': { '#': '#84cc16', '0': '#1a2e05', 'W': '#fef08a', 'R': '#ef4444' }, // Lime
  'skeleton': { '#': '#e2e8f0', 'W': '#e2e8f0', '0': '#334155' }, // Bone White
  'orc': { '#': '#15803d', '0': '#052e16', 'W': '#fef08a', 'R': '#dc2626' }, // Dark Green
  'ghost': { '#': '#cbd5e1', 'W': '#f1f5f9', '0': '#64748b' }, // Pale Blue
  'troll': { '#': '#78350f', '0': '#290e03', 'W': '#fef3c7', 'R': '#ef4444' }, // Brown
  'golem': { 'T': '#64748b', 'R': '#3b82f6', 'W': '#94a3b8', '0': '#0f172a' }, // Stone & Mana
  'wyvern': { '#': '#0891b2', '0': '#0e7490', 'R': '#fbbf24' }, // Cyan
  'dragon': { '#': '#b91c1c', '0': '#450a0a', 'W': '#fcd34d', 'R': '#000000' }, // Red
  'demon': { '#': '#7f1d1d', '0': '#000000', 'W': '#fbbf24', 'R': '#ef4444' }, // Dark Red
  'default': { '?': '#94a3b8', '0': '#000000' }
};

export const PixelMonster: React.FC<Props> = ({ name, isBoss, className }) => {
  // Determine base type based on name
  let type = 'default';
  const n = name.toLowerCase();

  if (n.includes('слизень')) type = 'slime';
  else if (n.includes('крыс')) type = 'rat';
  else if (n.includes('гоблин')) type = 'goblin';
  else if (n.includes('скелет') || n.includes('кост')) type = 'skeleton';
  else if (n.includes('орк')) type = 'orc';
  else if (n.includes('призрак')) type = 'ghost';
  else if (n.includes('тролль')) type = 'troll';
  else if (n.includes('голем')) type = 'golem';
  else if (n.includes('виверна')) type = 'wyvern';
  else if (n.includes('дракон')) type = 'dragon';
  else if (n.includes('демон') || n.includes('архидемон')) type = 'demon';

  const map = ART_MAPS[type] || ART_MAPS['default'];
  const palette = PALETTES[type] || PALETTES['default'];

  // Modify palette for boss
  const activePalette = isBoss ? { ...palette } : palette;
  if (isBoss) {
      // Shift colors slightly for boss variants or add distinct colors
      if (activePalette['#']) activePalette['#'] = adjustColor(activePalette['#']); // Darker
  }

  const cellSize = 10;
  const width = map[0].length * cellSize;
  const height = map.length * cellSize;

  return (
    <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`} 
        className={`${className} overflow-visible`}
        style={{ shapeRendering: 'crispEdges' }} // Crucial for pixel art look
    >
      {isBoss && (
          // Simple crown or aura for boss
          <filter id="bossGlow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
              </feMerge>
          </filter>
      )}
      
      <g filter={isBoss ? "drop-shadow(0 0 4px red)" : ""}>
        {map.map((row, y) => (
            row.split('').map((char, x) => {
                if (char === '.') return null;
                const fill = activePalette[char] || '#000000';
                return (
                    <rect 
                        key={`${x}-${y}`} 
                        x={x * cellSize} 
                        y={y * cellSize} 
                        width={cellSize} 
                        height={cellSize} 
                        fill={fill} 
                    />
                );
            })
        ))}
      </g>
    </svg>
  );
};

// Helper to darken colors for bosses (simplified)
function adjustColor(color: string) {
    return color; 
}
