// Theme: horror chase.
// Survivor is running from a monster with stolen cash.
// Use same crash logic (progress bar until random crashPoint).
// When crash occurs, show red flash and monster scream sound.
// When escape succeeds, show safe zone animation and payout.

// ====== GAME STATE ======
const gameState = {
    bankedTotal: 10000.00,
    betAmount: 1.00,
    bestRun: 0.00,
    isSpinning: false,
    isRunning: false,
    isWaitingToStart: false,
    currentMultiplier: 1.00,
    symbols: [],
    crashPoint: 0,
    canCashout: false,
    pendingParams: null,
    currentMazeLevel: 0,
    mazePot: 0,
    collectedPrizes: [],  // Prizes collected during current run (bronze/silver/gold)
    totalCollected: 0,    // Running total of collected prizes
    lowVolMeter: 0,       // Green meter (0-40)
    highVolMeter: 0,      // Red meter (0-40)
    pendingGameMode: null // 'low' or 'high' - which crash game to launch
};

// ====== SYMBOL DEFINITIONS (Slot Game) ======
// Low-pay symbols (5-of-a-kind = 2-3x bet)
// Mid-pay symbols (5-of-a-kind = 5-10x bet)
// High-pay symbols (5-of-a-kind = 20-40x bet)
// Point symbols feed dual meters, Crash symbol triggers game
const SYMBOLS = {
    // LOW PAYS
    talisman:   { emoji: '🗿', name: 'talisman',   weight: 20, pays: [0, 0, 0.2, 0.5, 2.0] },
    scrap:      { emoji: '🔩', name: 'scrap',      weight: 20, pays: [0, 0, 0.2, 0.5, 2.5] },
    coin:       { emoji: '🪙', name: 'coin',       weight: 18, pays: [0, 0, 0.3, 0.6, 3.0] },
    
    // MID PAYS
    footsteps:  { emoji: '👣', name: 'footsteps',  weight: 14, pays: [0, 0, 0.5, 2.0, 5.0] },
    crow:       { emoji: '🦅', name: 'crow',       weight: 14, pays: [0, 0, 0.5, 2.5, 7.0] },
    camera:     { emoji: '📹', name: 'camera',     weight: 12, pays: [0, 0, 1.0, 3.0, 10.0] },
    
    // HIGH PAYS
    safe:       { emoji: '🔐', name: 'safe',       weight: 8,  pays: [0, 0, 2.0, 10.0, 20.0] },
    relic:      { emoji: '💎', name: 'relic',      weight: 6,  pays: [0, 0, 3.0, 15.0, 40.0] },
    
    // SPECIAL SYMBOLS
    wild:       { emoji: '⚡', name: 'wild',       weight: 5,  pays: [0, 0, 0, 0, 0], isWild: true },
    crash:      { emoji: '💥', name: 'crash',      weight: 2,  pays: [0, 0, 0, 0, 0], isCrash: true },  // Triggers crash game (~every 5-10 spins)
    
    // LOW VOL POINT SYMBOLS (Green - feed left meter)
    greenPt1:   { emoji: '🟢', name: 'greenPt1',   weight: 8,  pays: [0, 0, 0, 0, 0], pointValue: 1, meterType: 'low' },
    greenPt2:   { emoji: '🟢', name: 'greenPt2',   weight: 6,  pays: [0, 0, 0, 0, 0], pointValue: 2, meterType: 'low' },
    greenPt3:   { emoji: '🟢', name: 'greenPt3',   weight: 4,  pays: [0, 0, 0, 0, 0], pointValue: 3, meterType: 'low' },
    greenPt4:   { emoji: '🟢', name: 'greenPt4',   weight: 3,  pays: [0, 0, 0, 0, 0], pointValue: 4, meterType: 'low' },
    greenPt5:   { emoji: '🟢', name: 'greenPt5',   weight: 2,  pays: [0, 0, 0, 0, 0], pointValue: 5, meterType: 'low' },
    
    // HIGH VOL POINT SYMBOLS (Red - feed right meter)
    redPt1:     { emoji: '🔴', name: 'redPt1',     weight: 8,  pays: [0, 0, 0, 0, 0], pointValue: 1, meterType: 'high' },
    redPt2:     { emoji: '🔴', name: 'redPt2',     weight: 6,  pays: [0, 0, 0, 0, 0], pointValue: 2, meterType: 'high' },
    redPt3:     { emoji: '🔴', name: 'redPt3',     weight: 4,  pays: [0, 0, 0, 0, 0], pointValue: 3, meterType: 'high' },
    redPt4:     { emoji: '🔴', name: 'redPt4',     weight: 3,  pays: [0, 0, 0, 0, 0], pointValue: 4, meterType: 'high' },
    redPt5:     { emoji: '🔴', name: 'redPt5',     weight: 2,  pays: [0, 0, 0, 0, 0], pointValue: 5, meterType: 'high' }
};

// Maze tuning table (12 levels)
const MAZE_TUNING = [
    null, // index 0 unused
    { multRange:[1.0,1.5],   monsterSpd:1.00, playerSpd:1.00, lootDensity:1.0, sanctChance:0.30, crashProb:0.05 },  // Maze 1
    { multRange:[1.5,2.2],   monsterSpd:1.05, playerSpd:1.00, lootDensity:1.1, sanctChance:0.30, crashProb:0.08 },  // Maze 2
    { multRange:[2.2,3.2],   monsterSpd:1.08, playerSpd:0.98, lootDensity:1.2, sanctChance:0.25, crashProb:0.12 },  // Maze 3
    { multRange:[3.2,5.0],   monsterSpd:1.12, playerSpd:0.96, lootDensity:1.3, sanctChance:0.20, crashProb:0.18 },  // Maze 4
    { multRange:[5.0,8.0],   monsterSpd:1.18, playerSpd:0.95, lootDensity:1.4, sanctChance:0.18, crashProb:0.24 },  // Maze 5
    { multRange:[8.0,12],    monsterSpd:1.25, playerSpd:0.94, lootDensity:1.5, sanctChance:0.15, crashProb:0.30 },  // Maze 6
    { multRange:[12,20],     monsterSpd:1.33, playerSpd:0.93, lootDensity:1.6, sanctChance:0.12, crashProb:0.38 },  // Maze 7
    { multRange:[20,35],     monsterSpd:1.42, playerSpd:0.92, lootDensity:1.7, sanctChance:0.10, crashProb:0.48 },  // Maze 8
    { multRange:[35,60],     monsterSpd:1.50, playerSpd:0.92, lootDensity:1.8, sanctChance:0.08, crashProb:0.58 },  // Maze 9
    { multRange:[60,120],    monsterSpd:1.55, playerSpd:0.91, lootDensity:1.9, sanctChance:0.06, crashProb:0.70 },  // Maze 10
    { multRange:[120,250],   monsterSpd:1.60, playerSpd:0.90, lootDensity:2.0, sanctChance:0.05, crashProb:0.80 },  // Maze 11
    { multRange:[250,500],   monsterSpd:1.65, playerSpd:0.90, lootDensity:2.1, sanctChance:0.03, crashProb:0.90 }   // Maze 12
];

// ====== PAYLINES (5x4 grid = 20 positions) ======
// Each payline is an array of [row, col] positions
// Grid layout: [row 0-3][col 0-4]
const PAYLINES = [
    // Straight lines (5)
    [[0,0],[0,1],[0,2],[0,3],[0,4]], // Top row
    [[1,0],[1,1],[1,2],[1,3],[1,4]], // Second row
    [[2,0],[2,1],[2,2],[2,3],[2,4]], // Third row
    [[3,0],[3,1],[3,2],[3,3],[3,4]], // Bottom row
    [[1,0],[2,1],[2,2],[2,3],[1,4]], // Middle zigzag
    
    // V-shapes (4)
    [[0,0],[1,1],[2,2],[1,3],[0,4]], // V from top
    [[3,0],[2,1],[1,2],[2,3],[3,4]], // V from bottom
    [[1,0],[0,1],[0,2],[0,3],[1,4]], // Shallow V top
    [[2,0],[3,1],[3,2],[3,3],[2,4]], // Shallow V bottom
    
    // W/M shapes (4)
    [[0,0],[1,1],[0,2],[1,3],[0,4]], // W top
    [[3,0],[2,1],[3,2],[2,3],[3,4]], // M bottom
    [[1,0],[2,1],[1,2],[2,3],[1,4]], // W middle
    [[2,0],[1,1],[2,2],[1,3],[2,4]], // M middle
    
    // Diagonals and zigzags (8)
    [[0,0],[1,1],[2,2],[3,3],[2,4]], // Diagonal down-up
    [[3,0],[2,1],[1,2],[0,3],[1,4]], // Diagonal up-down
    [[0,0],[0,1],[1,2],[2,3],[3,4]], // Stairs down
    [[3,0],[3,1],[2,2],[1,3],[0,4]], // Stairs up
    [[1,0],[1,1],[2,2],[3,3],[3,4]], // Lower stairs
    [[2,0],[2,1],[1,2],[0,3],[0,4]], // Upper stairs
    [[0,0],[2,1],[3,2],[2,3],[0,4]], // Deep V
    [[3,0],[1,1],[0,2],[1,3],[3,4]]  // Deep mountain
];

// ====== CONFIG ======
const CONFIG = {
    topRenderer: 'LINEAR', // Simple linear crash game
    isCrashGameActive: false, // Track if crash game screen is expanded
    debugForceCaught: false // Debug: Force player to be caught by monster
};

// ====== DOM ELEMENTS ======
// Will be initialized after DOM is ready
let elements = {};

// ====== AUDIO CONTEXT (for sound effects) ======
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// ====== INITIALIZATION ======
function init() {
    // Initialize DOM elements after DOM is ready
    elements = {
        reelContainer: document.getElementById('reel-container'),
        spinBtn: document.getElementById('spin-btn'),
        startRunBtn: document.getElementById('start-run-btn'),
        betOptions: document.querySelectorAll('.bet-option'),
        legendCloseBtn: document.getElementById('legend-close-btn'),
        symbolLegend: document.getElementById('symbol-legend'),
        multiplierDisplay: document.getElementById('multiplier-display'),
        crashMessage: document.getElementById('crash-message'),
        bankedTotal: document.getElementById('banked-total'),
        bestRun: document.getElementById('best-run'),
        crashCanvas: document.getElementById('crashCanvas'),
        betAmount: document.getElementById('bet-amount'),
        symbolAnalysis: document.getElementById('symbol-analysis'),
        symbolBreakdown: document.getElementById('symbol-breakdown'),
        multiplierPotential: document.getElementById('multiplier-potential'),
        riskIndicator: document.getElementById('risk-indicator'),
        modeToggleBtn: document.getElementById('mode-toggle-btn'),
        transitionOverlay: document.getElementById('transition-overlay'),
        exitChoiceOverlay: document.getElementById('exit-choice-overlay'),
        cashoutChoiceBtn: document.getElementById('cashout-choice-btn'),
        continueChoiceBtn: document.getElementById('continue-choice-btn'),
        exitPot: document.getElementById('exit-pot'),
        exitNextLevel: document.getElementById('exit-next-level'),
        exitDanger: document.getElementById('exit-danger'),
        sideExitOverlay: document.getElementById('side-exit-overlay'),
        sideExitTakeBtn: document.getElementById('side-exit-take-btn'),
        sideExitContinueBtn: document.getElementById('side-exit-continue-btn'),
        sideExitTime: document.getElementById('side-exit-time'),
        sideExitAmount: document.getElementById('side-exit-amount'),
        sideExitPercent: document.getElementById('side-exit-percent'),
        sideExitTitle: document.getElementById('side-exit-title'),
        lootChoiceOverlay: document.getElementById('loot-choice-overlay'),
        lootTakeBtn: document.getElementById('loot-take-btn'),
        lootLeaveBtn: document.getElementById('loot-leave-btn'),
        lootTypeDisplay: document.getElementById('loot-type-display'),
        lootValue: document.getElementById('loot-value'),
        lootWeight: document.getElementById('loot-weight'),
        caughtOverlay: document.getElementById('caught-overlay'),
        caughtContinueBtn: document.getElementById('caught-continue-btn'),
        caughtDistance: document.getElementById('caught-distance'),
        debugBonusBtn: document.getElementById('debug-bonus-btn'),
        debugCatchBtn: document.getElementById('debug-catch-btn'),
        lowVolMeterFill: document.getElementById('low-vol-meter-fill'),
        lowVolMeterValue: document.getElementById('low-vol-meter-value'),
        highVolMeterFill: document.getElementById('high-vol-meter-fill'),
        highVolMeterValue: document.getElementById('high-vol-meter-value'),
        volatilityChoice: document.getElementById('volatility-choice-overlay'),
        chooseLowVolBtn: document.getElementById('choose-low-vol-btn'),
        chooseHighVolBtn: document.getElementById('choose-high-vol-btn'),
        volatilityChoiceLowVol: document.getElementById('volatility-choice-low-vol'),
        volatilityChoiceHighVol: document.getElementById('volatility-choice-high-vol')
    };
    
    // Store default screen sizes for later reference
    const topScreen = document.getElementById('top-screen');
    const bottomScreen = document.getElementById('bottom-screen');
    
    // Capture the ACTUAL initial computed styles from CSS
    const topInitialStyle = window.getComputedStyle(topScreen);
    const bottomInitialStyle = window.getComputedStyle(bottomScreen);
    
    // Store initial dimensions
    topScreen.dataset.defaultFlex = topInitialStyle.flex;
    bottomScreen.dataset.defaultFlex = bottomInitialStyle.flex;
    topScreen.dataset.defaultHeight = topScreen.offsetHeight + 'px';
    bottomScreen.dataset.defaultHeight = bottomScreen.offsetHeight + 'px';
    
    console.log('Initial layout captured:', {
        topFlex: topScreen.dataset.defaultFlex,
        bottomFlex: bottomScreen.dataset.defaultFlex,
        topHeight: topScreen.dataset.defaultHeight,
        bottomHeight: bottomScreen.dataset.defaultHeight
    });
    
    createReelGrid();
    loadGameData();
    updateUI();
    setupEventListeners();
    initCanvas();
}

