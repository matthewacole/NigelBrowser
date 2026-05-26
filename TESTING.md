# Nigel Testing Guide

## Quick Start

```bash
npm test          # Run 5 automated AI test games
npm run test:1    # Run 1 test game
```

## Automated Test Script

`tests/run-tests.mjs` uses Playwright to:
1. Start a Vite dev server
2. Launch headless Chromium
3. Start a new game (Human vs Expert AI)
4. Wait for AI moves and track errors
5. Run 5 games and report results

### Requirements

```bash
npx playwright install chromium
```

## Manual Testing Checklist

### Game Setup
- [ ] Main menu loads with "Nigel" title
- [ ] "New Game" opens setup modal
- [ ] Can configure 2-4 players (Human/AI mix)
- [ ] Can set AI difficulty (Beginner/Intermediate/Expert)
- [ ] "Start Game" creates game with correct tile distribution (98 tiles, no blanks)
- [ ] "Resume Game" appears when a saved game exists

### Scrabble Rules
- [ ] First move must cover center square (H8/7,7)
- [ ] Tiles must be placed in a single row or column
- [ ] No gaps allowed between tiles in a word
- [ ] All new words must connect to existing tiles (after first move)
- [ ] Words must be in dictionary (TWL06)
- [ ] Center square acts as Double Word on first move
- [ ] Premium squares only count on first use
- [ ] Bingo bonus (+50) when using all 7 tiles
- [ ] Game ends when a player uses all tiles and bag is empty
- [ ] Game ends after 6 consecutive passes (all players)
- [ ] Final scoring: unplayed tiles are subtracted from each player
- [ ] Player who goes out gets the sum of opponents' unplayed tiles added

### Tile Drag & Drop
- [ ] Can drag tile from rack to board
- [ ] Can move tile between board positions
- [ ] Can return tile from board to rack (click or Escape)
- [ ] Drop target highlights green for valid, red for invalid
- [ ] Drag preview shows tile following cursor
- [ ] Rack correctly removes tile when placed on board
- [ ] Rack correctly shows tile when recalled from board

### Move Submission
- [ ] "Play" button is disabled when no tiles placed
- [ ] "Play" button is disabled when placement is invalid
- [ ] "Play" submits move and updates scores
- [ ] Tiles correctly removed from rack after commit
- [ ] New tiles drawn from bag after commit
- [ ] Move appears in move log
- [ ] Turn advances to next player
- [ ] AI takes turn automatically after human commits

### AI Play
- [ ] AI border animation plays during AI turn
- [ ] AI commits a valid move
- [ ] AI's score updates correctly
- [ ] AI can pass if no valid moves

### Visual Design (Apple-style)
- [ ] Tiles use system sans-serif font (SF Pro / Helvetica Neue)
- [ ] Tiles have clean, flat design with rounded corners
- [ ] Premium squares show translucent pastel colors
- [ ] Sidebar has frosted glass effect (backdrop-filter: blur)
- [ ] Buttons are pill-shaped with smooth transitions
- [ ] Board has subtle border and shadow
- [ ] Modal dialogs have frosted glass background
- [ ] Dark mode and light mode both look polished
- [ ] Overall aesthetic matches Apple's web design language

### Edge Cases
- [ ] Exchange tiles works (can select and confirm)
- [ ] Pass works (advances turn)
- [ ] Forfeit ends game immediately
- [ ] Shuffle randomizes rack tiles
- [ ] Keyboard shortcuts: Enter=Play, Esc=Recall, R=Shuffle, E=Exchange, P=Pass
- [ ] Game can be completed with 2-4 players
- [ ] Loading state shows while dictionary loads
- [ ] Error state shows if dictionary fails to load
- [ ] Game report saves as HTML download
- [ ] Bingo confetti animation plays on all-7-tile plays

## Scoring Validation

For any played word, verify:
```
word_score = sum(tile_values) × letter_multipliers × word_multipliers
total_score = word_score(main) + word_score(cross_words)
bingo_bonus = +50 if 7 tiles used
```

Letter multipliers: DL (×2), TL (×3)
Word multipliers: DW (×2), TW (×3)
Premium squares only count for newly placed tiles

## Running Tests

### All 5 games:
```bash
cd web && node tests/run-tests.mjs
```

### Single game with visible browser:
Edit `tests/run-tests.mjs` line ~153: change `headless: true` to `headless: false`
