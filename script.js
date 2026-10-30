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
        item.className = `group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all ${
            isActive 
                ? 'bg-black text-[#FF6B00] font-black shadow-md scale-[1.01]' 
                : 'text-black/85 hover:bg-black/10 font-bold'
        }`;
        item.onclick = () => selectChat(chat.id);

        const safeTitle = escapeHtml(chat.title || 'Prancheta');
        item.innerHTML = `
            <div class="flex items-center space-x-2 overflow-hidden flex-1 mr-1 min-w-0" title="${safeTitle}">
                <i class="fa-solid fa-clipboard text-[11px] shrink-0 ${isActive ? 'text-[#FF6B00]' : 'text-black/60'}"></i>
                <span class="text-[11px] truncate tracking-tight font-bold max-w-[170px] block leading-tight">${safeTitle}</span>
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
// =========================================================================
// AGENTE GERADOR DE TÍTULOS PARA O HISTÓRICO DE PRANCHETAS
// =========================================================================

/**
 * Sanitiza e formata o título gerado segundo as regras do projeto:
 * - Curto (2 a 6 palavras)
 * - Sem aspas, pontuação final, prefixos ou explicações
 * - Primeira letra maiúscula
 */
function sanitizeConversationTitle(rawTitle) {
    if (!rawTitle || typeof rawTitle !== 'string') return '';

    let cleaned = rawTitle
        .replace(/[\"'\`\*_#~]/g, '')
        .replace(/^(?:t[ií]tulo|assunto|tema|conversa|chat|prancheta)\s*:\s*/i, '')
        .replace(/^[\s\-\–\—\:\.]+/g, '')
        .replace(/[\.\?!,:;]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Lista de termos genéricos que devem ser evitados
    const generic = ['nova conversa', 'novo chat', 'conversa', 'chat', 'mensagem', 'prancheta'];
    if (generic.includes(cleaned.toLowerCase())) {
        return '';
    }

    const words = cleaned.split(' ').filter(w => w.length > 0);
    if (words.length > 6) {
        cleaned = words.slice(0, 6).join(' ');
    } else if (words.length < 1) {
        return '';
    }

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Fallback inteligente e determinístico caso a API esteja indisponível.
 * Extrai o assunto central em 2 a 5 palavras.
 */
function generateFallbackTitle(firstMessage) {
    if (!firstMessage) return 'Prancheta Tática';

    let text = firstMessage
        .replace(/[\"'\`\*_#~]/g, '')
        .replace(/^(?:como|como faço para|eu quero|quero|gostaria de saber como|gostaria de|preciso de|preciso|me ensine|me ajuda a|ajuda com|crie um|qual o|quais os|dicas para|como montar)\s+/i, '')
        .replace(/[\.\?!,:;]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const words = text.split(' ').filter(w => w.length > 0);
    const selected = words.slice(0, 5).join(' ');
    const title = sanitizeConversationTitle(selected);
    return title || 'Prancheta Tática';
}

/**
 * Função central para extrair o texto de respostas da OpenAI,
 * compatível tanto com a Responses API (output_text / output[]) quanto
 * com o formato legado Chat Completions (choices[0].message.content).
 */
function extractAIResponseText(data) {
    if (!data) return '';

    // 1. Atalho direto da Responses API
    if (typeof data.output_text === 'string' && data.output_text.trim()) {
        return data.output_text.trim();
    }

    // 2. Estrutura de array typed output da Responses API
    if (Array.isArray(data.output)) {
        const parts = [];
        for (const item of data.output) {
            if (!item || typeof item !== 'object') continue;
            if (typeof item.text === 'string' && item.text.trim()) {
                parts.push(item.text.trim());
            } else if (Array.isArray(item.content)) {
                for (const part of item.content) {
                    if (part && typeof part.text === 'string' && part.text.trim()) {
                        parts.push(part.text.trim());
                    }
                }
            }
        }
        if (parts.length > 0) return parts.join('\n\n');
    }

    // 3. Fallback para formato choices (Chat Completions)
    if (Array.isArray(data.choices) && data.choices[0]) {
        const choice = data.choices[0];
        if (choice.message && typeof choice.message.content === 'string') {
            return choice.message.content.trim();
        }
        if (typeof choice.text === 'string') {
            return choice.text.trim();
        }
    }

    return '';
}

/**
 * Função central responsável por fazer requisições à IA compatíveis
 * com a Responses API (OpenAI / Azure OpenAI Responses).
 * 
 * - Envia o parâmetro obrigatório 'input' em vez de 'messages'
 * - Mantém todo o histórico e contexto da conversa intacto
 * - Suporta instruções de sistema (system prompt)
 * - Suporta 'max_output_tokens' em vez de parâmetros legados
 * - Trata a resposta retornando o texto limpo gerado pela IA
 */
async function callOpenAIResponseAPI({ input, instructions = null, maxOutputTokens = 4096, temperature = null }) {
    if (!isConfigValid(azureConfig)) {
        throw new Error("Azure OpenAI não configurada");
    }

    // Monta o payload conforme a especificação da Responses API
    const payload = {
        model: azureConfig.model,
        input: input
    };

    if (instructions && typeof instructions === 'string' && instructions.trim()) {
        payload.instructions = instructions.trim();
    }

    if (typeof maxOutputTokens === 'number' && maxOutputTokens > 0) {
        payload.max_output_tokens = maxOutputTokens;
    }

    if (typeof temperature === 'number') {
        payload.temperature = temperature;
    }

    const response = await fetch(azureConfig.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${azureConfig.apiKey}`,
            'api-key': azureConfig.apiKey
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const extractedText = extractAIResponseText(data);
    return extractedText || "Resposta vazia retornada pela API.";
}