function createReelGrid() {
    elements.reelContainer.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const cell = document.createElement('div');
        cell.className = 'reel-cell';
        cell.innerHTML = '<span class="symbol">?</span>';
        elements.reelContainer.appendChild(cell);
    }
}

function setupEventListeners() {
    elements.spinBtn.addEventListener('click', handleSpin);
    elements.startRunBtn.addEventListener('click', handleStartRun);
    
    // Bet selector buttons
    elements.betOptions.forEach(btn => {
        btn.addEventListener('click', handleBetChange);
    });
    
    // Symbol legend
    elements.legendCloseBtn.addEventListener('click', toggleSymbolLegend);
    elements.cashoutChoiceBtn.addEventListener('click', handleExitCashout);
    elements.continueChoiceBtn.addEventListener('click', handleExitContinue);
    elements.sideExitTakeBtn.addEventListener('click', handleSideExitTake);
    elements.sideExitContinueBtn.addEventListener('click', handleSideExitContinue);
    elements.lootTakeBtn.addEventListener('click', handleLootTake);
    elements.lootLeaveBtn.addEventListener('click', handleLootLeave);
    elements.caughtContinueBtn.addEventListener('click', handleCaughtContinue);
    elements.debugBonusBtn.addEventListener('click', debugTriggerBonus);
    elements.debugCatchBtn.addEventListener('click', toggleDebugCatch);
    elements.chooseLowVolBtn.addEventListener('click', () => handleVolatilityChoice('low'));
    elements.chooseHighVolBtn.addEventListener('click', () => handleVolatilityChoice('high'));
}

// ====== DEBUG: FORCE TRIGGER BONUS ======
function debugTriggerBonus() {
    if (gameState.isRunning) {
        showMessage('Already in a run!', '#ff0000');
        return;
    }
    
    console.log('🐛 DEBUG: Force triggering bonus');
    
    // Add points to both meters for testing
    gameState.lowVolMeter = Math.min(gameState.lowVolMeter + 10, 40);
    gameState.highVolMeter = Math.min(gameState.highVolMeter + 10, 40);
    updateMeterUI();
    
    // Create fake debug params using high vol mode
    const debugParams = calculateMazeParams('high');
    
    gameState.pendingParams = debugParams;
    displaySymbolAnalysis({ mazeParams: debugParams, lineWins: [], gameMode: 'high' });
    
    gameState.isWaitingToStart = true;
    elements.startRunBtn.disabled = false;
    
    showMessage('🐛 DEBUG: HIGH VOL Ready! START or ABORT?', '#ff00ff');
    playSound('bonus');
}

// ====== DEBUG: TOGGLE FORCE CAUGHT ======
function toggleDebugCatch() {
    CONFIG.debugForceCaught = !CONFIG.debugForceCaught;
    elements.debugCatchBtn.textContent = CONFIG.debugForceCaught ? '👹 CATCH: ON' : '👹 CATCH: OFF';
    elements.debugCatchBtn.style.backgroundColor = CONFIG.debugForceCaught ? '#ff0000' : '';
    console.log('🐛 DEBUG: Force caught mode', CONFIG.debugForceCaught ? 'ENABLED' : 'DISABLED');
}


// ====== HANDLE BET CHANGE ======
function handleBetChange(e) {
    // Don't allow bet changes during active gameplay
    if (gameState.isSpinning || gameState.isRunning || gameState.isWaitingToStart) {
        showMessage('Cannot change bet during active game!', '#ff0000');
        return;
    }
    
    const newBet = parseFloat(e.target.dataset.bet);
    gameState.betAmount = newBet;
    
    // Update active state on buttons
    elements.betOptions.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Update UI displays
    updateUI();
    
    // Format bet for button display
    const betDisplay = newBet === 0.50 ? '£0.50' : `£${newBet.toFixed(0)}`;
    elements.spinBtn.textContent = `🏃 GRAB ITEMS (${betDisplay})`;
    
    playSound('land', 0.3);
}

// ====== TOGGLE SYMBOL LEGEND ======
function toggleSymbolLegend() {
    elements.symbolLegend.classList.toggle('hidden');
    playSound('land', 0.3);
}

// ====== SPIN REELS ======
async function handleSpin() {
    if (gameState.isSpinning || gameState.isRunning || gameState.isWaitingToStart) return;
    if (gameState.bankedTotal < gameState.betAmount) {
        showMessage('Insufficient funds!', 'red');
        return;
    }

    gameState.isSpinning = true;
    gameState.bankedTotal -= gameState.betAmount;
    updateUI();
    elements.spinBtn.disabled = true;
    
    // Disable bet selector during spin
    elements.betOptions.forEach(btn => btn.disabled = true);

    playSound('spin');
    await spinReels();
    
    const result = evaluateSpin();
    
    // Highlight winning paylines
    if (result.lineWins && result.lineWins.length > 0) {
        await highlightWinningLines(result.lineWins);
    }
    
    // If bonus triggered, show analysis and enable decision
    if (result.bonusTriggered) {
        console.log('🎰 BONUS TRIGGERED!', result);
        
        // Check if player needs to choose volatility
        if (result.gameMode === 'choice') {
            // Show volatility choice overlay
            showVolatilityChoice();
        } else {
            // Auto-launch with determined game mode
            gameState.pendingParams = result.mazeParams;
            displaySymbolAnalysis(result);
            
            // Enable decision buttons
            gameState.isWaitingToStart = true;
            gameState.isSpinning = false;
            elements.startRunBtn.disabled = false;
            
            const modeText = result.gameMode === 'low' ? '🟢 LOW VOL' : '🔴 HIGH VOL';
            showMessage(`💥 CRASH TRIGGERED! ${modeText} - Click START ESCAPE to begin!`, '#ffaa00');
            playSound('bonus');
        }
    } else {
        // No bonus, just show line wins and continue
        gameState.isSpinning = false;
        elements.spinBtn.disabled = false;
        
        // Re-enable bet selector
        elements.betOptions.forEach(btn => btn.disabled = false);
        
        if (result.totalLinePayout === 0) {
            showMessage('No wins. Spin again!', '#888');
        }
        
        updateUI();
        saveGameData();
    }
}

function showVolatilityChoice() {
    // Show overlay for player to choose between low/high volatility
    gameState.isSpinning = false;
    elements.spinBtn.disabled = true;
    
    if (elements.volatilityChoice) {
        elements.volatilityChoice.classList.remove('hidden');
        elements.volatilityChoiceLowVol.textContent = gameState.lowVolMeter;
        elements.volatilityChoiceHighVol.textContent = gameState.highVolMeter;
    }
}

function handleVolatilityChoice(gameMode) {
    // Player chose low or high volatility
    if (elements.volatilityChoice) {
        elements.volatilityChoice.classList.add('hidden');
    }
    
    // Calculate maze params for chosen mode
    const mazeParams = calculateMazeParams(gameMode);
    gameState.pendingParams = mazeParams;
    
    // Show analysis and enable start/fold
    displaySymbolAnalysis({ mazeParams, lineWins: [], gameMode });
    
    gameState.isWaitingToStart = true;
    elements.startRunBtn.disabled = false;
    
    const modeText = gameMode === 'low' ? 'LOW VOL' : 'HIGH VOL';
    showMessage(`${modeText} Maze Ready! START or ABORT?`, '#ffaa00');
    playSound('bonus');
}

function handleStartRun() {
    if (!gameState.isWaitingToStart || !gameState.pendingParams) return;
    
    gameState.isWaitingToStart = false;
    elements.startRunBtn.disabled = true;
    
    // Play transition animation before starting crash game
    playTransitionAnimation(() => {
        startCrashRun(gameState.pendingParams);
    });
}

// Exit choice handlers (when player reaches maze exit)
function handleExitCashout() {
    // Player chooses to cash out
    elements.exitChoiceOverlay.classList.add('hidden');
    
    gameState.bankedTotal += gameState.mazePot;
    
    // Reset consumed meter based on which game mode was played
    if (gameState.pendingParams && gameState.pendingParams.gameMode) {
        if (gameState.pendingParams.gameMode === 'low') {
            gameState.lowVolMeter = 0;
        } else if (gameState.pendingParams.gameMode === 'high') {
            gameState.highVolMeter = 0;
        }
        updateMeterUI();
    }
    
    gameState.currentMazeLevel = 0; // Reset progression
    gameState.isRunning = false;
    gameState.canCashout = false;
    
    elements.spinBtn.disabled = false;
    
    // SHRINK chase screen back to normal (handles class removal)
    shrinkChaseScreen();
    
    showMessage(`Cashed out £${gameState.mazePot.toFixed(2)}! Safe escape!`, '#00ff00');
    playSound('win');
    
    // Update best run if applicable
    if (gameState.currentMultiplier > gameState.bestRun) {
        gameState.bestRun = gameState.currentMultiplier;
    }
    
    updateUI();
    saveGameData();
}

function handleExitContinue() {
    // Player chooses to go deeper
    elements.exitChoiceOverlay.classList.add('hidden');
    
    gameState.currentMazeLevel++;
    
    // Check if max level reached
    if (gameState.currentMazeLevel > 12) {
        // Won all mazes! Huge bonus
        gameState.mazePot *= 2;
        handleExitCashout();
        showMessage(`MAX LEVEL! Pot doubled to £${gameState.mazePot.toFixed(2)}!`, '#FFD700');
        return;
    }
    
    // Apply multiplier from tuning table
    const tuning = MAZE_TUNING[gameState.currentMazeLevel];
    const multIncrease = (tuning.multRange[0] + tuning.multRange[1]) / 2;
    gameState.mazePot *= (1 + multIncrease / 10); // Small increase per level
    
    // Restart heartbeat for next maze
    playSound('heartbeat', 0.5, true);
    
    // Generate next maze with increased difficulty
    generateNextMaze();
    
    // Special message for Gold Room (room 5)
    const currentRoom = mazeState.currentRoom;
    if (currentRoom === 5) {
        showMessage(`🏆 GOLD ROOM! 7 Gold Prizes! Pot: £${gameState.mazePot.toFixed(2)} 🏆`, '#FFD700');
    } else {
        showMessage(`Room ${currentRoom}/5 - Maze ${gameState.currentMazeLevel} | Pot: £${gameState.mazePot.toFixed(2)}`, '#ffaa00');
    }
}

