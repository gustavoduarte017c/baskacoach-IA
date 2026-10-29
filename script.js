// =========================================================================
// CONFIGURAÇÃO DO BOT E VARIÁVEIS DE ESTADO
// =========================================================================
// AVISO DE SEGURANÇA:
// Como esta aplicação executa diretamente no navegador (cliente frontend),
// qualquer chave de API armazenada no localStorage ou carregada pelo frontend
// não é estritamente secreta e pode ser inspecionada por qualquer usuário com
// acesso às ferramentas de desenvolvedor (DevTools).
// Para ambientes de produção reais, recomenda-se sempre utilizar um backend
// intermediário seguro (Proxy / BFF) que guarde a chave no lado do servidor.
// Esta implementação atual atende a fins didáticos, locais e de desenvolvimento.
// =========================================================================

let azureConfig = {
    apiKey: "",
    endpoint: "",
    model: ""
};

const SYSTEM_PROMPT = {
    role: "system",
    content: "Você é o BasketCoach AI, um treinador de basquete implacável, motivador e especialista em alta performance. Fale apenas sobre basquete, estratégias de quadra, mentalidade de jogo e superação física. ATENÇÃO: NUNCA utilize formatação Markdown nas suas respostas (sem asteriscos para negrito, sem hashtags para títulos, sem listas com marcadores em markdown). Escreva tudo em texto puro, de forma direta e corrida."
};

// Estrutura de conversas no localStorage:
// [ { id: "chat-xxx", title: "Título da conversa", createdAt: 1234567, history: [ { role, content, time } ] } ]
let conversations = [];
let currentChatId = null;

// =========================================================================
// GERENCIAMENTO DE CONVERSAS E HISTÓRICO PERSISTENTE
// =========================================================================

function loadConversationsFromStorage() {
    try {
        const stored = localStorage.getItem("basketcoach_conversations");
        if (stored) {
            conversations = JSON.parse(stored);
        }
    } catch (e) {
        console.warn("[Storage] Erro ao carregar conversas do localStorage:", e);
        conversations = [];
    }

    if (!Array.isArray(conversations) || conversations.length === 0) {
        // Inicializa primeira conversa limpa
        initNewChatInstance();
    } else {
        // Seleciona a mais recente
        currentChatId = conversations[0].id;
    }
    renderConversationsList();
    renderCurrentChat();
}

function saveConversationsToStorage() {
    try {
        localStorage.setItem("basketcoach_conversations", JSON.stringify(conversations));
    } catch (e) {
        console.warn("[Storage] Erro ao salvar conversas no localStorage:", e);
    }
}

function initNewChatInstance() {
    const newId = 'chat-' + Date.now();
    const newChat = {
        id: newId,
        title: "Nova Prancheta",
        createdAt: Date.now(),
        history: [ SYSTEM_PROMPT ]
    };
    conversations.unshift(newChat);
    currentChatId = newId;
    saveConversationsToStorage();
    return newChat;
}

function createNewChat() {
    initNewChatInstance();
    renderConversationsList();
    renderCurrentChat();
    // Foca no input
    const input = document.getElementById('user-input');
    if (input) input.focus();
}

function selectChat(id) {
    if (currentChatId === id) return;
    currentChatId = id;
    renderConversationsList();
    renderCurrentChat();
}

function deleteChat(id, event) {
    if (event) event.stopPropagation();
    conversations = conversations.filter(c => c.id !== id);
    if (conversations.length === 0) {
        initNewChatInstance();
    } else if (currentChatId === id) {
        currentChatId = conversations[0].id;
    }
    saveConversationsToStorage();
    renderConversationsList();
    renderCurrentChat();
}

function clearAllChats() {
    if (!confirm("Deseja realmente limpar todo o histórico de pranchetas?")) return;
    conversations = [];
    initNewChatInstance();
    renderConversationsList();
    renderCurrentChat();
}

function getCurrentChat() {
    let chat = conversations.find(c => c.id === currentChatId);
    if (!chat) {
        chat = initNewChatInstance();
    }
    return chat;
}