async function generateConversationTitleAgent(chatId, firstMessage) {
    if (!firstMessage || !chatId) return;

    const titleInstructions = "Você é um agente especializado em criar títulos curtos e precisos para o histórico lateral de conversas de um app de basquete. Analise o tema principal da primeira mensagem do usuário e gere um título de 2 a 6 palavras.\n\nREGRAS OBRIGATÓRIAS:\n- Retorne APENAS o título puro, sem aspas, sem ponto final e sem nenhuma palavra adicional.\n- Não copie a mensagem inteira.\n- Não inclua explicações ou saudações.\n- Não use títulos genéricos como 'Nova conversa' ou 'Chat'.\n- Priorize aproximadamente 2 a 6 palavras.\n\nExemplos:\nUsuário: Quero melhorar meu arremesso de três pontos no basquete.\nTítulo: Arremesso de 3 pontos\n\nUsuário: Quero criar um sistema de login para meu aplicativo.\nTítulo: Sistema de login\n\nUsuário: Como faço para melhorar meu carro?\nTítulo: Projeto do carro";

    try {
        const rawTitle = await callOpenAIResponseAPI({
            input: [
                {
                    role: "user",
                    content: firstMessage
                }
            ],
            instructions: titleInstructions,
            maxOutputTokens: 50,
            temperature: 0.3
        });

        const cleanTitle = sanitizeConversationTitle(rawTitle);

        if (cleanTitle) {
            applyTitleToConversation(chatId, cleanTitle);
            return;
        }
        throw new Error("Título retornado vazio ou inválido");

    } catch (err) {
        console.warn("[Agente de Título] Usando fallback local para o título:", err.message);
        const fallbackTitle = generateFallbackTitle(firstMessage);
        applyTitleToConversation(chatId, fallbackTitle);
    }
}