// ====== SIDE EXIT HANDLERS ======
function showExitCheckpoint(checkpoint) {
    // Don't show if overlay is already visible
    if (!elements.sideExitOverlay.classList.contains('hidden')) {
        console.log('Overlay already visible, skipping');
        return;
    }
    
    // CRITICAL: Set pause flag and stop game immediately
    isExitChoicePending = true;
    gameState.isRunning = false;
    pauseStartTime = Date.now(); // Track when pause started
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    console.log('EXIT CHOICE PENDING - Animation should be FROZEN');
    
    // Count collected prizes
    const bronzeCount = gameState.collectedPrizes.filter(p => p.type === 'bronze').length;
    const silverCount = gameState.collectedPrizes.filter(p => p.type === 'silver').length;
    const goldCount = gameState.collectedPrizes.filter(p => p.type === 'gold').length;
    
    // Update overlay content
    const titleEl = document.getElementById('side-exit-title');
    const timeEl = document.getElementById('side-exit-time');
    const amountEl = document.getElementById('side-exit-amount');
    const percentEl = document.getElementById('side-exit-percent');
    
    if (titleEl) titleEl.textContent = `🚪 ${checkpoint.label}!`;
    if (timeEl) timeEl.textContent = `🥉${bronzeCount} 🥈${silverCount} 🥇${goldCount}`;
    if (amountEl) amountEl.textContent = gameState.totalCollected.toFixed(2);
    if (percentEl) percentEl.textContent = gameState.collectedPrizes.length;
    
    // Show overlay
    elements.sideExitOverlay.classList.remove('hidden');
    
    playSound('land', 0.7);
    
    console.log(`Showing exit: ${checkpoint.label} at ${gameState.currentMultiplier.toFixed(2)}m, gameState.isRunning:`, gameState.isRunning);
}

function handleSideExitTake() {
    console.log('TAKING EXIT - Stopping game completely');
    
    // Bank all collected prizes
    const payout = gameState.totalCollected;
    gameState.bankedTotal += payout;
    
    const bronzeCount = gameState.collectedPrizes.filter(p => p.type === 'bronze').length;
    const silverCount = gameState.collectedPrizes.filter(p => p.type === 'silver').length;
    const goldCount = gameState.collectedPrizes.filter(p => p.type === 'gold').length;
    
    // Clear pause flag and stop game
    isExitChoicePending = false;
    gameState.isRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    elements.sideExitOverlay.classList.add('hidden');
    
    // Reset consumed meter
    if (gameState.pendingParams && gameState.pendingParams.gameMode) {
        if (gameState.pendingParams.gameMode === 'low') {
            gameState.lowVolMeter = 0;
        } else if (gameState.pendingParams.gameMode === 'high') {
            gameState.highVolMeter = 0;
        }
        updateMeterUI();
    }
    
    gameState.currentMazeLevel = 0;
    gameState.canCashout = false;
    
    elements.spinBtn.disabled = false;
    
    // Shrink screen
    shrinkChaseScreen();
    
    showMessage(`${checkpoint.label} taken! Cashed out £${payout.toFixed(2)}!`, '#00ff00');
    playSound('win');
    
    updateUI();
    saveGameData();
}

function handleSideExitContinue() {
    console.log('CONTINUING RUN - Resuming animation');
    
    // Player continues running
    elements.sideExitOverlay.classList.add('hidden');
    
    showMessage(`Brave choice! Keep running!`, '#ffaa00');
    playSound('land', 0.5);
    
    // Adjust start time to account for pause duration
    // This prevents the animation from jumping ahead
    if (pauseStartTime) {
        const pauseDuration = Date.now() - pauseStartTime;
        crashRunStartTime += pauseDuration; // Push start time forward by pause duration
        console.log(`Adjusting for ${pauseDuration}ms pause`);
        pauseStartTime = null;
    }
    
    // Clear pause flag and resume
    isExitChoicePending = false;
    gameState.isRunning = true;
    
    console.log('Resuming: isPending:', isExitChoicePending, 'isRunning:', gameState.isRunning, 'frameId:', animationFrameId);
    
    // Restart animation if not already running
    if (linearAnimateFunction && !animationFrameId) {
        console.log('Calling linearAnimateFunction to restart');
        linearAnimateFunction();
    } else {
        console.log('NOT restarting - frameId exists or no function');
    }
}

function spinReels() {
    return new Promise((resolve) => {
        const cells = document.querySelectorAll('.reel-cell');
        gameState.symbols = [];

        // Start spinning animation
        cells.forEach(cell => cell.classList.add('spinning'));

        // Generate random symbols
        const symbolKeys = Object.keys(SYMBOLS);
        const weightedSymbols = [];
        
        // Create weighted pool
        symbolKeys.forEach(key => {
            const symbol = SYMBOLS[key];
            for (let i = 0; i < symbol.weight; i++) {
                weightedSymbols.push(symbol);
            }
        });

        // Pre-generate all 20 symbols
        const allSymbols = [];
        for (let i = 0; i < 20; i++) {
            allSymbols.push(weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)]);
        }
        gameState.symbols = allSymbols;

        // Reveal reels left-to-right (reel by reel like a real slot)
        // Grid is [row][col], 5 columns (reels) × 4 rows
        let currentReel = 0;
        const reelInterval = setInterval(() => {
            if (currentReel >= 5) {
                clearInterval(reelInterval);
                resolve();
                return;
            }

            // Reveal all 4 symbols in this reel (column) simultaneously
            for (let row = 0; row < 4; row++) {
                const cellIndex = row * 5 + currentReel;
                const cell = cells[cellIndex];
                const symbol = allSymbols[cellIndex];

                cell.classList.remove('spinning');
                
                // Display point symbols with value overlay
                if (symbol.pointValue) {
                    cell.innerHTML = `
                        <span class="symbol">${symbol.emoji}</span>
                        <span class="point-value">${symbol.pointValue}</span>
                    `;
                } else {
                    cell.innerHTML = `<span class="symbol">${symbol.emoji}</span>`;
                }
                
                cell.setAttribute('data-type', symbol.name);
            }

            playSound('land', 0.3);
            currentReel++;
        }, 200); // 200ms between each reel landing (slower for better visibility)
    });
}

