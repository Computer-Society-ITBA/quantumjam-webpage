// The Compys coin as pixel grids, sampled from the source art (25 columns by
// 24 rows; the original pixels are slightly taller than wide). Keys:
// O orange, W white, K black, B brown rim, "." empty.
//
// COMPY_BACK is drawn on a face turned 180 degrees, so its outline is the
// mirror of COMPY_FRONT; that keeps both faces flush with the extruded rim.

export const COMPY_COLS = 25
export const COMPY_ROWS = 24

export const COMPY_COLORS: Record<string, string> = {
  O: '#ffa200',
  W: '#ffffff',
  K: '#000000',
  B: '#8b4b1b',
}

// The rim alternates these, one band per pixel of the outline.
export const COMPY_RIM_BANDS = ['#8b4b1a', '#612e06']

export const COMPY_FRONT = [
  '...........OOOO..........',
  '.......OOOOOOOOOOO.......',
  '.....OOOOOOOOOOOOOOO.....',
  '....OOOOOOWWWWWOOOOOO....',
  '...OOOOOWWWWWWWOOOOOOO...',
  '..OOOOOOOOOWWWWOOOOOOOO..',
  '..OOOKKKOOOWWWWOOOKKKOOO.',
  '.OOOKKWWKWOWWWWWWKKWWKOO.',
  '.OOOKWKWKWOWWWWOWKWKWKOOO',
  'OOOOKKKWKOOWWWWOOKKKWKOOO',
  'OOOOKKKWKOOWWWWOOKKKWKOOO',
  'OOOOKKWWKOOWWWWOOKKWWKOOO',
  'OOOOOKKKOOKWWKWOOOKKKOOOO',
  'OOOOOWWWOOOKKWWOOOWWWOOOO',
  'OOOOOWWWWOOWWWWOOWWWWOOOO',
  'BOOOOOWWWWOOOOOOWWWWOOOOO',
  '.OOOOOOWWWWWWWWWWWOOOOOOB',
  '.BOOOOOOOOOWWWWOOOOOOOOO.',
  '..OOOOOOOOOWWWWOOOOOOOOB.',
  '..BOOOOOOWWWWWWWWOOOOOB..',
  '...BOOOOOOOOOOOOOOOOOB...',
  '....BBOOOOOOOOOOOOOBB....',
  '......BBOOOOOOOOOBB......',
  '........BBBBBBBBB........',
]

export const COMPY_BACK = [
  '..........OOOO...........',
  '.......OOOOOOOOOOO.......',
  '.....OOOOOOOOOOOOOOO.....',
  '....OOOOOOWWWWWOOOOOO....',
  '...OOOOOWWWWWWWOOOOOOO...',
  '..OOOOOOOOOWWWWOOOOOOOO..',
  '.OOOOOOOOOOWWWWOOOOOOOO..',
  '.OOOOOOOWWOWWWWWWWOOOOOO.',
  'OOOOOOWWWWOWWWWOWWWWOOOO.',
  'OOOOOWWWWOOWWWWOOWWWWOOOO',
  'OOOOOWWWOOOWWWWOOOWWWOOOO',
  'OOOOOWWWOOOWWWWOOOWWWOOOO',
  'OOOOOWWWOOOWWWWOOOWWWOOOO',
  'OOOOOWWWOOOWWWWOOOWWWOOOO',
  'OOOOOWWWWOOWWWWOOWWWWOOOO',
  'BOOOOOWWWWOOOOOOWWWWOOOOO',
  'BOOOOOOWWWWWWWWWWWOOOOOO.',
  '.BOOOOOOOOOWWWWOOOOOOOOO.',
  '.BOOOOOOOOOWWWWOOOOOOOO..',
  '..BOOOOOOWWWWWWWWOOOOOB..',
  '...BOOOOOOOOOOOOOOOOOB...',
  '....BBOOOOOOOOOOOOOBB....',
  '......BBOOOOOOOOOBB......',
  '........BBBBBBBBB........',
]