function applyTitleToConversation(chatId, title) {
    const chat = conversations.find(c => c.id === chatId);
    if (chat) {
        chat.title = title;
        saveConversationsToStorage();
        renderConversationsList();
    }
}

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

    // Se for a primeira mensagem desta conversa, aciona o Agente Gerador de Título
    const isFirstUserMessage = chat.history.filter(m => m.role !== 'system').length === 0;
    if (isFirstUserMessage) {
        // Título provisório imediato baseado nas primeiras palavras para feedback ágil na UI
        const tempTitle = generateFallbackTitle(text);
        chat.title = tempTitle;
        renderConversationsList();
        saveConversationsToStorage();

        // Aciona o Agente de IA para analisar e refinar o título definitivo
        generateConversationTitleAgent(chat.id, text);
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
        // Separa as instruções de sistema do histórico de mensagens para a Responses API
        let systemInstructions = "";
        const inputHistory = [];

        chat.history.forEach(m => {
            if (m.role === 'system') {
                systemInstructions = systemInstructions 
                    ? systemInstructions + "\n" + m.content 
                    : m.content;
            } else {
                inputHistory.push({
                    role: m.role,
                    content: m.content
                });
            }
        });

        // Chama a função central compatível com a Responses API
        const assistantReply = await callOpenAIResponseAPI({
            input: inputHistory,
            instructions: systemInstructions || SYSTEM_PROMPT.content,
            maxOutputTokens: 4096,
            temperature: 0.7
        });

        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

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
        hasScored: false,
        passedRimEntry: false
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
    gameState.ball.passedRimEntry = false;
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
    const r = gameState.ball.radius;
    coords.x = Math.max(r, Math.min(canvas.width - r, coords.x));
    coords.y = Math.max(r, Math.min(canvas.height - 20 - r, coords.y));
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
    gameState.ball.passedRimEntry = false;

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

    // Guarda posição anterior da bola para checagem de trajetória contínua
    const prevX = b.x;
    const prevY = b.y;

    // Gravidade e atrito
    b.vy += 0.38;
    b.x += b.vx;
    b.y += b.vy;

    // Dimensões do aro e tabela
    const backboardLeft = hoop.backboardX;
    const backboardRight = hoop.backboardX + hoop.backboardW;
    const backboardTop = hoop.backboardY;
    const backboardBottom = hoop.backboardY + hoop.backboardH;

    const rimLeftX = hoop.rimX;
    const rimRightX = hoop.rimX + hoop.rimW;
    const rimY = hoop.rimY;
    const rimThickness = 4;

    // --- COLISÃO COM A TABELA (Backboard) ---
    if (
        b.x + b.radius >= backboardLeft &&
        b.x - b.radius <= backboardRight &&
        b.y + b.radius >= backboardTop &&
        b.y - b.radius <= backboardBottom
    ) {
        if (prevX + b.radius <= backboardLeft) {
            b.x = backboardLeft - b.radius;
            b.vx = -Math.abs(b.vx) * 0.65;
        } else if (prevX - b.radius >= backboardRight) {
            b.x = backboardRight + b.radius;
            b.vx = Math.abs(b.vx) * 0.65;
        } else if (prevY + b.radius <= backboardTop) {
            b.y = backboardTop - b.radius;
            b.vy = -Math.abs(b.vy) * 0.6;
        } else {
            b.x = backboardLeft - b.radius;
            b.vx = -Math.abs(b.vx) * 0.65;
        }
    }

    // --- COLISÃO FÍSICA COM OS PONTOS DO ARO (Aro dianteiro e traseiro) ---
    // Ponto frontal esquerdo do aro
    const dFront = Math.hypot(b.x - rimLeftX, b.y - rimY);
    if (dFront < b.radius + rimThickness) {
        const nx = (b.x - rimLeftX) / (dFront || 1);
        const ny = (b.y - rimY) / (dFront || 1);
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
            b.vx = (b.vx - 1.6 * dot * nx) * 0.65;
            b.vy = (b.vy - 1.6 * dot * ny) * 0.65;
        }
        b.x = rimLeftX + nx * (b.radius + rimThickness);
        b.y = rimY + ny * (b.radius + rimThickness);
    }

    // Ponto traseiro direito do aro
    const dBack = Math.hypot(b.x - rimRightX, b.y - rimY);
    if (dBack < b.radius + rimThickness) {
        const nx = (b.x - rimRightX) / (dBack || 1);
        const ny = (b.y - rimY) / (dBack || 1);
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
            b.vx = (b.vx - 1.6 * dot * nx) * 0.65;
            b.vy = (b.vy - 1.6 * dot * ny) * 0.65;
        }
        b.x = rimRightX + nx * (b.radius + rimThickness);
        b.y = rimY + ny * (b.radius + rimThickness);
    }

    // --- DETECÇÃO RIGOROSA DE CESTA (Área interna invisível de entrada e validação) ---
    // A cesta só é pontuada se a bola:
    // 1. Estiver em queda descendente (b.vy > 0);
    // 2. Estiver entre as extremidades do aro (espaço interno real);
    // 3. Cruzar primeiro o plano superior de entrada da cesta (rimY);
    // 4. Em seguida descer pela área interna da rede (rimY + 6 até rimY + 26);
    // 5. Pontuar exatamente 1 ponto apenas uma vez por jogada.
    const rimInnerLeft = rimLeftX + 5;
    const rimInnerRight = rimRightX - 5;

    if (!b.hasScored && b.vy > 0) {
        // Passo 1: Bola cruza de cima para baixo o topo interno do aro
        if (b.x >= rimInnerLeft && b.x <= rimInnerRight) {
            if (prevY <= rimY && b.y >= rimY) {
                b.passedRimEntry = true;
            }
        }

        // Passo 2: Bola confirma travessia pelo espaço interno da cesta
        if (
            b.passedRimEntry &&
            b.x >= rimInnerLeft &&
            b.x <= rimInnerRight &&
            b.y >= rimY + 6 &&
            b.y <= rimY + 26
        ) {
            b.hasScored = true;
            b.passedRimEntry = false;
            gameState.score += 1; // Exatamente 1 ponto por cesta convertida
            gameState.baskets += 1;

            const scoreEl = document.getElementById('game-score');
            const basketsEl = document.getElementById('game-baskets');
            if (scoreEl) scoreEl.textContent = gameState.score;
            if (basketsEl) basketsEl.textContent = `${gameState.baskets}/${gameState.totalShots}`;

            // Amortecimento suave na rede
            b.vx *= 0.6;
            b.vy *= 0.75;

            triggerBasketFeedback();
        }
    }

    // Se a bola sair da coluna da cesta ou passar do fundo sem validar, reseta a entrada
    if (b.y > rimY + 35 || b.x < rimLeftX - 10 || b.x > rimRightX + 10) {
        b.passedRimEntry = false;
    }

    // --- LIMITES INTERNOS DO MODAL / CANVAS (A bola permanece 100% contida dentro do modal) ---
    const floorY = canvas.height - 20;

    // Parede esquerda
    if (b.x - b.radius <= 0) {
        b.x = b.radius;
        b.vx = -b.vx * 0.6;
    }
    // Parede direita
    if (b.x + b.radius >= canvas.width) {
        b.x = canvas.width - b.radius;
        b.vx = -b.vx * 0.6;
    }
    // Teto superior do modal
    if (b.y - b.radius <= 0) {
        b.y = b.radius;
        b.vy = -b.vy * 0.55;
    }
    // Chão da quadra
    if (b.y + b.radius >= floorY) {
        b.y = floorY - b.radius;
        b.vy = -b.vy * 0.55;
        b.vx *= 0.7;

        // Se a velocidade for muito baixa após tocar o chão, reinicia a bola
        if (Math.abs(b.vy) < 1.2 && Math.abs(b.vx) < 1) {
            b.isFlying = false;
            setTimeout(() => {
                if (gameState.shotsRemaining > 0) {
                    resetBallPosition();
                } else {
                    showGameOver();
                }
            }, 300);
        }
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