// ====== HIGHLIGHT WINNING PAYLINES ======
async function highlightWinningLines(lineWins) {
    const cells = document.querySelectorAll('.reel-cell');
    
    // Show each winning line one by one
    for (const win of lineWins) {
        // Clear previous highlights
        cells.forEach(cell => cell.classList.remove('winning'));
        
        // Highlight this line's positions (use win.positions directly)
        win.positions.forEach(([row, col]) => {
            const cellIndex = row * 5 + col;
            cells[cellIndex].classList.add('winning');
        });
        
        // Show which line won
        const lineMsg = `Line ${win.lineIndex + 1}: ${win.count}x ${win.symbol.emoji} = £${(win.payout * gameState.betAmount).toFixed(2)}`;
        showMessage(lineMsg, '#ffd700');
        playSound('win', 0.4);
        
        // Wait before showing next line
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
    
    // Clear all highlights after showing all lines
    cells.forEach(cell => cell.classList.remove('winning'));
}

// ====== EVALUATE SPIN ======
function evaluateSpin() {
    // Convert symbols array to 2D grid [row][col]
    const grid = [];
    for (let row = 0; row < 4; row++) {
        grid[row] = [];
        for (let col = 0; col < 5; col++) {
            grid[row][col] = gameState.symbols[row * 5 + col];
        }
    }

    // Check all paylines for wins
    const lineWins = calculateLineWins(grid);
    
    // Calculate total line win payout
    let totalLinePayout = 0;
    lineWins.forEach(win => {
        totalLinePayout += win.payout * gameState.betAmount;
    });

    // Count point symbols and check for crash symbol
    let lowVolPoints = 0;
    let highVolPoints = 0;
    let hasCrashSymbol = false;
    
    gameState.symbols.forEach(symbol => {
        if (symbol.pointValue && symbol.meterType === 'low') {
            lowVolPoints += symbol.pointValue;
        } else if (symbol.pointValue && symbol.meterType === 'high') {
            highVolPoints += symbol.pointValue;
        } else if (symbol.isCrash) {
            hasCrashSymbol = true;
        }
    });
    
    // Update meters (cap at 40)
    const METER_MAX = 40;
    gameState.lowVolMeter = Math.min(gameState.lowVolMeter + lowVolPoints, METER_MAX);
    gameState.highVolMeter = Math.min(gameState.highVolMeter + highVolPoints, METER_MAX);
    
    console.log(`Meter Update: Low +${lowVolPoints} = ${gameState.lowVolMeter}, High +${highVolPoints} = ${gameState.highVolMeter}`);
    updateMeterUI();  // Update visual meters
    
    // Check if either meter hit max (auto-trigger)
    let bonusTriggered = false;
    let gameMode = null;
    let mazeParams = null;
    
    if (gameState.lowVolMeter >= METER_MAX) {
        bonusTriggered = true;
        gameMode = 'low';
        console.log('Low Vol meter maxed out - auto-triggering!');
    } else if (gameState.highVolMeter >= METER_MAX) {
        bonusTriggered = true;
        gameMode = 'high';
        console.log('High Vol meter maxed out - auto-triggering!');
    } else if (hasCrashSymbol) {
        // Crash symbol landed - determine which game to launch
        bonusTriggered = true;
        
        if (gameState.lowVolMeter > gameState.highVolMeter) {
            gameMode = 'low';
            console.log(`Crash symbol! Launching Low Vol (${gameState.lowVolMeter} > ${gameState.highVolMeter})`);
        } else if (gameState.highVolMeter > gameState.lowVolMeter) {
            gameMode = 'high';
            console.log(`Crash symbol! Launching High Vol (${gameState.highVolMeter} > ${gameState.lowVolMeter})`);
        } else if (gameState.lowVolMeter === gameState.highVolMeter && gameState.lowVolMeter > 0) {
            // Meters are equal - player chooses
            console.log(`Crash symbol! Meters equal (${gameState.lowVolMeter}) - player chooses`);
            gameMode = 'choice';
        } else {
            // Both meters at 0 - no game
            bonusTriggered = false;
            console.log('Crash symbol but both meters at 0 - no game');
        }
    }
    
    // If bonus triggered, calculate maze parameters based on mode
    if (bonusTriggered && gameMode && gameMode !== 'choice') {
        mazeParams = calculateMazeParams(gameMode);
    }

    // Pay out line wins immediately
    if (totalLinePayout > 0) {
        gameState.bankedTotal += totalLinePayout;
        showMessage(`Line Wins: £${totalLinePayout.toFixed(2)}!`, '#00ff00');
        playSound('win');
    }

    console.log('Spin Evaluation:', {
        lineWins,
        totalLinePayout: totalLinePayout.toFixed(2),
        bonusTriggered,
        gameMode,
        lowVolPoints,
        highVolPoints,
        hasCrashSymbol
    });

    return {
        lineWins,
        totalLinePayout,
        bonusTriggered,
        mazeParams,
        gameMode  // 'low', 'high', or 'choice'
    };
}

// Calculate line wins across all paylines
function calculateLineWins(grid) {
    const wins = [];

    PAYLINES.forEach((line, lineIndex) => {
        const symbols = line.map(([row, col]) => grid[row][col]);
        
        // Count consecutive symbols from left to right
        let matchCount = 1;
        let matchSymbol = symbols[0];
        
        // Handle wilds
        if (matchSymbol.isWild) {
            // Find first non-wild
            for (let i = 1; i < symbols.length; i++) {
                if (!symbols[i].isWild) {
                    matchSymbol = symbols[i];
                    break;
                }
            }
        }

        for (let i = 1; i < symbols.length; i++) {
            const current = symbols[i];
            if (current.name === matchSymbol.name || current.isWild) {
                matchCount++;
            } else {
                break;
            }
        }

        // Check if we have a valid win (need at least 3 matching)
        if (matchCount >= 3 && matchSymbol.pays && matchSymbol.pays[matchCount - 1] > 0) {
            const payout = matchSymbol.pays[matchCount - 1];
            wins.push({
                lineIndex,
                symbol: matchSymbol,
                count: matchCount,
                payout,
                positions: line.slice(0, matchCount)
            });
        }
    });

    return wins;
}

// Calculate maze parameters from special symbols on grid
function calculateMazeParams(gameMode) {
    // gameMode is 'low' or 'high'
    const isLowVol = gameMode === 'low';
    const meterPoints = isLowVol ? gameState.lowVolMeter : gameState.highVolMeter;
    
    // Determine starting maze level (keep existing progression)
    const mazeLevel = gameState.currentMazeLevel > 0 ? gameState.currentMazeLevel : 1;
    
    // Calculate starting pot based on volatility and meter points
    let basePotMultiplier, monsterSpeedMod, lootMultiplierMin, lootMultiplierMax;
    
    if (isLowVol) {
        // LOW VOLATILITY: Safer, smaller prizes
        basePotMultiplier = 1.0;  // Start at 1x bet (proper crash game stakes)
        monsterSpeedMod = 0.5;  // Monster 50% slower
        lootMultiplierMin = 0.3;
        lootMultiplierMax = 1.0;
    } else {
        // HIGH VOLATILITY: Riskier, bigger prizes
        basePotMultiplier = 1.0;  // Start at 1x bet (proper crash game stakes)
        monsterSpeedMod = 1.2;  // Monster 20% faster
        lootMultiplierMin = 2.0;
        lootMultiplierMax = 8.0;
    }
    
    // Starting pot = bet amount × (1 + meter bonus)
    // More points in meter = small starting bonus (max +100% at 40 points)
    const meterBonus = meterPoints / 40; // 0 to 1.0
    const startPot = basePotMultiplier * gameState.betAmount * (1 + meterBonus);
    
    const lootDensity = lootMultiplierMin + Math.random() * (lootMultiplierMax - lootMultiplierMin);
    
    gameState.currentMazeLevel = mazeLevel;
    gameState.mazePot = startPot;
    
    // Generate crash point for linear mode (distance in meters before caught)
    // Adjusted for 97% RTP - crash points calibrated for fair gameplay
    // Low vol: 18-28m (avg ~23m), High vol: 22-42m (avg ~32m)
    const minCrash = isLowVol ? 18 : 22;
    const maxCrash = isLowVol ? 28 : 42;
    const crashPoint = minCrash + Math.random() * (maxCrash - minCrash);

    console.log(`Maze Params: ${gameMode.toUpperCase()} VOL, Meter: ${meterPoints}, Starting Pot: £${startPot.toFixed(2)} (${(startPot/gameState.betAmount).toFixed(2)}x bet), Monster Speed Mod: ${monsterSpeedMod}x, Crash Point: ${crashPoint.toFixed(2)}m`);

    return {
        mazeLevel,
        startPot,
        crashPoint,
        playerSpeed: 1.00,  // Base player speed
        monsterSpeed: monsterSpeedMod,  // Multiplier for monster speed
        lootDensity,
        sanctuaryCount: 0,
        gameMode,
        meterPoints
    };
}

// ====== DISPLAY SYMBOL ANALYSIS ======
function displaySymbolAnalysis(result) {
    const { mazeParams, lineWins } = result;
    
    // Show analysis panel
    elements.symbolAnalysis.classList.remove('hidden');
    
    // Clear previous breakdown
    elements.symbolBreakdown.innerHTML = '';
    
    // Display line wins first
    if (lineWins && lineWins.length > 0) {
        lineWins.forEach(win => {
            const winDiv = document.createElement('div');
            winDiv.className = 'symbol-count highlight';
            winDiv.innerHTML = `
                <span class="emoji">${win.symbol.emoji}</span>
                <span class="name">${win.count}x ${win.symbol.name}</span>
                <span class="count">£${(win.payout * gameState.betAmount).toFixed(2)}</span>
            `;
            elements.symbolBreakdown.appendChild(winDiv);
        });
    }

    // Display maze parameters
    if (mazeParams) {
        const tuning = MAZE_TUNING[mazeParams.mazeLevel];
        
        elements.multiplierPotential.textContent = `Maze ${mazeParams.mazeLevel} - £${mazeParams.startPot.toFixed(2)}`;
        
        let riskText, riskClass;
        const crashProb = tuning.crashProb;
        if (crashProb < 0.3) {
            riskText = '🟢 SAFE';
            riskClass = 'low';
        } else if (crashProb < 0.6) {
            riskText = '🟡 DANGEROUS';
            riskClass = 'medium';
        } else {
            riskText = '🔴 DEADLY';
            riskClass = 'high';
        }
        
        elements.riskIndicator.textContent = riskText;
        elements.riskIndicator.className = `value ${riskClass}`;

        // Show modifier summary
        const modDiv = document.createElement('div');
        modDiv.className = 'symbol-count';
        modDiv.innerHTML = `
            <span class="name">Player Speed:</span>
            <span class="count">${(mazeParams.playerSpeed * 100).toFixed(0)}%</span>
        `;
        elements.symbolBreakdown.appendChild(modDiv);

        if (mazeParams.sanctuaryCount > 0) {
            const sanctDiv = document.createElement('div');
            sanctDiv.className = 'symbol-count';
            sanctDiv.innerHTML = `
                <span class="emoji">🔦</span>
                <span class="name">Sanctuaries:</span>
                <span class="count">${mazeParams.sanctuaryCount}</span>
            `;
            elements.symbolBreakdown.appendChild(sanctDiv);
        }
    }
    
    // Play analysis sound
    playSound('analyze');
}

// ====== CRASH RUN ANIMATION ======
let animationFrameId = null;
let crashRunStartTime = null;
let pauseStartTime = null;
let linearAnimateFunction = null; // Store reference to animation loop
let isExitChoicePending = false; // Flag to prevent animation during exit choice

function startLinearRun(params) {
    gameState.isSpinning = false;
    gameState.isRunning = true;
    gameState.canCashout = true;
    gameState.currentMultiplier = 1.00;
    gameState.crashPoint = params.crashPoint;
    
    // Hide analysis panel
    elements.symbolAnalysis.classList.add('hidden');
    
    elements.multiplierDisplay.classList.remove('crashed');
    elements.crashMessage.classList.remove('show');
    elements.crashMessage.textContent = '';
    document.body.classList.add('running');
    document.body.classList.remove('crashed');
    
    // EXPAND chase screen for crash game
    expandChaseScreen();
    
    // Ensure canvas is initialized
    if (!ctx) {
        initCanvas();
    }

    // DON'T start timer yet - wait for screen expansion to complete!
    // crashRunStartTime will be set after a delay
    const startValue = 0.00; // Start at 0 meters
    const endValue = params.crashPoint + 10; // Go a bit beyond crash point for animation
    const duration = 30000; // 30 seconds - slower, more strategic gameplay
    
    // Initialize exit checkpoints and prizes - doors randomly spaced (5-10m apart)
    gameState.exitCheckpoints = [];
    gameState.collectedPrizes = [];
    gameState.totalCollected = 0;
    
    // Start first door at 10-15m to give player more breathing room at start
    let nextDoorDistance = 10 + Math.random() * 5; // Start 10-15m in (gives ~10-15 seconds)
    
    // Generate prizes between doors (bronze, silver, gold)
    function generatePrizesBetween(startDist, endDist) {
        const prizes = [];
        const distance = endDist - startDist;
        const numPrizes = Math.floor(distance / 2.5) + Math.floor(Math.random() * 2); // Fewer prizes: ~1-2 per segment
        
        for (let i = 0; i < numPrizes; i++) {
            const prizeDistance = startDist + (distance * (i + 1) / (numPrizes + 1));
            const rand = Math.random();
            let prizeType, prizeValue;
            
            if (rand < 0.6) { // 60% bronze
                prizeType = 'bronze';
                prizeValue = 0.10 + Math.random() * 0.20; // £0.10-£0.30
            } else if (rand < 0.9) { // 30% silver
                prizeType = 'silver';
                prizeValue = 0.30 + Math.random() * 0.50; // £0.30-£0.80
            } else { // 10% gold
                prizeType = 'gold';
                prizeValue = 0.80 + Math.random() * 1.20; // £0.80-£2.00
            }
            
            prizes.push({
                distance: prizeDistance,
                type: prizeType,
                value: prizeValue,
                collected: false
            });
        }
        return prizes;
    }
    
    // Generate all prizes along the path
    gameState.allPrizes = [];
    let lastDoorDistance = 0;
    
    // IMPORTANT: Generate doors and prizes WAY BEYOND crash point to hide the end!
    // Generate to at least 3x the crash point to ensure always content ahead
    const generationLimit = Math.max(params.crashPoint * 3, 150); // Generate to 3x crash or 150m minimum
    
    while (nextDoorDistance < generationLimit) {
        // Generate prizes before this door
        const prizesSegment = generatePrizesBetween(lastDoorDistance, nextDoorDistance);
        gameState.allPrizes.push(...prizesSegment);
        
        gameState.exitCheckpoints.push({
            multiplier: nextDoorDistance,
            triggered: false,
            label: `EXIT ${Math.floor(nextDoorDistance)}m`,
            isFake: nextDoorDistance > params.crashPoint // Mark doors beyond crash as fake (unreachable)
        });
        
        lastDoorDistance = nextDoorDistance;
        nextDoorDistance += 5 + Math.random() * 5; // Random spacing: 5-10 meters
    }
    
    // Generate final segment of prizes beyond last door
    const finalPrizes = generatePrizesBetween(lastDoorDistance, generationLimit);
    gameState.allPrizes.push(...finalPrizes);
    
    gameState.nextCheckpointIndex = 0;
    gameState.nextPrizeIndex = 0;
    
    console.log(`Generated ${gameState.exitCheckpoints.length} exit doors up to ${generationLimit.toFixed(2)}m (crash at ${params.crashPoint.toFixed(2)}m)`);

    playSound('heartbeat', 0.5, true);
    
    console.log('Starting linear crash run with crash point:', params.crashPoint);

    function animate() {
        // CRITICAL: Check pause flag first - STOP EVERYTHING
        if (isExitChoicePending) {
            console.log('EXIT CHOICE PENDING - BLOCKED ANIMATION FRAME');
            return; // Do NOT request another frame
        }
        
        if (!gameState.isRunning) {
            // Stop animation completely
            if (animationFrameId) {
                console.log('Stopping animation, cancelling frame:', animationFrameId);
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            console.log('Animation stopped, isRunning:', gameState.isRunning);
            return;
        }

        const elapsed = Date.now() - crashRunStartTime;
        const progress = Math.min(elapsed / duration, 1);

        // Exponential growth curve
        const currentMultiplier = startValue + (endValue - startValue) * Math.pow(progress, 0.7);
        gameState.currentMultiplier = currentMultiplier;

        elements.multiplierDisplay.textContent = currentMultiplier.toFixed(2) + 'm'; // meters escaped

        // Removed threat level hints - don't give away proximity to crash!

        // Check for prize collection
        if (gameState.allPrizes && gameState.nextPrizeIndex < gameState.allPrizes.length) {
            const nextPrize = gameState.allPrizes[gameState.nextPrizeIndex];
            if (!nextPrize.collected && currentMultiplier >= nextPrize.distance) {
                nextPrize.collected = true;
                gameState.collectedPrizes.push(nextPrize);
                gameState.totalCollected += nextPrize.value;
                gameState.nextPrizeIndex++;
                
                // Show floating prize notification
                const emoji = nextPrize.type === 'gold' ? '🥇' : nextPrize.type === 'silver' ? '🥈' : '🥉';
                const color = nextPrize.type === 'gold' ? '#FFD700' : nextPrize.type === 'silver' ? '#C0C0C0' : '#CD7F32';
                showMessage(`${emoji} +£${nextPrize.value.toFixed(2)}`, color);
                playSound('land', 0.3);
            }
        }
        
        // Draw on canvas
        drawCrashGraph(progress, currentMultiplier, params.crashPoint);
        
        // Check for exit checkpoints - trigger when runner reaches the exact checkpoint position
        if (gameState.exitCheckpoints && gameState.nextCheckpointIndex < gameState.exitCheckpoints.length) {
            const nextCheckpoint = gameState.exitCheckpoints[gameState.nextCheckpointIndex];
            const tolerance = 0.5; // Small tolerance in meters
            if (!nextCheckpoint.triggered && currentMultiplier >= (nextCheckpoint.multiplier - tolerance)) {
                console.log(`Triggering exit at ${currentMultiplier.toFixed(2)}m, target: ${nextCheckpoint.multiplier.toFixed(2)}m`);
                nextCheckpoint.triggered = true;
                gameState.nextCheckpointIndex++;
                
                // Show exit option (this will stop the animation)
                showExitCheckpoint(nextCheckpoint);
                return; // Exit immediately - DO NOT request next frame
            }
        }

        // Check if we've hit crash point
        if (currentMultiplier >= params.crashPoint) {
            crash();
            return; // DO NOT request next frame
        }
        
        // Only request next frame if still running
        if (gameState.isRunning) {
            animationFrameId = requestAnimationFrame(animate);
        }
    }
    
    // Store reference for resuming
    linearAnimateFunction = animate;
    
    // Wait for screen expansion animation to complete before starting timer and animation
    // This prevents the game from running while transition is still playing
    setTimeout(() => {
        crashRunStartTime = Date.now(); // Start timer NOW
        animate(); // Start animation loop NOW
    }, 1000); // 1 second delay to ensure everything is visible and ready
}

// Start the crash run in linear mode
function startCrashRun(params) {
    startLinearRun(params);
}

// ====== CANVAS DRAWING ======
let ctx = null;
let crashHistory = [];

function initCanvas() {
    const canvas = elements.crashCanvas;
    const dpr = window.devicePixelRatio || 1;
    
    // Set display size (css pixels)
    const rect = canvas.getBoundingClientRect();
    
    // Set actual size in memory (scaled for DPI)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx = canvas.getContext('2d');
    
    // Scale all drawing operations by the dpr
    ctx.scale(dpr, dpr);
    
    // Resize canvas on window resize or orientation change
    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    };
    
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
}

function drawCrashGraph(progress, currentMultiplier, crashPoint) {
    if (!ctx) return;
    
    // CRITICAL: Do not draw if exit choice is pending
    if (isExitChoicePending) {
        console.log('BLOCKED DRAW - Exit choice pending');
        return;
    }

    const canvas = elements.crashCanvas;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Dark horror corridor background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Add perspective lines (corridor walls)
    ctx.strokeStyle = 'rgba(139, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // FULL JOURNEY VIEW - Always show from 0 to current distance
    // The bar zooms out as we progress, never scrolls/crops the past
    // Left = 0m (start), Runner moves left->right showing full journey
    
    // Add buffer for beyond current position to hide fake content
    const maxDistance = Math.max(currentMultiplier + 20, 50); // Show 20m ahead or min 50m
    
    // Scale: fit entire journey (0 to maxDistance) into canvas width
    const scale = width / maxDistance;
    
    // Map distance to X position (simple scaling from 0)
    function distToX(dist) {
        return dist * scale;
    }
    
    // Map distance to Y position (exponential curve for visual interest)
    function distToY(dist) {
        const curveProgress = dist / maxDistance;
        const curveHeight = Math.pow(curveProgress, 0.7); // Exponential curve
        return height - (curveHeight * height);
    }
    
    // Runner position
    const runnerX = distToX(currentMultiplier);
    const runnerY = distToY(currentMultiplier);

    // Draw the full path from 0 to current position
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#ffaa00');
    gradient.addColorStop(1, '#ffaa00');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Draw the full line from 0 to current position
    ctx.beginPath();
    ctx.moveTo(0, height); // Start at bottom left (0m)
    
    // Sample points along the journey up to current position
    for (let dist = 0; dist <= currentMultiplier; dist += 0.5) {
        const px = distToX(dist);
        const py = distToY(dist);
        ctx.lineTo(px, py);
    }
    
    // Ensure line connects to runner
    ctx.lineTo(runnerX, runnerY);
    ctx.stroke();
    
    // Draw distance traveled overlay (top left)
    ctx.save();
    ctx.fillStyle = '#ffaa00';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 24px Arial';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffaa00';
    
    const distanceText = `🏃 ${currentMultiplier.toFixed(1)}m`; // Don't show crash point!
    const textMetrics = ctx.measureText(distanceText);
    const padding = 15;
    
    // Semi-transparent background
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, textMetrics.width + padding * 2, 40);
    
    // Text with outline
    ctx.fillStyle = '#ffaa00';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffaa00';
    ctx.strokeText(distanceText, 10 + padding, 38);
    ctx.fillText(distanceText, 10 + padding, 38);
    ctx.restore();
    
    // Draw prize collection overlay (top right)
    ctx.save();
    const bronzeCount = gameState.collectedPrizes.filter(p => p.type === 'bronze').length;
    const silverCount = gameState.collectedPrizes.filter(p => p.type === 'silver').length;
    const goldCount = gameState.collectedPrizes.filter(p => p.type === 'gold').length;
    
    const prizeText = `🥉${bronzeCount} 🥈${silverCount} 🥇${goldCount} | £${gameState.totalCollected.toFixed(2)}`;
    const prizeMetrics = ctx.measureText(prizeText);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(width - prizeMetrics.width - padding * 2 - 10, 10, prizeMetrics.width + padding * 2, 40);
    
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 20px Arial';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFD700';
    ctx.strokeText(prizeText, width - prizeMetrics.width - padding - 10, 38);
    ctx.fillText(prizeText, width - prizeMetrics.width - padding - 10, 38);
    ctx.restore();
    
    // Draw prizes along the path (only those visible in current scale)
    if (gameState.allPrizes) {
        for (let i = 0; i < gameState.allPrizes.length; i++) {
            const prize = gameState.allPrizes[i];
            
            // Only draw if prize is within visible range and not collected
            if (prize.distance <= maxDistance && !prize.collected) {
                const prizeX = distToX(prize.distance);
                const prizeY = distToY(prize.distance);
                
                // Floating animation
                const floatOffset = Math.sin(Date.now() / 500 + i) * 3;
                
                // Prize color and emoji
                let emoji, color, glow;
                if (prize.type === 'gold') {
                    emoji = '🥇';
                    color = '#FFD700';
                    glow = 20;
                } else if (prize.type === 'silver') {
                    emoji = '🥈';
                    color = '#C0C0C0';
                    glow = 15;
                } else {
                    emoji = '🥉';
                    color = '#CD7F32';
                    glow = 10;
                }
                
                ctx.shadowBlur = glow;
                ctx.shadowColor = color;
                ctx.font = 'bold 20px Arial';
                ctx.fillText(emoji, prizeX - 10, prizeY + floatOffset);
                ctx.shadowBlur = 0;
            }
        }
    }
    
    // Draw exit checkpoint markers
    if (gameState.exitCheckpoints) {
        for (let i = 0; i < gameState.exitCheckpoints.length; i++) {
            const checkpoint = gameState.exitCheckpoints[i];
            
            // Only draw if checkpoint is within visible range
            if (checkpoint.multiplier <= maxDistance) {
                const checkpointX = distToX(checkpoint.multiplier);
                const checkpointY = distToY(checkpoint.multiplier);
                
                // Pulsing effect
                const pulse = checkpoint.triggered ? 0.3 : 0.7 + Math.sin(Date.now() / 300) * 0.3;
                
                // Color based on checkpoint
                let color = i === 0 ? '#00aaff' : i === 1 ? '#ffaa00' : '#00ff00';
                if (checkpoint.triggered) color = '#555';
                
                // Draw glowing marker
                ctx.shadowBlur = checkpoint.triggered ? 0 : 30;
                ctx.shadowColor = color;
                ctx.fillStyle = color;
                ctx.globalAlpha = pulse;
                ctx.font = 'bold 28px Arial';
                ctx.fillText('🚪', checkpointX - 14, checkpointY + 10);
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            }
        }
    }

    // Draw survivor sprite at current position
    ctx.fillStyle = '#ffaa00';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffaa00';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('🏃', runnerX - 12, runnerY + 8);
    ctx.shadowBlur = 0;

    // ====== SUBTLE HORROR - Random Light System ======
    // Keep lighting constant - no frequency changes based on distance!
    const lightChance = 0.10; // Fixed 10% chance per frame
    
    if (Math.random() < lightChance) {
        // Random light position along the path
        const lightDist = Math.random() * maxDistance;
        const lightX = distToX(lightDist);
        const isAhead = lightDist > currentMultiplier;
        
        // Draw light cone
        const lightGradient = ctx.createRadialGradient(lightX, height * 0.3, 0, lightX, height * 0.3, 150);
        lightGradient.addColorStop(0, 'rgba(255, 200, 100, 0.3)');
        lightGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.1)');
        lightGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = lightGradient;
        ctx.fillRect(lightX - 150, 0, 300, height);
        
        // ONLY if light is BEHIND player, MAYBE show a glimpse (constant chance)
        if (!isAhead && Math.random() < 0.4) {
            // Show monster shadow/silhouette in the light - constant visibility
            const shadowDistance = lightX + (Math.random() * 40 - 20);
            const shadowY = height * 0.5 + (Math.random() * 60 - 30);
            
            ctx.fillStyle = `rgba(60, 0, 0, 0.6)`;
            ctx.beginPath();
            ctx.ellipse(shadowDistance, shadowY, 30, 40, 0, 0, Math.PI * 2);
            ctx.fill();
            
            if (Math.random() < 0.5) {
                ctx.fillStyle = `rgba(255, 0, 0, 0.8)`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff0000';
                ctx.beginPath();
                ctx.arc(shadowDistance - 8, shadowY - 8, 4, 0, Math.PI * 2);
                ctx.arc(shadowDistance + 8, shadowY - 8, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }
    // Removed background pulse - was giving away proximity to crash!
    // No safe zone indicator - player should never know where crash point is!
}

// ====== GAME ACTIONS ======
function crash() {
    gameState.isRunning = false;
    gameState.canCashout = false;
    
    // Reset consumed meter based on which game mode was played
    if (gameState.pendingParams && gameState.pendingParams.gameMode) {
        if (gameState.pendingParams.gameMode === 'low') {
            gameState.lowVolMeter = 0;
        } else if (gameState.pendingParams.gameMode === 'high') {
            gameState.highVolMeter = 0;
        }
        updateMeterUI();
    }
    
    // DON'T shrink screen yet - keep crash game visible while showing caught overlay
    // Screen will shrink when player clicks "Try Again"
    
    // Add crashed state
    document.body.classList.add('crashed');
    elements.multiplierDisplay.classList.add('crashed');
    
    // Generate random leaderboard
    generateFakeLeaderboard();
    
    // Show caught overlay
    elements.caughtDistance.textContent = gameState.currentMultiplier.toFixed(2);
    elements.caughtOverlay.classList.remove('hidden');

    showMessage(`CAUGHT! Monster got you at ${gameState.currentMultiplier.toFixed(2)}m!`, '#ff0000');
    playSound('monsterCatch');

    // Red flash effect on canvas
    const canvas = elements.crashCanvas;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw monster attack
    ctx.fillStyle = '#ff0000';
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#ff0000';
    ctx.font = 'bold 80px Arial';
    ctx.fillText('👹', rect.width / 2 - 40, rect.height / 2 + 20);
    ctx.shadowBlur = 0;

    setTimeout(() => {
        document.body.classList.remove('crashed');
    }, 1000);

    saveGameData();
    updateUI();
}

// ====== FAKE LEADERBOARD GENERATOR ======
function generateFakeLeaderboard() {
    const playerNames = [
        '💀 DarkRunner', '🔥 SpeedDemon', '⚡ LuckyEscape', '👑 GoldHunter', '🎯 ProRunner',
        '💎 DiamondHands', '🌟 StarPlayer', '⚔️ BladeMaster', '🏃 FastFeet', '💰 CashKing',
        '🦅 EagleEye', '🐺 LoneWolf', '🎲 RiskyBusiness', '🔮 MysticRunner', '🏆 ChampRunner',
        '🎪 Showstopper', '🌙 MidnightRun', '☠️ SkullCrusher', '🎭 PhantomRun', '🦇 NightHunter'
    ];
    
    // Generate 5 random winners with decreasing prizes
    const basePrize = 2000 + Math.random() * 8000; // $2k - $10k for top winner
    const winners = [];
    
    for (let i = 0; i < 5; i++) {
        const randomName = playerNames[Math.floor(Math.random() * playerNames.length)];
        const prize = basePrize * (1 - i * 0.25) + (Math.random() * 500); // Each place ~25% less
        winners.push({
            name: randomName,
            prize: prize
        });
    }
    
    // Update leaderboard entries
    for (let i = 0; i < 5; i++) {
        const entry = document.getElementById(`leader-${i + 1}`);
        if (entry) {
            const nameSpan = entry.querySelector('.player-name');
            const prizeSpan = entry.querySelector('.prize');
            
            nameSpan.textContent = winners[i].name;
            prizeSpan.textContent = `£${winners[i].prize.toFixed(2)}`;
        }
    }
}

// ====== SCREEN SIZING ======
// ====== TRANSITION ANIMATION ======
function playTransitionAnimation(callback) {
    // Show transition overlay
    elements.transitionOverlay.classList.remove('hidden');
    
    // Fade in
    setTimeout(() => {
        elements.transitionOverlay.classList.add('show');
    }, 50);
    
    // Play sound
    playSound('bonus', 0.7);
    
    // Wait for transition to complete
    setTimeout(() => {
        // Fade out transition
        elements.transitionOverlay.classList.remove('show');
        setTimeout(() => {
            elements.transitionOverlay.classList.add('hidden');
            
            // Wait longer after transition fades out before starting game
            setTimeout(() => {
                if (callback) callback();
            }, 800); // Extra 800ms pause after transition for smoother start
        }, 500);
    }, 2500); // Show transition for 2.5 seconds (increased from 2s)
}

function expandChaseScreen() {
    // Don't expand if already active
    if (CONFIG.isCrashGameActive) {
        console.log('Crash game already active, skipping expand');
        return;
    }
    
    // Add crash-active class - CSS handles the rest with absolute positioning
    document.body.classList.add('crash-active');
    
    // Mark as active
    CONFIG.isCrashGameActive = true;
    
    console.log('Expanding: body.crash-active added | Crash game now ACTIVE');
    
    // Resize canvas to fit new dimensions after transition
    setTimeout(() => {
        const canvas = elements.crashCanvas;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }, 650);
}

function shrinkChaseScreen() {
    // Only shrink if crash game is currently active
    if (!CONFIG.isCrashGameActive) {
        console.log('Crash game not active, skipping shrink');
        return;
    }
    
    // Remove all crash-related classes - CSS handles the rest
    document.body.classList.remove('crash-active');
    document.body.classList.remove('running');
    document.body.classList.remove('crashed');
    
    // Mark as inactive
    // Mark as inactive
    CONFIG.isCrashGameActive = false;
    
    console.log('Shrinking: body.crash-active removed | Crash game now INACTIVE');
    
    // Resize canvas after transition
    setTimeout(() => {
        const canvas = elements.crashCanvas;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }, 650);
}

// ====== UI UPDATES ======
function updateUI() {
    elements.bankedTotal.textContent = gameState.bankedTotal.toFixed(2);
    elements.bestRun.textContent = gameState.bestRun.toFixed(2) + 'm';
    elements.betAmount.textContent = gameState.betAmount.toFixed(2);
}

function updateMeterUI() {
    // Update meter values and fill bars
    const METER_MAX = 40;
    
    if (elements.lowVolMeterFill) {
        const lowPercent = (gameState.lowVolMeter / METER_MAX) * 100;
        elements.lowVolMeterFill.style.height = lowPercent + '%';
        elements.lowVolMeterValue.textContent = gameState.lowVolMeter;
    }
    
    if (elements.highVolMeterFill) {
        const highPercent = (gameState.highVolMeter / METER_MAX) * 100;
        elements.highVolMeterFill.style.height = highPercent + '%';
        elements.highVolMeterValue.textContent = gameState.highVolMeter;
    }
}

function showMessage(text, color) {
    elements.crashMessage.textContent = text;
    elements.crashMessage.style.color = color;
    elements.crashMessage.classList.add('show');
    
    setTimeout(() => {
        elements.crashMessage.classList.remove('show');
    }, 3000);
}

// ====== PERSISTENCE ======
function saveGameData() {
    localStorage.setItem('slotCrashGame', JSON.stringify({
        bankedTotal: gameState.bankedTotal,
        bestRun: gameState.bestRun,
        betAmount: gameState.betAmount
    }));
}

function loadGameData() {
    const saved = localStorage.getItem('slotCrashGame');
    if (saved) {
        const data = JSON.parse(saved);
        gameState.bankedTotal = data.bankedTotal || 10000.00;
        gameState.bestRun = data.bestRun || 0.00;
        gameState.betAmount = data.betAmount || 1.00;
        
        // Update bet selector active state
        elements.betOptions.forEach(btn => {
            const btnBet = parseFloat(btn.dataset.bet);
            if (btnBet === gameState.betAmount) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update spin button text
        const betDisplay = gameState.betAmount === 0.50 ? '£0.50' : `£${gameState.betAmount.toFixed(0)}`;
        elements.spinBtn.textContent = `🏃 GRAB ITEMS (${betDisplay})`;
    }
}

// ====== SOUND EFFECTS ======
const soundState = {
    runningOscillator: null,
    runningGain: null
};

function playSound(type, volume = 0.5, loop = false) {
    try {
        if (type === 'spin') {
            // Quick whoosh sound
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.setValueAtTime(200, audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
            
            gain.gain.setValueAtTime(volume, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.3);
        }
        else if (type === 'land') {
            // Soft click
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.setValueAtTime(800, audioContext.currentTime);
            gain.gain.setValueAtTime(volume, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.05);
        }
        else if (type === 'heartbeat') {
            // Heartbeat during escape run
            if (soundState.runningOscillator) {
                soundState.runningOscillator.stop();
            }
            
            const heartbeatInterval = setInterval(() => {
                if (!gameState.isRunning) {
                    clearInterval(heartbeatInterval);
                    return;
                }
                
                // Double thump sound
                for (let i = 0; i < 2; i++) {
                    setTimeout(() => {
                        const osc = audioContext.createOscillator();
                        const gain = audioContext.createGain();
                        
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(60, audioContext.currentTime);
                        gain.gain.setValueAtTime(volume * 0.5, audioContext.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                        
                        osc.start(audioContext.currentTime);
                        osc.stop(audioContext.currentTime + 0.1);
                    }, i * 150);
                }
            }, 800);
        }
        else if (type === 'monsterCatch') {
            // Monster roar/scream
            if (soundState.runningOscillator) {
                soundState.runningOscillator.stop();
                soundState.runningOscillator = null;
            }
            
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.8);
            
            gain.gain.setValueAtTime(volume * 0.8, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.8);
            
            // Add distorted scream overlay
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                
                osc2.type = 'square';
                osc2.frequency.setValueAtTime(200, audioContext.currentTime);
                osc2.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.3);
                
                gain2.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.3);
            }, 100);
        }
        else if (type === 'win') {
            // Safe zone relief sound
            if (soundState.runningOscillator) {
                soundState.runningOscillator.stop();
                soundState.runningOscillator = null;
            }
            
            const notes = [392, 523.25, 659.25]; // G, C, E - relief chord
            notes.forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                
                osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
                gain.gain.setValueAtTime(volume * 0.3, audioContext.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);
                
            osc.start(audioContext.currentTime + i * 0.1);
            osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
        });
    }
    else if (type === 'analyze') {
        // Quick notification sound for analysis
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.setValueAtTime(600, audioContext.currentTime);
        osc.frequency.linearRampToValueAtTime(900, audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(volume * 0.4, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.15);
    }
    else if (type === 'fold') {
        // Gentle descending tone
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.setValueAtTime(500, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.3);
        
        gain.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.3);
        }
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

// ====== MAZE SYSTEM ======
let mazeState = {
    grid: [],
    playerX: 0,
    playerY: 0,
    exitX: 0,
    exitY: 0,
    floodProgress: 0,
    cellSize: 40,
    viewportCols: 15,
    viewportRows: 10,
    path: [],
    currentPathIndex: 0,
    lastPathIndex: 0,        // Track previous frame's path index for monster calc
    isRunning: false,
    params: null,
    totalDistance: 0,
    sectionStartTime: 0,
    sectionDuration: 8000,
    lootTiles: [],
    collectedLoot: 0,
    totalWeight: 0,
    currentLootChoice: null, // Track loot player is considering
    isPausedForLoot: false,  // Flag to pause animation
    currentRoom: 1,          // Track which room (1-5) player is in
    monsterDistance: 0,      // Distance behind player (0 = caught)
    monsterSpeed: 1.0,       // Monster chase speed multiplier
    floatingTexts: [],       // Array of floating text popups { text, x, y, alpha, age }
    // Side exit system
    runStartTime: 0,         // When the maze run started
    sideExits: [],           // Array of exit opportunities { time, multiplier, triggered }
    nextExitIndex: 0         // Track which exit is next
};

// Loot types with values and weights
const LOOT_TYPES = {
    copper: { emoji: '🟤', value: 0.5, weight: 0.05, spawnChance: 0.15 },  // Common, barely slows you (5% slowdown)
    silver: { emoji: '⚪', value: 2.0, weight: 0.15, spawnChance: 0.08 },  // Uncommon, moderate slowdown (15% slowdown)
    gold: { emoji: '🟡', value: 5.0, weight: 0.35, spawnChance: 0.03 }    // Rare, heavy slowdown (35% slowdown)
};


// Generate maze using recursive backtracker
function generateMaze(width, height, difficulty) {
    const grid = [];
    
    // Initialize grid (all walls)
    for (let y = 0; y < height; y++) {
        grid[y] = [];
        for (let x = 0; x < width; x++) {
            grid[y][x] = {
                walls: { top: true, right: true, bottom: true, left: true },
                visited: false,
                isPath: false
            };
        }
    }
    
    // Carve maze
    const stack = [];
    const startX = 0;
    const startY = 0;
    
    grid[startY][startX].visited = true;
    stack.push({ x: startX, y: startY });
    
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = [];
        
        // Check all 4 directions
        const dirs = [
            { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' },    // North
            { dx: 1, dy: 0, wall: 'right', opposite: 'left' },     // East
            { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },     // South
            { dx: -1, dy: 0, wall: 'left', opposite: 'right' }     // West
        ];
        
        for (const dir of dirs) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx].visited) {
                neighbors.push({ x: nx, y: ny, dir });
            }
        }
        
        if (neighbors.length > 0) {
            // Biased selection based on difficulty - higher difficulty = more winding
            let next;
            if (Math.random() < difficulty) {
                // Random choice (more winding)
                next = neighbors[Math.floor(Math.random() * neighbors.length)];
            } else {
                // Prefer forward direction (straighter path)
                next = neighbors[0];
            }
            
            // Remove walls
            grid[current.y][current.x].walls[next.dir.wall] = false;
            grid[next.y][next.x].walls[next.dir.opposite] = false;
            grid[next.y][next.x].visited = true;
            
            stack.push({ x: next.x, y: next.y });
        } else {
            stack.pop();
        }
    }
    
    return grid;
}

