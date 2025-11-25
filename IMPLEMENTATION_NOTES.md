# Fugitive Run - Implementation Progress

## Completed Features ✅

### 1. Symbol System
- **Low Pays (3 symbols)**: Talisman 🔮, Scrap 🔩, Coin 🪙
  - 5OAK pays: 2.0x - 3.0x bet
- **Mid Pays (3 symbols)**: Footsteps 👣, Crow 🦅, Camera 📹
  - 5OAK pays: 5.0x - 10.0x bet
- **High Pays (2 symbols)**: Safe 🔐, Relic 💎
  - 5OAK pays: 20.0x - 40.0x bet
- **Special Symbols (7)**:
  - Wild ⚡ - Substitutes for any symbol
  - Scatter 🚨 - 3+ triggers bonus
  - Trail 🥾 - Fills chase meter (+1)
  - Adrenaline 💉 - Increases player speed (+5%)
  - Flashlight 🔦 - Adds sanctuary (+1)
  - Hazard ☠️ - Increases monster speed (+7%)
  - Cache 💰 - Boosts pot (+50%) and loot density (+1)

### 2. Payline System
- 21 fixed paylines on 5×4 grid
- Patterns include: straight lines, V-shapes, W/M shapes, diagonals, zigzags
- calculateLineWins() handles wild substitution
- Immediate payout on line wins

### 3. Chase Meter System
- 0-20 meter fills with Trail 🥾 symbols
- Visual bar UI with color change (green → orange → red)
- Dual trigger system:
  - **Meter Trigger**: Chase meter reaches 20
  - **Scatter Trigger**: 3+ Scatter symbols
- Resets to 0 after bonus triggered

### 4. Maze Parameters
- calculateMazeParams() scans grid for special symbols
- Builds mazeParams object:
  - `playerSpeed`: Base 1.0 + Adrenaline bonuses
  - `monsterSpeed`: Base 1.0 + Hazard penalties
  - `lootDensity`: Base 1.0 + Cache bonuses
  - `sanctuaryCount`: From Flashlight symbols
  - `startPot`: 3-8x bet × Cache multipliers
- Parameters affect maze generation and difficulty

### 5. 12-Level Maze Progression
- MAZE_TUNING table with escalating difficulty:
  - **Maze 1**: 5% crash chance, 1.0× speeds, SAFE
  - **Maze 6**: 30% crash chance, 1.25× monster speed, DANGEROUS
  - **Maze 12**: 90% crash chance, 1.65× monster speed, DEADLY
- Each level has:
  - Multiplier range (pot growth)
  - Player/monster speed modifiers
  - Loot density multiplier
  - Sanctuary spawn chance
  - Crash probability
- Maze size increases with level (10×10 base + level/3 bonus cells)

### 6. Exit Choice Overlay
- Appears when player reaches maze exit
- Shows current stats:
  - Current pot amount
  - Next maze level
  - Danger rating (LOW/HIGH/DEADLY)
- Two choices:
  - **💰 CASH OUT**: Take the pot and return to base game
  - **🔥 GO DEEPER**: Continue to next maze level with increased pot
- Max level (12) awards 2× pot multiplier

### 7. UI Elements
- Chase meter bar with fill percentage
- Exit choice modal overlay
- Symbol analysis panel shows:
  - Line wins with payouts
  - Maze level and starting pot
  - Danger rating
  - Player speed modifier
  - Sanctuary count
- Updated CSS for all new elements

## Pending Features 🔄

### 8. Loot Pickup Mechanics
- Need to implement:
  - Loot tile generation based on `lootDensity` from tuning
  - Visual golden glow effect on loot tiles
  - Collection detection (player position overlaps loot)
  - Cash reward (small pot increase)
  - Slowdown stack (reduces player speed)
  - Monster speed boost (makes monster faster)
  - Risk/reward tradeoff balance

### 9. Sanctuary System
- Need to implement:
  - Sanctuary tile generation based on `sanctuaryCount` and `sanctChance`
  - Visual blue/white glow effect
  - Safe zone detection (monster pauses/slows near sanctuary)
  - Sanctuary duration/cooldown mechanics

### 10. Testing & Balancing
- Full gameplay flow testing:
  - Base game → line wins → meter fill → bonus trigger
  - Maze levels 1-12 progression
  - Exit choices and pot growth
  - Win/loss balance
- RTP tuning (target ~97%):
  - Base game: 60-65%
  - Bonus game: 35-40%
- Symbol weight adjustments
- Payline payout balancing
- Maze difficulty curve refinement

## Known Issues ⚠️

1. **Crash Detection**: Currently using very low per-frame probability. May need adjustment for better feel.
2. **Maze Speed**: Player speed calculation may need fine-tuning for smooth gameplay.
3. **Pot Growth**: Multiplier increases between levels may need balancing.
4. **Symbol Weights**: May need adjustment based on actual RTP testing.

## Next Steps 📋

1. **Add loot mechanics** (pickup tiles, cash rewards, speed tradeoffs)
2. **Add sanctuary system** (safe zones from Flashlight symbols)
3. **Full gameplay testing** (base game flow → bonus → exit choices)
4. **RTP analysis** (track all payouts, adjust weights/payouts)
5. **Polish** (animations, sound effects, visual feedback)
6. **Balance tuning** (difficulty curve, pot growth, crash rates)

## Design Philosophy

- **Base Game**: Frequent small wins for player comfort (paylines)
- **Bonus Game**: High-stakes episodic experience (maze levels)
- **Player Agency**: Exit choices create "flew too close to sun" framing
- **Progressive Risk**: Difficulty escalates across 12 levels (safe → deadly)
- **Strategic Depth**: Special symbols affect maze parameters (planning layer)

## File Structure

```
Slot and Crash/
├── index.html          # Main HTML with chase meter + exit overlay
├── styles.css          # CSS including meter + overlay styles
├── game.js             # Core game logic (1500+ lines)
└── IMPLEMENTATION_NOTES.md  # This file
```

## Key Functions

- `evaluateSpin()` - Checks paylines, updates chase meter, triggers bonus
- `calculateLineWins(grid)` - Finds all winning paylines with wilds
- `calculateMazeParams(grid)` - Extracts special symbol modifiers
- `generateNextMaze()` - Creates new maze using tuning table
- `showExitChoice()` - Displays exit overlay when maze complete
- `handleExitCashout()` - Player takes the pot
- `handleExitContinue()` - Player advances to next level
- `updateChaseMeterUI()` - Updates meter fill bar

## Testing Checklist

- [ ] Base game spins properly
- [ ] Line wins calculate correctly
- [ ] Chase meter fills with Trail symbols
- [ ] Scatter trigger (3+) works
- [ ] Meter trigger (20) works
- [ ] Maze parameters calculated from symbols
- [ ] Maze level 1 generates and plays
- [ ] Exit choice appears at maze completion
- [ ] Cash out awards correct pot
- [ ] Continue advances to next level
- [ ] Pot grows with each level
- [ ] Danger rating shows correctly
- [ ] Max level (12) gives bonus
- [ ] Crash probability feels fair
- [ ] Player/monster speeds feel balanced