function renderConversationsList() {
    const list = document.getElementById('conversations-list');
    if (!list) return;

    list.innerHTML = '';
    conversations.forEach(chat => {
        const isActive = chat.id === currentChatId;
        const item = document.createElement('div');
        item.className = `group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
            isActive 
                ? 'bg-black text-[#FF6B00] font-black shadow-md scale-[1.02]' 
                : 'text-black/85 hover:bg-black/10 font-bold'
        }`;
        item.onclick = () => selectChat(chat.id);

        item.innerHTML = `
            <div class="flex items-center space-x-2.5 overflow-hidden flex-1 mr-2">
                <i class="fa-solid fa-clipboard text-xs shrink-0 ${isActive ? 'text-[#FF6B00]' : 'text-black/60'}"></i>
                <span class="text-xs truncate tracking-tight">${escapeHtml(chat.title || 'Prancheta')}</span>
            </div>
            <button onclick="deleteChat('${chat.id}', event)" title="Excluir" class="opacity-0 group-hover:opacity-100 hover:text-red-600 transition p-1 shrink-0 ${isActive ? 'text-zinc-400 hover:text-red-400' : 'text-black/60'}">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

function renderCurrentChat() {
    const chat = getCurrentChat();
    const chatContainer = document.getElementById('chat-messages');
    const welcomeScreen = document.getElementById('welcome-screen');
    const messagesContainer = document.getElementById('chat-messages-container');

    if (!chatContainer) return;
    chatContainer.innerHTML = '';

    // Filtra mensagens que não sejam o system prompt
    const userOrAssistantMessages = chat.history.filter(m => m.role !== 'system');

    if (userOrAssistantMessages.length === 0) {
        // Exibe a tela inicial elaborada e oculta a área de balões
        if (welcomeScreen) welcomeScreen.classList.remove('hidden');
        if (messagesContainer) messagesContainer.classList.add('hidden');
    } else {
        // Exibe as mensagens e oculta a tela inicial
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        if (messagesContainer) messagesContainer.classList.remove('hidden');

        userOrAssistantMessages.forEach(msg => {
            if (msg.role === 'user') {
                appendUserMessageToDOM(msg.content, msg.time || getCurrentTime());
            } else if (msg.role === 'assistant') {
                appendAssistantMessageToDOM(msg.content, msg.time || getCurrentTime());
            }
        });

        const mainContainer = document.getElementById('main-container');
        if (mainContainer) mainContainer.scrollTop = mainContainer.scrollHeight;
    }
}

// Inicia um prompt a partir de um dos cards da tela inicial
function startPrompt(text) {
    const input = document.getElementById('user-input');
    if (input) {
        input.value = text;
        sendMessage();
    }
}

// =========================================================================
// CARREGAMENTO E GERENCIAMENTO DE CONFIGURAÇÕES AZURE OPENAI
// Ordem de prioridade:
// 1º - LocalStorage (azureConfig)
// 2º - env.json
// 3º - Nenhuma configuração (abre modal para preenchimento manual)
// =========================================================================

function isConfigValid(cfg) {
    if (!cfg || typeof cfg !== 'object') return false;
    const apiKey = (cfg.apiKey || '').trim();
    const endpoint = (cfg.endpoint || '').trim();
    const model = (cfg.model || '').trim();

    const placeholders = ['SUA_CHAVE_API', 'SEU_ENDPOINT', 'SEU_MODELO'];
    if (!apiKey || placeholders.includes(apiKey)) return false;
    if (!endpoint || placeholders.includes(endpoint)) return false;
    if (!model || placeholders.includes(model)) return false;

    return true;
}

async function fetchEnvJson() {
    try {
        const response = await fetch('env.json', { cache: 'no-store' });
        if (!response.ok) {
            console.warn(`[Config] Não foi possível obter env.json (Status: ${response.status})`);
            return null;
        }
        return await response.json();
    } catch (err) {
        console.warn("[Config] Arquivo env.json inexistente ou com formato JSON inválido:", err);
        return null;
    }
}

async function loadConfig() {
    // 1º — Prioridade: LocalStorage
    try {
        const stored = localStorage.getItem("azureConfig");
        if (stored) {
            const parsed = JSON.parse(stored);
            if (isConfigValid(parsed)) {
                azureConfig = {
                    apiKey: parsed.apiKey.trim(),
                    endpoint: parsed.endpoint.trim(),
                    model: parsed.model.trim()
                };
                populateModalFields(azureConfig);
                return;
            }
        }
    } catch (e) {
        console.warn("[Config] Erro ao ler azureConfig do localStorage:", e);
    }

    // 2º — Prioridade: env.json
    const envData = await fetchEnvJson();
    if (envData && isConfigValid(envData)) {
        azureConfig = {
            apiKey: envData.apiKey.trim(),
            endpoint: envData.endpoint.trim(),
            model: envData.model.trim()
        };
        populateModalFields(azureConfig);
        try {
            localStorage.setItem("azureConfig", JSON.stringify(azureConfig));
        } catch (e) {
            console.warn("[Config] Não foi possível salvar env.json no localStorage:", e);
        }
        return;
    }

    // 3º — Nenhuma configuração válida encontrada
    if (envData && typeof envData === 'object') {
        populateModalFields(envData);
    }
    openConfigModal("Por favor, configure sua Chave de API, Endpoint e Modelo para iniciar.");
}

function populateModalFields(cfg) {
    const keyInput = document.getElementById('modal-api-key');
    const endpointInput = document.getElementById('modal-endpoint');
    const modelInput = document.getElementById('modal-model');

    if (keyInput && cfg.apiKey) keyInput.value = cfg.apiKey;
    if (endpointInput && cfg.endpoint) endpointInput.value = cfg.endpoint;
    if (modelInput && cfg.model) modelInput.value = cfg.model;
}

// =========================================================================
// CONTROLE DO MODAL DE CONFIGURAÇÕES
// =========================================================================

function openConfigModal(initialMessage = "") {
    const modal = document.getElementById('config-modal');
    const feedback = document.getElementById('modal-feedback');
    if (modal) modal.classList.remove('hidden');

    if (feedback) {
        if (initialMessage) {
            feedback.textContent = initialMessage;
            feedback.className = "text-xs font-medium py-1 text-brand-orange block";
        } else {
            feedback.textContent = "";
            feedback.className = "text-xs font-medium py-1 hidden";
        }
    }
}

function closeConfigModal() {
    const modal = document.getElementById('config-modal');
    if (modal) modal.classList.add('hidden');
}

function handleSaveConfig(event) {
    if (event) event.preventDefault();

    const apiKey = document.getElementById('modal-api-key').value.trim();
    const endpoint = document.getElementById('modal-endpoint').value.trim();
    const model = document.getElementById('modal-model').value.trim();
    const feedback = document.getElementById('modal-feedback');

    if (!apiKey || !endpoint || !model) {
        if (feedback) {
            feedback.textContent = "Todos os campos são obrigatórios.";
            feedback.className = "text-xs font-medium py-1 text-red-400 block";
        }
        return;
    }

    if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
        if (feedback) {
            feedback.textContent = "Endpoint inválido. Ele deve iniciar com https:// ou http://";
            feedback.className = "text-xs font-medium py-1 text-red-400 block";
        }
        return;
    }

    const newConfig = { apiKey, endpoint, model };

    try {
        localStorage.setItem("azureConfig", JSON.stringify(newConfig));
    } catch (e) {
        console.warn("[Config] Falha ao persistir no localStorage:", e);
    }

    azureConfig = newConfig;

    if (feedback) {
        feedback.textContent = "Configurações salvas com sucesso!";
        feedback.className = "text-xs font-medium py-1 text-green-400 block";
    }

    setTimeout(() => {
        closeConfigModal();
    }, 700);
}

// =========================================================================
// ENVIO DE MENSAGENS E INTEGRAÇÃO AZURE OPENAI
// =========================================================================

function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const inputField = document.getElementById('user-input');
    const text = inputField.value.trim();
    if (!text) return;

    if (!isConfigValid(azureConfig)) {
        openConfigModal("Por favor, preencha as configurações da API antes de enviar uma mensagem.");
        return;
    }

    const chat = getCurrentChat();

    // Se a conversa ainda estiver vazia, cria título a partir dos primeiros caracteres
    if (chat.history.filter(m => m.role !== 'system').length === 0) {
        const cleanTitle = text.length > 28 ? text.substring(0, 28) + '...' : text;
        chat.title = cleanTitle;
        renderConversationsList();
    }

    // Oculta a tela inicial e exibe o container do chat
    const welcomeScreen = document.getElementById('welcome-screen');
    const messagesContainer = document.getElementById('chat-messages-container');
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    if (messagesContainer) messagesContainer.classList.remove('hidden');

    const timeStr = getCurrentTime();

    // Registra e exibe a mensagem do usuário
    appendUserMessageToDOM(text, timeStr);
    chat.history.push({ role: 'user', content: text, time: timeStr });
    saveConversationsToStorage();
    inputField.value = '';

    // Animação de carregamento do assistente
    const loadingId = 'loading-' + Date.now();
    appendLoadingMessageToDOM(loadingId);

    try {
        // Envia apenas o formato { role, content } esperado pela API
        const payloadMessages = chat.history.map(m => ({ role: m.role, content: m.content }));

        const response = await fetch(azureConfig.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${azureConfig.apiKey}`,
                'api-key': azureConfig.apiKey
            },
            body: JSON.stringify({
                messages: payloadMessages,
                max_completion_tokens: 13107,
                temperature: 1,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
                stop: [],
                model: azureConfig.model
            })
        });

        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const assistantReply = data.choices && data.choices[0] && data.choices[0].message 
            ? data.choices[0].message.content 
            : "Resposta vazia retornada pela API.";

        const replyTime = getCurrentTime();
        appendAssistantMessageToDOM(assistantReply, replyTime);
        chat.history.push({ role: 'assistant', content: assistantReply, time: replyTime });
        saveConversationsToStorage();

    } catch (error) {
        console.error("Erro na Requisição:", error);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        const errTime = getCurrentTime();
        appendAssistantMessageToDOM(`Erro no Endpoint: ${error.message}`, errTime, true);
    }
}