// Find optimal path through maze using BFS
function findPath(grid, startX, startY, endX, endY) {
    const queue = [{ x: startX, y: startY, path: [{ x: startX, y: startY }] }];
    const visited = new Set();
    visited.add(`${startX},${startY}`);
    
    while (queue.length > 0) {
        const { x, y, path } = queue.shift();
        
        if (x === endX && y === endY) {
            return path;
        }
        
        // Check all 4 directions
        const moves = [
            { dx: 0, dy: -1, wall: 'top' },
            { dx: 1, dy: 0, wall: 'right' },
            { dx: 0, dy: 1, wall: 'bottom' },
            { dx: -1, dy: 0, wall: 'left' }
        ];
        
        for (const move of moves) {
            if (!grid[y][x].walls[move.wall]) {
                const nx = x + move.dx;
                const ny = y + move.dy;
                const key = `${nx},${ny}`;
                
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({
                        x: nx,
                        y: ny,
                        path: [...path, { x: nx, y: ny }]
                    });
                }
            }
        }
    }
    
    return [];
}

// Start maze run (alternative to linear)
function startMazeRun(params) {
    gameState.isSpinning = false;
    gameState.isRunning = true;
    gameState.canCashout = true;
    gameState.currentMultiplier = 0;
    gameState.crashPoint = params.crashPoint;
    
    // Hide analysis panel
    elements.symbolAnalysis.classList.add('hidden');
    
    elements.multiplierDisplay.classList.remove('crashed');
    elements.crashMessage.classList.remove('show');
    elements.crashMessage.textContent = '';
    document.body.classList.add('running');
    document.body.classList.remove('crashed');
    
    // EXPAND chase screen for bonus round
    expandChaseScreen();
    
    // Store params for generating new mazes
    mazeState.params = params;
    mazeState.totalDistance = 0; // Track cumulative distance across multiple mazes
    mazeState.collectedLoot = 0;
    mazeState.totalWeight = 0;
    
    // Initialize side exit system
    mazeState.runStartTime = Date.now();
    mazeState.sideExits = [
        { time: 10000, multiplier: 0.5, triggered: false, label: 'EARLY EXIT' },   // 10s - 50% pot
        { time: 20000, multiplier: 0.85, triggered: false, label: 'SAFE EXIT' },   // 20s - 85% pot
        { time: 35000, multiplier: 1.0, triggered: false, label: 'RISKY EXIT' }    // 35s - 100% pot
    ];
    mazeState.nextExitIndex = 0;
    
    playSound('heartbeat', 0.5, true);
    
    // Generate first maze
    generateNextMaze();
}

