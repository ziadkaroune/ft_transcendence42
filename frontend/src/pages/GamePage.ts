import { startGame } from '../pong';

/** Types */
type GameSettings = {
  mode: string;
  winScore: number;
  ballSpeed: number;
  paddleSpeed: number;
  map: string;
  powerUps: boolean;
};

/** Fetch players from backend */
async function getAliasQueue(): Promise<string[]> {
  const res = await fetch('http://localhost:3100/players');
  const data = await res.json();

  const queue = Array.isArray(data)
    ? data
        .map((p: any) =>
          typeof p === 'string' ? p.trim() :
          (p && typeof p.alias === 'string' ? p.alias.trim() : '')
        )
        .filter((alias: string) => alias !== '')
    : [];

  console.log("Queue from DB:", queue);
  return queue;
}

/** Save match result */
async function saveMatch(winner: string, p1: string, p2: string) {
  const res = await fetch('http://localhost:3102/matches', {   // ✅ corrected port for matches
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winner, player1: p1, player2: p2 })
  });

  if (!res.ok) {
    console.error("Failed to save match", await res.text());
  }
}

/** ---- LOCAL STORAGE HELPERS ---- */
function getGameSettings(username: string): GameSettings {
  const saved = localStorage.getItem(`settings_${username}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Invalid settings in localStorage for", username, e);
    }
  }
  // default settings
  return {
    mode: 'custom',
    winScore: 2,
    ballSpeed: 0.8,
    paddleSpeed: 2,
    map: 'default',
    powerUps: true,
  };
}

function saveGameSettings(username: string, settings: GameSettings) {
  localStorage.setItem(`settings_${username}`, JSON.stringify(settings));
}

/** ---- MAIN RENDER ---- */
export async function renderGamePage(queueOverride?: string[]) {
  const app = document.getElementById('app');
  if (!app) return;

  const queue = queueOverride ?? await getAliasQueue();
  console.log("Queue length:", queue.length);

  if (queue.length < 2) {
    app.innerHTML = `<p class="text-red-500">You need at least 2 players to start the game.</p>
      <button onclick="location.href='/'" class="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600">Back</button>`;
    return;
  }

  const [p1, p2] = queue;
  const settings = getGameSettings(p1);

  app.innerHTML = `
    <div class="relative h-screen w-screen bg-black overflow-hidden bg-gradient-to-br from-purple-900 via-black to-blue-900">
      
      <!-- Settings Toggle Button -->
      <div class="fixed top-4 right-4 md:top-8 md:right-8 z-50">
        <button id="settingsToggle" 
                class="group bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 hover:bg-slate-700/90 
                       text-white p-3 md:p-4 rounded-xl shadow-lg hover:shadow-xl 
                       transform hover:scale-105 transition-all duration-300 ease-out">
          <i class="fas fa-cog text-lg md:text-xl group-hover:rotate-180 transition-transform duration-500"></i>
        </button>
      </div>

      <!-- Settings Panel Overlay -->
      <div id="settingsOverlay" 
           class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 opacity-0 invisible 
                  transition-all duration-300 ease-out">
      </div>

      <!-- Settings Panel -->
      <div id="settingsPanel" 
           class="fixed top-0 right-0 h-full w-full sm:w-96 md:w-[28rem] 
                  bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 
                  shadow-2xl z-50 transform translate-x-full transition-transform duration-300 ease-out">
        
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <i class="fas fa-gamepad text-white text-sm"></i>
            </div>
            <h2 class="text-xl font-semibold text-white">Game Settings</h2>
          </div>
          <button id="closeSettings" 
                  class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/50 
                         transition-colors duration-200">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <!-- Settings Content -->
        <div class="p-6 space-y-6 overflow-y-auto h-full pb-20">
          
          <!-- Game Mode -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-300">
              <i class="fas fa-gamepad w-4 mr-2 text-blue-400"></i>
              Game Mode
            </label>
            <select id="modeSelect" 
                    class="w-full bg-slate-800/80 border border-slate-600/50 text-white 
                           rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                           focus:border-blue-500/50 transition-colors duration-200">
              <option value="custom" ${settings.mode === 'custom' ? 'selected' : ''}>Custom Match</option>
              <option value="classic" ${settings.mode === 'classic' ? 'selected' : ''}>Classic Mode</option>
            </select>
          </div>

          <!-- Max Score -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-300">
              <i class="fas fa-trophy w-4 mr-2 text-yellow-400"></i>
              Max Score
            </label>
            <div class="relative">
              <input type="number" id="winScore" min="1" max="20" value="${settings.winScore}" 
                     class="w-full bg-slate-800/80 border border-slate-600/50 text-white 
                            rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                            focus:border-blue-500/50 transition-colors duration-200" />
              <span class="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">pts</span>
            </div>
          </div>

          <!-- Ball Speed -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-300">
              <i class="fas fa-tachometer-alt w-4 mr-2 text-green-400"></i>
              Ball Speed
            </label>
            <div class="space-y-2">
              <input type="range" id="ballSpeedRange" min="0.1" max="5" step="0.1" value="${settings.ballSpeed}"
                     class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
              <div class="flex justify-between text-xs text-slate-400">
                <span>Slow</span>
                <span id="ballSpeedValue" class="text-green-400 font-medium">${settings.ballSpeed}</span>
                <span>Fast</span>
              </div>
            </div>
          </div>

          <!-- Paddle Speed -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-300">
              <i class="fas fa-arrows-alt-v w-4 mr-2 text-orange-400"></i>
              Paddle Speed
            </label>
            <div class="space-y-2">
              <input type="range" id="paddleSpeedRange" min="0.5" max="10" step="0.1" value="${settings.paddleSpeed}"
                     class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer">
              <div class="flex justify-between text-xs text-slate-400">
                <span>Slow</span>
                <span id="paddleSpeedValue" class="text-orange-400 font-medium">${settings.paddleSpeed}</span>
                <span>Fast</span>
              </div>
            </div>
          </div>

          <!-- Map Theme -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-300">
              <i class="fas fa-map w-4 mr-2 text-purple-400"></i>
              Map Theme
            </label>
            <div class="grid grid-cols-2 gap-3">
              <div class="relative">
                <input type="radio" id="default" name="mapTheme" value="default" ${settings.map === 'default' ? 'checked' : ''} 
                       class="sr-only peer">
                <label for="default" 
                       class="block w-full p-3 bg-slate-800/80 border border-slate-600/50 
                              rounded-lg cursor-pointer hover:bg-slate-700/80 
                              peer-checked:border-blue-500 peer-checked:bg-blue-500/10 
                              transition-colors duration-200 text-center text-sm text-white">
                  <i class="fas fa-square block mb-1 text-slate-400"></i>
                  Default
                </label>
              </div>
              <div class="relative">
                <input type="radio" id="neon" name="mapTheme" value="neon" ${settings.map === 'neon' ? 'checked' : ''} 
                       class="sr-only peer">
                <label for="neon" 
                       class="block w-full p-3 bg-slate-800/80 border border-slate-600/50 
                              rounded-lg cursor-pointer hover:bg-slate-700/80 
                              peer-checked:border-cyan-500 peer-checked:bg-cyan-500/10 
                              transition-colors duration-200 text-center text-sm text-white">
                  <i class="fas fa-bolt block mb-1 text-cyan-400"></i>
                  Neon Grid
                </label>
              </div>
              <div class="relative">
                <input type="radio" id="forest" name="mapTheme" value="forest" ${settings.map === 'forest' ? 'checked' : ''} 
                       class="sr-only peer">
                <label for="forest" 
                       class="block w-full p-3 bg-slate-800/80 border border-slate-600/50 
                              rounded-lg cursor-pointer hover:bg-slate-700/80 
                              peer-checked:border-green-500 peer-checked:bg-green-500/10 
                              transition-colors duration-200 text-center text-sm text-white">
                  <i class="fas fa-tree block mb-1 text-green-400"></i>
                  Forest
                </label>
              </div>
              <div class="relative">
                <input type="radio" id="matrix" name="mapTheme" value="matrix" ${settings.map === 'matrix' ? 'checked' : ''} 
                       class="sr-only peer">
                <label for="matrix" 
                       class="block w-full p-3 bg-slate-800/80 border border-slate-600/50 
                              rounded-lg cursor-pointer hover:bg-slate-700/80 
                              peer-checked:border-green-400 peer-checked:bg-green-400/10 
                              transition-colors duration-200 text-center text-sm text-white">
                  <i class="fas fa-code block mb-1 text-green-400"></i>
                  Matrix
                </label>
              </div>
            </div>
          </div>

          <!-- Power-ups -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-300">
              <i class="fas fa-magic w-4 mr-2 text-pink-400"></i>
              Special Features
            </label>
            <div class="space-y-3">
              <label class="flex items-center space-x-3 cursor-pointer group">
                <div class="relative">
                  <input type="checkbox" id="powerUps" ${settings.powerUps ? 'checked' : ''} 
                         class="sr-only peer">
                  <div class="w-5 h-5 bg-slate-700 border border-slate-600 rounded 
                              peer-checked:bg-gradient-to-br peer-checked:from-pink-500 peer-checked:to-purple-600 
                              peer-checked:border-pink-500 transition-all duration-200
                              flex items-center justify-center">
                    <i class="fas fa-check text-white text-xs opacity-0 peer-checked:opacity-100"></i>
                  </div>
                </div>
                <span class="text-slate-300 group-hover:text-white transition-colors duration-200">
                  Enable Power-ups
                </span>
              </label>
            </div>
          </div>

        </div>

        <!-- Footer Actions -->
        <div class="absolute bottom-0 left-0 right-0 p-6 bg-slate-900/95 border-t border-slate-700/50">
          <div class="flex space-x-3">
            <button id="resetSettings" 
                    class="flex-1 px-4 py-3 bg-slate-700/80 hover:bg-slate-600/80 
                           text-slate-300 hover:text-white rounded-lg transition-colors duration-200 
                           font-medium text-sm">
              <i class="fas fa-undo mr-2"></i>
              Reset
            </button>
            <button id="applySettings" 
                    class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 
                           hover:from-blue-700 hover:to-purple-700 text-white rounded-lg 
                           transition-all duration-200 font-medium text-sm shadow-lg 
                           hover:shadow-xl transform hover:scale-[1.02]">
              <i class="fas fa-check mr-2"></i>
              Apply
            </button>
          </div>
        </div>

      </div>

      <div id="powerUpStatus" class="absolute top-2 left-2 text-green-400 text-lg font-bold"></div>
      <h2 id="scoreDisplay" class="text-xl text-white h-32 flex justify-center items-center"></h2>
      <canvas id="pong" width="640" height="480" class="border border-white mx-auto"></canvas>
      <div class="mt-4 space-x-2 text-center">
        <button id="nextMatch" class="px-4 py-2 bg-purple-800 hover:bg-purple-900 rounded-lg font-bold shadow-md transition">Next Match</button>
        <button onclick="location.href='/register'" class="px-4 py-2 bg-gray-700 hover:bg-gray-600">Back</button>
      </div>
    </div>`;

  // Settings panel functionality
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const closeSettings = document.getElementById('closeSettings');

  // Range inputs
  const ballSpeedRange = document.getElementById('ballSpeedRange') as HTMLInputElement;
  const ballSpeedValue = document.getElementById('ballSpeedValue');
  const paddleSpeedRange = document.getElementById('paddleSpeedRange') as HTMLInputElement;
  const paddleSpeedValue = document.getElementById('paddleSpeedValue');

  // Toggle panel functions
  function openPanel() {
    settingsPanel?.classList.remove('translate-x-full');
    settingsOverlay?.classList.remove('opacity-0', 'invisible');
    document.body.classList.add('overflow-hidden');
  }

  function closePanel() {
    settingsPanel?.classList.add('translate-x-full');
    settingsOverlay?.classList.add('opacity-0', 'invisible');
    document.body.classList.remove('overflow-hidden');
  }

  // Event listeners for settings panel
  settingsToggle?.addEventListener('click', openPanel);
  closeSettings?.addEventListener('click', closePanel);
  settingsOverlay?.addEventListener('click', closePanel);

  // Range input updates
  ballSpeedRange?.addEventListener('input', (e) => {
    if (ballSpeedValue) ballSpeedValue.textContent = (e.target as HTMLInputElement).value;
  });

  paddleSpeedRange?.addEventListener('input', (e) => {
    if (paddleSpeedValue) paddleSpeedValue.textContent = (e.target as HTMLInputElement).value;
  });

  // Close panel on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // Reset settings
  document.getElementById('resetSettings')?.addEventListener('click', () => {
    const defaultSettings = {
      mode: 'custom',
      winScore: 2,
      ballSpeed: 0.8,
      paddleSpeed: 2,
      map: 'default',
      powerUps: true,
    };

    (document.getElementById('modeSelect') as HTMLSelectElement).value = defaultSettings.mode;
    (document.getElementById('winScore') as HTMLInputElement).value = String(defaultSettings.winScore);
    ballSpeedRange.value = String(defaultSettings.ballSpeed);
    if (ballSpeedValue) ballSpeedValue.textContent = String(defaultSettings.ballSpeed);
    paddleSpeedRange.value = String(defaultSettings.paddleSpeed);
    if (paddleSpeedValue) paddleSpeedValue.textContent = String(defaultSettings.paddleSpeed);
    (document.getElementById('default') as HTMLInputElement).checked = true;
    (document.getElementById('powerUps') as HTMLInputElement).checked = defaultSettings.powerUps;
  });

  // Start the game
  startGame(async (winner: string) => {
    await saveMatch(winner, p1, p2);
    alert(`${winner} wins! Click Next Match to continue.`);
  }, settings, p1, p2);

  // Handle "Next Match"
  document.getElementById('nextMatch')?.addEventListener('click', () => {
    const rotated = [...queue.slice(2), queue[0], queue[1]];
    renderGamePage(rotated);
  });

  // Handle settings save
  document.getElementById('applySettings')?.addEventListener('click', () => {
    const username = queue[0];
    const newSettings: GameSettings = {
      mode: (document.getElementById('modeSelect') as HTMLSelectElement).value,
      winScore: parseInt((document.getElementById('winScore') as HTMLInputElement).value),
      ballSpeed: parseFloat(ballSpeedRange.value),
      paddleSpeed: parseFloat(paddleSpeedRange.value),
      map: (document.querySelector('input[name="mapTheme"]:checked') as HTMLInputElement).value,
      powerUps: (document.getElementById('powerUps') as HTMLInputElement).checked
    };

    saveGameSettings(username, newSettings);
    
    // Show success feedback
    const applyBtn = document.getElementById('applySettings');
    if (applyBtn) {
      const originalHTML = applyBtn.innerHTML;
      applyBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Applied!';
      applyBtn.classList.add('from-green-600', 'to-emerald-600');
      
      setTimeout(() => {
        applyBtn.innerHTML = originalHTML;
        applyBtn.classList.remove('from-green-600', 'to-emerald-600');
        closePanel();
      }, 1000);
    }
  });
}