// Balão de Mensagem do Usuário
function appendUserMessageToDOM(text, time) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex flex-col items-end w-full space-y-1';

    messageDiv.innerHTML = `
        <div class="text-[11px] font-bold text-zinc-400 tracking-wider mr-1">
            VOCÊ <span class="font-normal text-zinc-500">${time}</span>
        </div>
        <div class="bg-brand-orange text-black p-4 rounded-2xl rounded-tr-none max-w-[85%] sm:max-w-[75%] font-medium text-sm shadow-xl shadow-brand-orange/10 relative">
            <div>${escapeHtml(text)}</div>
            <div class="flex items-center justify-end space-x-1 text-[10px] font-bold text-black/70 mt-1">
                <span>${time}</span>
                <i class="fa-solid fa-check-double text-[9px]"></i>
            </div>
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) mainContainer.scrollTop = mainContainer.scrollHeight;
}

// Balão de Mensagem da IA
function appendAssistantMessageToDOM(text, time, isError = false) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3 w-full max-w-[90%] sm:max-w-[85%]';

    messageDiv.innerHTML = `
        <div class="relative shrink-0 mt-1">
            <div class="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-brand-orange text-sm shadow-md">
                <i class="fa-solid fa-basketball"></i>
            </div>
            <span class="w-2.5 h-2.5 rounded-full bg-brand-orange border-2 border-[#0B0D12] absolute -bottom-0.5 -right-0.5"></span>
        </div>
        <div class="flex-1 space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <span class="font-bold text-sm text-white tracking-wide">BasketCoach AI</span>
                    <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 tracking-wider">PRO TACTICAL</span>
                </div>
                <span class="text-[11px] text-zinc-500 font-medium">${time}</span>
            </div>
            <div class="p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed ${isError ? 'bg-red-950/60 border border-red-800 text-red-200' : 'bg-[#161922] border border-[#1F2430] text-zinc-200'} shadow-lg">
                <div class="whitespace-pre-wrap">${escapeHtml(text)}</div>
            </div>
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) mainContainer.scrollTop = mainContainer.scrollHeight;
}