// Generate a new maze section
function generateNextMaze() {
    const params = mazeState.params;
    const tuning = MAZE_TUNING[gameState.currentMazeLevel];
    
    // Determine current room (1-5 cycle)
    mazeState.currentRoom = ((gameState.currentMazeLevel - 1) % 5) + 1;
    
    // Maze size scales with difficulty - MUCH LARGER for exploration
    const baseSize = 25; // Increased from 10 to 25 for longer exploration
    const sizeMod = Math.floor(gameState.currentMazeLevel / 3); // Bigger mazes at higher levels
    const gridWidth = baseSize + sizeMod;
    const gridHeight = baseSize + sizeMod;
    
    // Generate maze with difficulty from tuning
    const difficulty = tuning.crashProb; // Use crash probability as complexity metric
    mazeState.grid = generateMaze(gridWidth, gridHeight, difficulty);
    
    mazeState.playerX = 0;
    mazeState.playerY = 0;
    mazeState.exitX = gridWidth - 1;
    mazeState.exitY = gridHeight - 1;
    mazeState.isRunning = true;
    
    // Find the solution path
    mazeState.path = findPath(mazeState.grid, 0, 0, mazeState.exitX, mazeState.exitY);
    mazeState.currentPathIndex = 0;
    
    // Initialize monster chase - random start distance between 15-50 cells for testing
    const minDistance = 15;
    const maxDistance = 50;
    mazeState.monsterDistance = minDistance + Math.floor(Math.random() * (maxDistance - minDistance + 1));
    
    // Monster speed: Base tuning × volatility modifier from params
    const baseTuningSpeed = tuning.monsterSpd || 1.0;
    mazeState.monsterSpeed = baseTuningSpeed * params.monsterSpeed; // Multiply tuning by volatility mod (0.5 for low, 1.2 for high)
    
    console.log(`🎮 Monster starts ${mazeState.monsterDistance} cells behind (Path length: ${mazeState.path.length})`);
    console.log(`👹 Monster Speed: ${mazeState.monsterSpeed.toFixed(2)}x (Base ${baseTuningSpeed} × Vol Mod ${params.monsterSpeed})`);
    
    // Mark path cells
    for (const cell of mazeState.path) {
        mazeState.grid[cell.y][cell.x].isPath = true;
    }
    
    // Generate loot tiles - 5 room system
    mazeState.lootTiles = [];
    
    // Current room is already set in generateNextMaze
    const currentRoom = mazeState.currentRoom;
    
    // Room 5 is the GOLD ROOM with 7 gold prizes
    if (currentRoom === 5) {
        // Gold room - spawn 7 gold prizes randomly
        const availableCells = [];
        const bufferDistance = 8; // Keep prizes at least 8 cells away from start
        
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                // Don't spawn on start or exit
                if ((x === 0 && y === 0) || (x === mazeState.exitX && y === mazeState.exitY)) continue;
                
                // Calculate distance from start (Manhattan distance)
                const distFromStart = Math.abs(x - 0) + Math.abs(y - 0);
                if (distFromStart < bufferDistance) continue; // Skip cells too close to start
                
                // Only spawn on path cells for guaranteed accessibility
                if (mazeState.grid[y][x].isPath) {
                    availableCells.push({ x, y });
                }
            }
        }
        
        // Shuffle and take first 7 positions
        availableCells.sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(7, availableCells.length); i++) {
            const cell = availableCells[i];
            mazeState.lootTiles.push({
                x: cell.x,
                y: cell.y,
                type: 'gold',
                collected: false,
                ...LOOT_TYPES.gold
            });
        }
        console.log(`🏆 GOLD ROOM! Generated ${mazeState.lootTiles.length} gold prizes`);
    } else {
        // Rooms 1-4: Max 4 prizes (mixed copper/silver/gold)
        const availableCells = [];
        const bufferDistance = 8; // Keep prizes at least 8 cells away from start
        
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if ((x === 0 && y === 0) || (x === mazeState.exitX && y === mazeState.exitY)) continue;
                
                // Calculate distance from start (Manhattan distance)
                const distFromStart = Math.abs(x - 0) + Math.abs(y - 0);
                if (distFromStart < bufferDistance) continue; // Skip cells too close to start
                
                if (mazeState.grid[y][x].isPath) {
                    availableCells.push({ x, y });
                }
            }
        }
        
        // Shuffle available cells
        availableCells.sort(() => Math.random() - 0.5);
        
        // Spawn up to 4 prizes with weighted distribution
        const maxPrizes = 4;
        let prizesSpawned = 0;
        
        for (const cell of availableCells) {
            if (prizesSpawned >= maxPrizes) break;
            
            // Weighted random selection (70% copper, 25% silver, 5% gold)
            const roll = Math.random();
            let lootType = 'copper';
            if (roll > 0.95) lootType = 'gold';
            else if (roll > 0.70) lootType = 'silver';
            
            mazeState.lootTiles.push({
                x: cell.x,
                y: cell.y,
                type: lootType,
                collected: false,
                ...LOOT_TYPES[lootType]
            });
            prizesSpawned++;
        }
        console.log(`Room ${currentRoom}: Generated ${prizesSpawned} prizes`);
    }
    
    // Speed from tuning and modifiers
    const playerSpeedMult = params.playerSpeed || 1.0;
    const baseSpeed = tuning.playerSpd * playerSpeedMult;
    mazeState.playerSpeed = baseSpeed;
    
    // Duration based on path length and speed - SLOWED DOWN for better visibility
    const pathLength = mazeState.path.length;
    mazeState.sectionDuration = (pathLength / baseSpeed) * 1000 * 2.0; // 2x slower pace
    mazeState.sectionStartTime = Date.now();

    mazeState.sectionDuration = 50000; // 50 seconds to allow all 3 exits (10s, 20s, 35s) to appear
    
    animateMaze();
}

