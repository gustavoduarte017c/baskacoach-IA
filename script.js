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

// Histórico inicial de conversa com a diretriz do assistente
let conversationHistory = [
    {
        role: "system",
        content: "Você é o BasketCoach AI, um treinador de basquete implacável, motivador e especialista em alta performance. Fale apenas sobre basquete, estratégias de quadra, mentalidade de jogo e superação física. ATENÇÃO: NUNCA utilize formatação Markdown nas suas respostas (sem asteriscos para negrito, sem hashtags para títulos, sem listas com marcadores em markdown). Escreva tudo em texto puro, de forma direta e corrida."
    }
];

// =========================================================================
// CARREGAMENTO E GERENCIAMENTO DE CONFIGURAÇÕES
// Ordem de prioridade:
// 1º - LocalStorage (azureConfig)
// 2º - env.json
// 3º - Nenhuma configuração (abre modal para preenchimento manual)
// =========================================================================

/**
 * Valida se um objeto de configuração possui os 3 campos preenchidos e válidos.
 */
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

/**
 * Carrega o arquivo env.json via fetch tratando erros de requisição ou JSON inválido.
 */
async function fetchEnvJson() {
    try {
        const response = await fetch('env.json', { cache: 'no-store' });
        if (!response.ok) {
            console.warn(`[Config] Não foi possível obter env.json (Status: ${response.status})`);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (err) {
        console.warn("[Config] Arquivo env.json inexistente ou com formato JSON inválido:", err);
        return null;
    }
}

/**
 * Função principal de carregamento das configurações conforme a ordem de prioridade.
 */
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
    // Preenche com o que existir parcialmente (ou vazio) no modal e abre o modal para o usuário
    if (envData && typeof envData === 'object') {
        populateModalFields(envData);
    }
    openConfigModal("Por favor, configure sua Chave de API, Endpoint e Modelo para iniciar.");
}

/**
 * Preenche os inputs do modal com os dados fornecidos.
 */
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

/**
 * Manipula a submissão e salvamento das configurações pelo modal.
 */
function handleSaveConfig(event) {
    if (event) event.preventDefault();

    const apiKey = document.getElementById('modal-api-key').value.trim();
    const endpoint = document.getElementById('modal-endpoint').value.trim();
    const model = document.getElementById('modal-model').value.trim();
    const feedback = document.getElementById('modal-feedback');

    // Validação de campos obrigatórios
    if (!apiKey || !endpoint || !model) {
        if (feedback) {
            feedback.textContent = "Todos os campos são obrigatórios.";
            feedback.className = "text-xs font-medium py-1 text-red-400 block";
        }
        return;
    }

    // Validação básica do endpoint para evitar requisições malformadas
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
        appendAssistantMessage("Configurações salvas com sucesso! Pronto para treinar na quadra.", getCurrentTime());
    }, 700);
}

// =========================================================================
// FUNÇÕES UTILITÁRIAS E INTERFACE DE MENSAGENS
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

// =========================================================================
// ENVIO DE MENSAGENS E INTEGRAÇÃO AZURE OPENAI
// =========================================================================

async function sendMessage() {
    const inputField = document.getElementById('user-input');
    const text = inputField.value.trim();
    if (!text) return;

    // Garante que as configurações estejam preenchidas antes de prosseguir
    if (!isConfigValid(azureConfig)) {
        openConfigModal("Por favor, preencha as configurações da API antes de enviar uma mensagem.");
        return;
    }

    const timeStr = getCurrentTime();

    // Adiciona mensagem do usuário na tela
    appendUserMessage(text, timeStr);
    conversationHistory.push({ role: 'user', content: text });
    inputField.value = '';

    // Animação de carregamento do assistente
    const loadingId = 'loading-' + Date.now();
    appendLoadingMessage(loadingId);

    try {
        const response = await fetch(azureConfig.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${azureConfig.apiKey}`,
                'api-key': azureConfig.apiKey
            },
            body: JSON.stringify({
                messages: conversationHistory,
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

        // Adiciona resposta do assistente
        appendAssistantMessage(assistantReply, getCurrentTime());
        conversationHistory.push({ role: 'assistant', content: assistantReply });

    } catch (error) {
        console.error("Erro na Requisição:", error);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        appendAssistantMessage(`Erro no Endpoint: ${error.message}`, getCurrentTime(), true);
    }
}

// Balão de Mensagem do Usuário
function appendUserMessage(text, time) {
    const chatContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex flex-col items-end w-full space-y-1';

    messageDiv.innerHTML = `
        <div class="text-[11px] font-bold text-zinc-400 tracking-wider mr-1">
            VOCÊ <span class="font-normal text-zinc-500">${time}</span>
        </div>
        <div class="bg-brand-orange text-black p-4 rounded-2xl rounded-tr-none max-w-[80%] sm:max-w-[70%] font-medium text-sm shadow-xl shadow-brand-orange/10 relative">
            <div>${escapeHtml(text)}</div>
            <div class="flex items-center justify-end space-x-1 text-[10px] font-bold text-black/70 mt-1">
                <span>${time}</span>
                <i class="fa-solid fa-check-double text-[9px]"></i>
            </div>
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Balão de Mensagem da IA
function appendAssistantMessage(text, time, isError = false) {
    const chatContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3 w-full max-w-[85%] sm:max-w-[75%]';

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
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Indicador de Carregamento da IA
function appendLoadingMessage(id) {
    const chatContainer = document.getElementById('chat-messages');
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
                <span class="text-xs ml-2">Analisando tática...</span>
            </div>
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Inicializa o carregamento das configurações ao carregar a página
window.addEventListener('DOMContentLoaded', loadConfig);