// Indicador de Carregamento da IA
function appendLoadingMessageToDOM(id) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.id = id;
    messageDiv.className = 'flex items-start space-x-3 w-full max-w-[85%]';

    messageDiv.innerHTML = `
        <div class="relative shrink-0 mt-1">
            <div class="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-brand-orange text-sm shadow-md">
                <i class="fa-solid fa-basketball"></i>
            </div>
            <span class="w-2.5 h-2.5 rounded-full bg-brand-orange border-2 border-[#0B0D12] absolute -bottom-0.5 -right-0.5 animate-pulse"></span>
        </div>
        <div class="flex-1 space-y-2">
            <div class="flex items-center space-x-2">
                <span class="font-bold text-sm text-white tracking-wide">BasketCoach AI</span>
                <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 tracking-wider">PRO TACTICAL</span>
            </div>
            <div class="p-4 rounded-2xl rounded-tl-none bg-[#161922] border border-[#1F2430] text-zinc-400 flex items-center space-x-2 w-max">
                <div class="w-2 h-2 rounded-full bg-brand-orange animate-bounce"></div>
                <div class="w-2 h-2 rounded-full bg-brand-orange animate-bounce [animation-delay:-.2s]"></div>
                <div class="w-2 h-2 rounded-full bg-brand-orange animate-bounce [animation-delay:-.4s]"></div>
                <span class="text-xs ml-2">Analisando jogada...</span>
            </div>
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) mainContainer.scrollTop = mainContainer.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =========================================================================
// MINIGAME DE BASQUETE (CANVAS COM FÍSICA E CONTROLE DE ARREMESSO)
// =========================================================================

let gameAnimId = null;
let gameActive = false;

const gameState = {
    score: 0,
    baskets: 0,
    totalShots: 10,
    shotsRemaining: 10,
    isAiming: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    ball: {
        x: 120,
        y: 280,
        vx: 0,
        vy: 0,
        radius: 14,
        isFlying: false,
        hasScored: false
    },
    hoop: {
        backboardX: 535,
        backboardY: 85,
        backboardW: 10,
        backboardH: 80,
        rimX: 470,
        rimY: 135,
        rimW: 55,
        rimH: 6
    }
};

function openMinigameModal() {
    const modal = document.getElementById('minigame-modal');
    if (modal) {
        modal.classList.remove('hidden');
        resetGame();
        initCanvasGame();
    }
}

function closeMinigameModal() {
    const modal = document.getElementById('minigame-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    gameActive = false;
    if (gameAnimId) {
        cancelAnimationFrame(gameAnimId);
        gameAnimId = null;
    }
}

function resetGame() {
    gameState.score = 0;
    gameState.baskets = 0;
    gameState.shotsRemaining = gameState.totalShots;
    gameState.isAiming = false;
    resetBallPosition();

    const scoreEl = document.getElementById('game-score');
    const basketsEl = document.getElementById('game-baskets');
    const shotsLeftEl = document.getElementById('game-shots-left');
    const gameOverScreen = document.getElementById('game-over-screen');

    if (scoreEl) scoreEl.textContent = '0';
    if (basketsEl) basketsEl.textContent = '0/10';
    if (shotsLeftEl) shotsLeftEl.textContent = '10';
    if (gameOverScreen) gameOverScreen.classList.add('hidden');

    gameActive = true;
}

function resetBallPosition() {
    gameState.ball.x = 120;
    gameState.ball.y = 280;
    gameState.ball.vx = 0;
    gameState.ball.vy = 0;
    gameState.ball.isFlying = false;
    gameState.ball.hasScored = false;
}

function initCanvasGame() {
    const canvas = document.getElementById('basketball-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Remove event listeners antigos clonando ou usando handlers nomeados
    canvas.onmousedown = handleMouseDown;
    window.onmousemove = handleMouseMove;
    window.onmouseup = handleMouseUp;

    // Touch support
    canvas.ontouchstart = handleTouchStart;
    window.ontouchmove = handleTouchMove;
    window.ontouchend = handleTouchEnd;

    // Teclado (ESC fecha)
    window.onkeydown = (e) => {
        if (e.key === 'Escape') closeMinigameModal();
    };

    gameActive = true;
    if (gameAnimId) cancelAnimationFrame(gameAnimId);
    gameLoop(ctx, canvas);
}

function getCanvasCoords(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handleMouseDown(e) {
    if (!gameActive || gameState.ball.isFlying || gameState.shotsRemaining <= 0) return;
    const canvas = document.getElementById('basketball-canvas');
    const coords = getCanvasCoords(canvas, e.clientX, e.clientY);
    
    // Inicia arrasto se estiver próximo à bola
    const dist = Math.hypot(coords.x - gameState.ball.x, coords.y - gameState.ball.y);
    if (dist < 50) {
        gameState.isAiming = true;
        gameState.dragStart = { x: gameState.ball.x, y: gameState.ball.y };
        gameState.dragCurrent = { x: coords.x, y: coords.y };
    }
}

function handleMouseMove(e) {
    if (!gameState.isAiming) return;
    const canvas = document.getElementById('basketball-canvas');
    if (!canvas) return;
    const coords = getCanvasCoords(canvas, e.clientX, e.clientY);
    gameState.dragCurrent = coords;
}

function handleMouseUp() {
    if (!gameState.isAiming) return;
    gameState.isAiming = false;
    launchBall();
}

function handleTouchStart(e) {
    if (e.touches.length > 0) {
        handleMouseDown(e.touches[0]);
    }
}

function handleTouchMove(e) {
    if (e.touches.length > 0) {
        handleMouseMove(e.touches[0]);
    }
}

function handleTouchEnd() {
    handleMouseUp();
}

function launchBall() {
    if (gameState.ball.isFlying || gameState.shotsRemaining <= 0) return;

    const dx = gameState.dragStart.x - gameState.dragCurrent.x;
    const dy = gameState.dragStart.y - gameState.dragCurrent.y;
    const power = Math.hypot(dx, dy);

    if (power < 10) return; // Arraste desprezível

    // Vetor de lançamento proporcional
    const forceMultiplier = 0.15;
    gameState.ball.vx = dx * forceMultiplier;
    gameState.ball.vy = dy * forceMultiplier;
    gameState.ball.isFlying = true;
    gameState.ball.hasScored = false;

    gameState.shotsRemaining--;
    const shotsLeftEl = document.getElementById('game-shots-left');
    if (shotsLeftEl) shotsLeftEl.textContent = gameState.shotsRemaining;
}

function triggerBasketFeedback() {
    const feedback = document.getElementById('game-feedback-text');
    if (feedback) {
        feedback.classList.remove('opacity-0');
        feedback.classList.add('opacity-100');
        setTimeout(() => {
            feedback.classList.remove('opacity-100');
            feedback.classList.add('opacity-0');
        }, 800);
    }
}

function showGameOver() {
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreEl = document.getElementById('game-final-score');
    const finalBasketsEl = document.getElementById('game-final-baskets');
    const finalAccEl = document.getElementById('game-final-acc');

    const accuracy = Math.round((gameState.baskets / gameState.totalShots) * 100);

    if (finalScoreEl) finalScoreEl.textContent = gameState.score;
    if (finalBasketsEl) finalBasketsEl.textContent = `${gameState.baskets}/${gameState.totalShots}`;
    if (finalAccEl) finalAccEl.textContent = `${accuracy}%`;

    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
}

function updatePhysics(canvas) {
    const b = gameState.ball;
    const hoop = gameState.hoop;
    if (!b.isFlying) return;

    // Gravidade e atrito do ar
    b.vy += 0.38;
    b.x += b.vx;
    b.y += b.vy;

    // Colisão com o chão
    if (b.y + b.radius >= canvas.height - 20) {
        b.y = canvas.height - 20 - b.radius;
        b.vy = -b.vy * 0.55;
        b.vx *= 0.7;

        // Se a velocidade for muito baixa após tocar o chão, reinicia a bola
        if (Math.abs(b.vy) < 1.2 && Math.abs(b.vx) < 1) {
            setTimeout(() => {
                if (gameState.shotsRemaining > 0) {
                    resetBallPosition();
                } else {
                    showGameOver();
                }
            }, 300);
            b.isFlying = false;
        }
    }

    // Colisão com as paredes laterais
    if (b.x - b.radius <= 0) {
        b.x = b.radius;
        b.vx = -b.vx * 0.6;
    }
    if (b.x + b.radius >= canvas.width) {
        b.x = canvas.width - b.radius;
        b.vx = -b.vx * 0.6;
    }

    // Colisão com a Tabela (Backboard)
    if (
        b.x + b.radius >= hoop.backboardX &&
        b.x - b.radius <= hoop.backboardX + hoop.backboardW &&
        b.y >= hoop.backboardY &&
        b.y <= hoop.backboardY + hoop.backboardH
    ) {
        b.x = hoop.backboardX - b.radius;
        b.vx = -b.vx * 0.65;
    }

    // Colisão com a borda frontal do aro (Aro esquerdo)
    const frontRimDist = Math.hypot(b.x - hoop.rimX, b.y - hoop.rimY);
    if (frontRimDist < b.radius + 3) {
        b.vx = -b.vx * 0.6;
        b.vy = -b.vy * 0.6;
    }

    // Detecção de Cesta Válida:
    // Bola passando descendo (vy > 0) entre as coordenadas do aro
    const rimLeft = hoop.rimX + 4;
    const rimRight = hoop.rimX + hoop.rimW - 4;
    if (
        !b.hasScored &&
        b.vy > 0 &&
        b.x > rimLeft &&
        b.x < rimRight &&
        b.y >= hoop.rimY - 2 &&
        b.y <= hoop.rimY + 14
    ) {
        b.hasScored = true;
        gameState.score += 2;
        gameState.baskets += 1;

        const scoreEl = document.getElementById('game-score');
        const basketsEl = document.getElementById('game-baskets');
        if (scoreEl) scoreEl.textContent = gameState.score;
        if (basketsEl) basketsEl.textContent = `${gameState.baskets}/${gameState.totalShots}`;

        triggerBasketFeedback();
    }
}

function drawGame(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo da Quadra / Ginásio Moderno
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0D111A');
    grad.addColorStop(1, '#080A0F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Piso de madeira estético / Linha de fundo
    ctx.fillStyle = '#141824';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 20);
    ctx.lineTo(canvas.width, canvas.height - 20);
    ctx.stroke();

    // Suporte e Poste da Tabela
    const hoop = gameState.hoop;
    ctx.strokeStyle = '#272E3F';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hoop.backboardX + hoop.backboardW, hoop.backboardY + 30);
    ctx.lineTo(canvas.width, hoop.backboardY + 10);
    ctx.lineTo(canvas.width, canvas.height - 20);
    ctx.stroke();

    // Tabela (Backboard de acrílico)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.fillRect(hoop.backboardX, hoop.backboardY, hoop.backboardW, hoop.backboardH);
    ctx.strokeRect(hoop.backboardX, hoop.backboardY, hoop.backboardW, hoop.backboardH);

    // Retângulo central da tabela
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hoop.backboardX - 1, hoop.rimY - 25, 3, 25);

    // Rede de basquete
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hoop.rimX, hoop.rimY);
    ctx.lineTo(hoop.rimX + 8, hoop.rimY + 28);
    ctx.lineTo(hoop.rimX + hoop.rimW - 8, hoop.rimY + 28);
    ctx.lineTo(hoop.rimX + hoop.rimW, hoop.rimY);
    ctx.stroke();

    // Aro de basquete (Laranja vibrante)
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hoop.rimX, hoop.rimY);
    ctx.lineTo(hoop.rimX + hoop.rimW, hoop.rimY);
    ctx.stroke();

    // Linha de mira quando estiver arrastando
    if (gameState.isAiming) {
        ctx.strokeStyle = 'rgba(255, 107, 0, 0.7)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gameState.ball.x, gameState.ball.y);
        const aimX = gameState.ball.x + (gameState.dragStart.x - gameState.dragCurrent.x);
        const aimY = gameState.ball.y + (gameState.dragStart.y - gameState.dragCurrent.y);
        ctx.lineTo(aimX, aimY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Desenha a Bola de Basquete
    const b = gameState.ball;
    ctx.save();
    ctx.translate(b.x, b.y);

    // Esfera Laranja
    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();

    // Linhas pretas da bola
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-b.radius, 0);
    ctx.lineTo(b.radius, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -b.radius);
    ctx.lineTo(0, b.radius);
    ctx.stroke();

    ctx.restore();
}

function gameLoop(ctx, canvas) {
    if (!gameActive) return;
    updatePhysics(canvas);
    drawGame(ctx, canvas);
    gameAnimId = requestAnimationFrame(() => gameLoop(ctx, canvas));
}

// =========================================================================
// INICIALIZAÇÃO GERAL DA APLICAÇÃO
// =========================================================================

window.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadConversationsFromStorage();
});