function animateMaze() {
    if (!gameState.isRunning || !mazeState.isRunning || mazeState.isPausedForLoot) return;
    
    const params = mazeState.params;
    const elapsed = Date.now() - mazeState.sectionStartTime;
    const progress = Math.min(elapsed / mazeState.sectionDuration, 1);
    
    // Player progresses along path
    const targetIndex = Math.floor(progress * mazeState.path.length);
    mazeState.currentPathIndex = Math.min(targetIndex, mazeState.path.length - 1);
    
    if (mazeState.currentPathIndex < mazeState.path.length) {
        const pos = mazeState.path[mazeState.currentPathIndex];
        mazeState.playerX = pos.x;
        mazeState.playerY = pos.y;
    }
    
    // CHECK FOR SIDE EXIT OPPORTUNITIES - Position-based instead of time-based
    if (mazeState.sideExits && mazeState.nextExitIndex < mazeState.sideExits.length) {
        const nextExit = mazeState.sideExits[mazeState.nextExitIndex];
        if (nextExit && !nextExit.triggered) {
            // Calculate exit position on path
            let exitPathIndex;
            const i = mazeState.nextExitIndex;
            if (i === 0) {
                exitPathIndex = Math.floor(mazeState.path.length / 3); // 33% through
            } else if (i === 1) {
                exitPathIndex = Math.floor(mazeState.path.length * 2 / 3); // 66% through
            } else {
                exitPathIndex = Math.floor(mazeState.path.length * 5 / 6); // 83% through
            }
            
            // Trigger when player reaches or passes the exit position
            if (mazeState.currentPathIndex >= exitPathIndex) {
                nextExit.triggered = true;
                mazeState.nextExitIndex++;
                showSideExit(nextExit);
                return; // Pause animation
            }
        }
    }
    
    // MONSTER CHASE MECHANICS
    // Monster closes in based on its speed and player's weight burden
    // The monster advances relative to the player's progress through the maze
    const baseMonsterSpeed = 0.65; // Base: monster gains 65% of player's speed
    const weightSlowdown = 1 + (mazeState.totalWeight * 1.2); // Weight penalty makes monster catch up faster
    const monsterSpeedMultiplier = mazeState.monsterSpeed; // From MAZE_TUNING (1.00 -> 1.65)
    
    // Monster advances as a fraction of player's progress
    const playerProgressThisFrame = (targetIndex - (mazeState.lastPathIndex || 0));
    const monsterAdvanceRate = playerProgressThisFrame * baseMonsterSpeed * monsterSpeedMultiplier * weightSlowdown;
    
    mazeState.monsterDistance -= monsterAdvanceRate;
    mazeState.lastPathIndex = targetIndex;
    
    // Check if monster catches player
    if (mazeState.monsterDistance <= 0 || CONFIG.debugForceCaught) {
        console.log('💀 CAUGHT BY MONSTER!' + (CONFIG.debugForceCaught ? ' (DEBUG FORCED)' : ''));
        crash();
        return;
    }
    
    // Check for loot encounter (auto-collect now)
    for (const loot of mazeState.lootTiles) {
        if (!loot.collected && loot.x === mazeState.playerX && loot.y === mazeState.playerY) {
            loot.collected = true;
            mazeState.collectedLoot++;
            mazeState.totalWeight += loot.weight;
            
            // Add cash to pot with lootDensity multiplier
            const params = mazeState.params;
            const lootMultiplier = params.lootDensity || 1.0;
            const lootCash = loot.value * gameState.betAmount * lootMultiplier;
            gameState.mazePot += lootCash;
            
            // Slow down player based on weight
            mazeState.sectionDuration += (loot.weight * 2000);
            
            // Add floating text popup above player
            mazeState.floatingTexts.push({
                text: `+£${lootCash.toFixed(2)}`,
                x: mazeState.playerX,
                y: mazeState.playerY,
                alpha: 1.0,
                age: 0,
                color: loot.type === 'gold' ? '#ffd700' : loot.type === 'silver' ? '#c0c0c0' : '#cd7f32'
            });
            
            playSound('win', 0.3);
            console.log(`Auto-collected ${loot.type}! +£${lootCash.toFixed(2)} (×${lootMultiplier.toFixed(2)}) | Total Weight: ${mazeState.totalWeight.toFixed(2)}`);
            break; // Only collect one per frame
        }
    }
    
    // Add distance from current section
    const sectionProgress = mazeState.currentPathIndex / mazeState.path.length;
    const currentSectionDistance = sectionProgress * (mazeState.path.length / 2); // Convert cells to meters
    gameState.currentMultiplier = mazeState.totalDistance + currentSectionDistance;
    
    // Update display
    elements.multiplierDisplay.textContent = gameState.currentMultiplier.toFixed(2) + 'm';
    
    // Threat level for screen effects
    const threatLevel = gameState.currentMultiplier / params.crashPoint;
    
    document.body.classList.remove('high-threat');
    if (threatLevel > 0.85) {
        document.body.classList.add('high-threat');
    }
    
    // Draw maze
    drawMaze();
    
    // Check if player reached the exit - show choice!
    if (mazeState.playerX === mazeState.exitX && mazeState.playerY === mazeState.exitY) {
        // Pause the game and show exit choice
        mazeState.isRunning = false;
        showExitChoice();
        return;
    }
    
    // Check for monster catch (crash based on tuning)
    const tuning = MAZE_TUNING[gameState.currentMazeLevel];
    const crashRoll = Math.random();
    if (crashRoll < tuning.crashProb * 0.0001) { // Very low per-frame chance
        crash();
        mazeState.isRunning = false;
        return;
    }
    
    animationFrameId = requestAnimationFrame(animateMaze);
}

function showExitChoice() {
    // Stop heartbeat if it exists
    if (typeof currentHeartbeat !== 'undefined' && currentHeartbeat) {
        currentHeartbeat.stop();
        currentHeartbeat = null;
    }
    
    // Pause the animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Add guaranteed completion bonus = current maze level × bet amount
    const completionBonus = gameState.currentMazeLevel * gameState.betAmount;
    gameState.mazePot += completionBonus;
    console.log(`🏆 Maze ${gameState.currentMazeLevel} completed! Bonus: £${completionBonus.toFixed(2)} (${gameState.currentMazeLevel}x bet)`);
    
    // Update exit overlay with current stats
    elements.exitPot.textContent = gameState.mazePot.toFixed(2);
    elements.exitNextLevel.textContent = gameState.currentMazeLevel + 1;
    
    const nextTuning = MAZE_TUNING[Math.min(gameState.currentMazeLevel + 1, 12)];
    const crashProb = nextTuning.crashProb;
    
    let dangerClass = 'danger-low';
    let dangerText = 'LOW';
    if (crashProb >= 0.6) {
        dangerClass = 'danger-high';
        dangerText = 'DEADLY';
    } else if (crashProb >= 0.3) {
        dangerClass = 'danger-medium';
        dangerText = 'HIGH';
    }
    
    elements.exitDanger.className = dangerClass;
    elements.exitDanger.textContent = dangerText;
    
    // Show the overlay
    elements.exitChoiceOverlay.classList.remove('hidden');
    console.log('Exit choice overlay shown - Pot: $' + gameState.mazePot.toFixed(2));
    playSound('win', 0.5);
}

