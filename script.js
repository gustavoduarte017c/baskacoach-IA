// =========================================================================
// CONFIGURAÇÕES DA API AZURE OPENAI (PREENCHA COM SEUS DADOS)
// =========================================================================
const AZURE_ENDPOINT = "https://baskacoach-ia.openai.azure.com/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview";
const AZURE_API_KEY = "";
const MODEL_NAME = "gpt-4.1-mini";
// =========================================================================

let conversationHistory = [
    {
        role: "system",
        content: "Você é o BasketCoach AI, um treinador de basquete implacável, motivador e especialista em alta performance. Fale apenas sobre basquete, estratégias de quadra, mentalidade de jogo e superação física. ATENÇÃO: NUNCA utilize formatação Markdown nas suas respostas (sem asteriscos para negrito, sem hashtags para títulos, sem listas com marcadores em markdown). Escreva tudo em texto puro, de forma direta e corrida."
    }
];

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

    if (!AZURE_ENDPOINT || AZURE_ENDPOINT.includes("SEU-RECURSO") || !AZURE_API_KEY || AZURE_API_KEY.includes("SUA_CHAVE")) {
        alert("Por favor, edite o arquivo 'script.js' e preencha as variáveis AZURE_ENDPOINT e AZURE_API_KEY no topo.");
        return;
    }

    const timeStr = getCurrentTime();

    // Adiciona mensagem do usuário
    appendUserMessage(text, timeStr);
    conversationHistory.push({ role: 'user', content: text });
    inputField.value = '';

    // Animação de carregamento do assistente
    const loadingId = 'loading-' + Date.now();
    appendLoadingMessage(loadingId);

    try {
        const response = await fetch(AZURE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AZURE_API_KEY}`,
                'api-key': AZURE_API_KEY
            },
            body: JSON.stringify({
                messages: conversationHistory,
                max_completion_tokens: 13107,
                temperature: 1,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
                stop: [],
                model: MODEL_NAME
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

// Balão de Mensagem do Usuário (Laranja vivo conforme a imagem)
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

// Balão de Mensagem da IA (Escuro com cabeçalho conforme a imagem)
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