function showLootChoice(loot) {
    // Pause the maze animation
    mazeState.isPausedForLoot = true;
    
    // Store the time when we paused so we can adjust the timer when resuming
    mazeState.pauseStartTime = Date.now();
    
    // Cancel animation frame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Get loot emoji
    let lootEmoji = loot.emoji;
    let lootName = loot.type.toUpperCase();
    let lootColor = '#cd7f32';
    if (loot.type === 'silver') {
        lootColor = '#c0c0c0';
        lootName = 'SILVER';
    } else if (loot.type === 'gold') {
        lootColor = '#ffd700';
        lootName = 'GOLD';
    } else {
        lootName = 'COPPER';
    }
    
    // Update overlay content
    const lootCash = loot.value * gameState.betAmount;
    elements.lootTypeDisplay.textContent = `${lootEmoji} ${lootName}`;
    elements.lootTypeDisplay.style.color = lootColor;
    elements.lootValue.textContent = lootCash.toFixed(2);
    elements.lootWeight.textContent = loot.weight.toFixed(2);
    
    // Show the overlay
    elements.lootChoiceOverlay.classList.remove('hidden');
    console.log(`Loot choice shown: ${lootName} worth £${lootCash.toFixed(2)}`);
    playSound('land', 0.5);
}

function handleLootTake() {
    const loot = mazeState.currentLootChoice;
    if (!loot) return;
    
    // Collect the loot
    loot.collected = true;
    mazeState.collectedLoot++;
    mazeState.totalWeight += loot.weight;
    
    // Add cash to pot with lootDensity multiplier from volatility mode
    const params = mazeState.params;
    const lootMultiplier = params.lootDensity || 1.0;
    const lootCash = loot.value * gameState.betAmount * lootMultiplier;
    gameState.mazePot += lootCash;
    
    // Slow down player based on weight
    mazeState.sectionDuration += (loot.weight * 2000); // Each weight unit adds 2 seconds
    
    playSound('win', 0.3);
    console.log(`Picked up ${loot.type}! +£${lootCash.toFixed(2)} (×${lootMultiplier.toFixed(2)}) | Total Weight: ${mazeState.totalWeight.toFixed(2)}`);
    
    // Adjust timer to account for pause duration
    const pauseDuration = Date.now() - mazeState.pauseStartTime;
    mazeState.sectionStartTime += pauseDuration;
    
    // Hide overlay and resume
    elements.lootChoiceOverlay.classList.add('hidden');
    mazeState.currentLootChoice = null;
    mazeState.isPausedForLoot = false;
    
    // Resume animation
    animateMaze();
}

function handleLootLeave() {
    const loot = mazeState.currentLootChoice;
    if (!loot) return;
    
    console.log(`Left ${loot.type} behind`);
    
    // Adjust timer to account for pause duration
    const pauseDuration = Date.now() - mazeState.pauseStartTime;
    mazeState.sectionStartTime += pauseDuration;
    
    // Hide overlay and resume
    elements.lootChoiceOverlay.classList.add('hidden');
    mazeState.currentLootChoice = null;
    mazeState.isPausedForLoot = false;
    
    // Resume animation
    animateMaze();
}

function handleCaughtContinue() {
    // Hide caught overlay
    elements.caughtOverlay.classList.add('hidden');
    
    // Reset maze progression and state
    gameState.currentMazeLevel = 0;
    gameState.mazePot = 0;
    gameState.isRunning = false;
    gameState.isWaitingToStart = false;
    mazeState.isRunning = false;
    
    // Clear multiplier display crash state
    elements.multiplierDisplay.classList.remove('crashed');
    elements.multiplierDisplay.textContent = '0m';
    
    // SHRINK chase screen back to normal
    shrinkChaseScreen();
    
    // Enable spin button and disable start button
    elements.spinBtn.disabled = false;
    elements.startRunBtn.disabled = true;
    
    // Update UI
    updateUI();
}

// Draw maze viewport
function drawMaze() {
    if (!ctx) return;
    
    const canvas = elements.crashCanvas;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate visible area around player
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const cellSize = mazeState.cellSize;
    
    const offsetX = centerX - mazeState.playerX * cellSize;
    const offsetY = centerY - mazeState.playerY * cellSize;
    
    // Draw maze cells
    for (let y = 0; y < mazeState.grid.length; y++) {
        for (let x = 0; x < mazeState.grid[y].length; x++) {
            const cell = mazeState.grid[y][x];
            const screenX = offsetX + x * cellSize;
            const screenY = offsetY + y * cellSize;
            
            // Only draw visible cells
            if (screenX < -cellSize || screenX > width || screenY < -cellSize || screenY > height) {
                continue;
            }
            
            // Dark floor for all cells (no visible flood)
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(screenX + 1, screenY + 1, cellSize - 2, cellSize - 2);
            
            // Draw walls
            ctx.strokeStyle = cell.isPath ? '#8b0000' : '#444';
            ctx.lineWidth = 3;
            
            if (cell.walls.top) {
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX + cellSize, screenY);
                ctx.stroke();
            }
            if (cell.walls.right) {
                ctx.beginPath();
                ctx.moveTo(screenX + cellSize, screenY);
                ctx.lineTo(screenX + cellSize, screenY + cellSize);
                ctx.stroke();
            }
            if (cell.walls.bottom) {
                ctx.beginPath();
                ctx.moveTo(screenX, screenY + cellSize);
                ctx.lineTo(screenX + cellSize, screenY + cellSize);
                ctx.stroke();
            }
            if (cell.walls.left) {
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX, screenY + cellSize);
                ctx.stroke();
            }
        }
    }
    
    // Draw exit zone (safe area)
    const exitX = offsetX + mazeState.exitX * cellSize;
    const exitY = offsetY + mazeState.exitY * cellSize;
    ctx.fillStyle = 'rgba(0, 170, 0, 0.3)';
    ctx.fillRect(exitX, exitY, cellSize, cellSize);
    ctx.fillStyle = '#00aa00';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🚪', exitX + 10, exitY + 30);
    
    // Draw loot tiles
    for (const loot of mazeState.lootTiles) {
        if (loot.collected) continue;
        
        const lootX = offsetX + loot.x * cellSize;
        const lootY = offsetY + loot.y * cellSize;
        
        // Only draw visible loot
        if (lootX < -cellSize || lootX > width || lootY < -cellSize || lootY > height) {
            continue;
        }
        
        // Glow effect based on loot type
        let glowColor = '#cd7f32'; // Copper
        if (loot.type === 'silver') glowColor = '#c0c0c0';
        if (loot.type === 'gold') glowColor = '#ffd700';
        
        ctx.fillStyle = `rgba(${hexToRgb(glowColor)}, 0.2)`;
        ctx.fillRect(lootX, lootY, cellSize, cellSize);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;
        ctx.font = 'bold 24px Arial';
        ctx.fillText(loot.emoji, lootX + 8, lootY + 28);
        ctx.shadowBlur = 0;
    }
    
    // Draw side exit markers on the path
    if (mazeState.path && mazeState.path.length > 0 && mazeState.sideExits && mazeState.sideExits.length > 0) {
        for (let i = 0; i < mazeState.sideExits.length; i++) {
            const exit = mazeState.sideExits[i];
            // Scatter exits evenly along the path - divide path into thirds
            // Exit 1 (10s) at 1/3 of path, Exit 2 (20s) at 2/3, Exit 3 (35s) at 5/6
            let exitPathIndex;
            if (i === 0) {
                exitPathIndex = Math.floor(mazeState.path.length / 3); // 33% through
            } else if (i === 1) {
                exitPathIndex = Math.floor(mazeState.path.length * 2 / 3); // 66% through
            } else {
                exitPathIndex = Math.floor(mazeState.path.length * 5 / 6); // 83% through
            }
            
            if (exitPathIndex < mazeState.path.length) {
                const exitCell = mazeState.path[exitPathIndex];
                const exitMarkerX = offsetX + exitCell.x * cellSize;
                const exitMarkerY = offsetY + exitCell.y * cellSize;
                
                // Only draw visible exit markers
                if (exitMarkerX >= -cellSize && exitMarkerX <= width && exitMarkerY >= -cellSize && exitMarkerY <= height) {
                    // Pulsing effect if not triggered yet
                    const pulse = exit.triggered ? 0.3 : 0.5 + Math.sin(Date.now() / 300) * 0.2;
                    
                    // Color based on exit type
                    let exitColor = exit.multiplier === 0.5 ? '#00aaff' : exit.multiplier === 0.85 ? '#ffaa00' : '#00ff00';
                    if (exit.triggered) exitColor = '#555'; // Gray if already used
                    
                    // Draw glowing marker
                    ctx.fillStyle = `rgba(${hexToRgb(exitColor)}, ${pulse})`;
                    ctx.fillRect(exitMarkerX, exitMarkerY, cellSize, cellSize);
                    
                    ctx.shadowBlur = exit.triggered ? 0 : 20;
                    ctx.shadowColor = exitColor;
                    ctx.fillStyle = exit.triggered ? '#888' : exitColor;
                    ctx.font = 'bold 24px Arial';
                    ctx.fillText('🚪', exitMarkerX + 8, exitMarkerY + 28);
                    ctx.shadowBlur = 0;
                }
            }
        }
    }
    
    // Draw player
    const playerX = offsetX + mazeState.playerX * cellSize;
    const playerY = offsetY + mazeState.playerY * cellSize;
    ctx.fillStyle = '#ffaa00';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffaa00';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('🏃', playerX + 6, playerY + 32);
    ctx.shadowBlur = 0;
    
    // Draw stats (room, progress, weight, pot)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    
    // Highlight room 5 (gold room)
    if (mazeState.currentRoom === 5) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`🏆 ROOM ${mazeState.currentRoom}/5 - GOLD ROOM! 🏆`, 20, 30);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
    } else {
        ctx.fillText(`Room ${mazeState.currentRoom}/5 | Progress: ${mazeState.currentPathIndex}/${mazeState.path.length}`, 20, 30);
    }
    
    ctx.fillText(`Pot: £${gameState.mazePot.toFixed(2)}`, 20, 55);
    ctx.fillText(`Weight: ${mazeState.totalWeight.toFixed(2)}`, 20, 80);
    
    // Monster distance indicator - color changes as it gets closer
    const monsterDist = Math.max(0, mazeState.monsterDistance);
    let monsterColor = '#00ff00'; // Green (safe)
    if (monsterDist < 15) monsterColor = '#ffaa00'; // Orange (warning)
    if (monsterDist < 8) monsterColor = '#ff0000'; // Red (danger)
    
    ctx.fillStyle = monsterColor;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`👹 Monster: ${monsterDist.toFixed(1)} cells behind`, 20, 105);
    
    // Draw floating text popups (money collected)
    for (let i = mazeState.floatingTexts.length - 1; i >= 0; i--) {
        const popup = mazeState.floatingTexts[i];
        
        // Age the popup (fade out and float up)
        popup.age += 16; // ~60fps
        popup.alpha = Math.max(0, 1 - (popup.age / 1500)); // Fade over 1.5 seconds
        const floatY = popup.y - (popup.age / 100); // Float upward
        
        // Remove if fully faded
        if (popup.alpha <= 0) {
            mazeState.floatingTexts.splice(i, 1);
            continue;
        }
        
        // Calculate screen position
        const popupX = offsetX + popup.x * cellSize;
        const popupY = offsetY + floatY * cellSize - 20; // Above player
        
        // Draw the text with fade
        ctx.save();
        ctx.globalAlpha = popup.alpha;
        ctx.fillStyle = popup.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 20px Arial';
        ctx.shadowBlur = 10;
        ctx.shadowColor = popup.color;
        
        // Outline
        ctx.strokeText(popup.text, popupX, popupY);
        // Fill
        ctx.fillText(popup.text, popupX, popupY);
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '255, 255, 255';
}

// ====== UTILITY ======
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ====== START GAME ======
// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
