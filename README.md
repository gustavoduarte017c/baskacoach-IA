# 🏀 BasketCoach AI

O **BasketCoach AI** é uma aplicação Web de inteligência artificial de alta performance desenvolvida para atuar como um treinador e assistente tático estritamente especializado em basquete (NBA, FIBA, mecânica de arremessos, táticas e mentalidade de jogo). 

A aplicação foi projetada com um design moderno em modo escuro total (`#000000`), quadra tática minimalista de fundo, balões de conversação personalizados e integração direta com o **Azure OpenAI**.

---

## 🚀 Funcionalidades Principais

* **Especialização Estrita (Apenas Basquete):** A inteligência artificial é configurada com um perfil rigoroso para recusar qualquer assunto fora do universo do basquete, mantendo o foco total no desempenho do atleta.
* **Perfil de Treinador Implacável:** Comportamento focado em alta performance, disciplina e superação física/mental.
* **Sem Markdown:** Respostas limpas em texto puro, sem formatações indesejadas (como asteriscos ou hashtags), proporcionando uma leitura fluida e natural no chat.
* **Interface Estilizada (Dark Mode):** 
  * Fundo totalmente preto (`#000000`).
  * Detalhes em laranja vibrante (`#FF6B00`).
  * Fundo de quadra tática vetorial estilizado.
  * Horários e indicadores de envio/status nas mensagens.
* **Integração com Azure OpenAI:** Suporte completo aos parâmetros de requisição (`max_completion_tokens`, `temperature`, `model`, etc.) e tratamento robusto de erros.
* **Gerenciamento Dinâmico de Credenciais:** Configuração de credenciais via arquivo `env.json` ou diretamente pela interface através de modal interativo.

---

## ⚙️ Configurações da API Azure OpenAI

A aplicação permite configurar a conexão com o Azure OpenAI de forma flexível e desacoplada do código-fonte.

### 1. Arquivo `env.json`
Na raiz do projeto, o arquivo `env.json` serve para definir os parâmetros da Azure para desenvolvimento ou execução local sem expô-los no script principal:

```json
{
  "apiKey": "SUA_CHAVE_API",
  "endpoint": "SEU_ENDPOINT",
  "model": "SEU_MODELO"
}
```

* **apiKey:** Sua chave secreta de acesso à API do Azure OpenAI.
* **endpoint:** A URL completa do endpoint de completions do seu deployment Azure (ex: `https://<seu-recurso>.openai.azure.com/openai/deployments/<modelo>/chat/completions?api-version=2024-02-15-preview`).
* **model:** O nome do modelo implantado (ex: `gpt-4.1-mini`).

### 2. Configurações pelo Chatbot (Modal na Interface)
Você pode configurar ou atualizar as credenciais a qualquer momento diretamente pelo navegador:
1. Clique no botão **⚙ Configurações** no canto superior direito do cabeçalho.
2. Preencha os campos solicitados:
   * **Chave da API** (campo protegido com máscara de senha).
   * **Endpoint da Azure**.
   * **Modelo**.
3. Clique em **Salvar** para aplicar. O sistema validará se todos os campos estão preenchidos e exibirá uma mensagem de confirmação.
4. Para sair sem salvar, clique em **Cancelar** ou no botão de fechar (`✕`).

### 3. Ordem de Prioridade das Configurações
O chatbot segue a seguinte hierarquia ao inicializar:
1. **1º — LocalStorage:** Se já houver configurações salvas anteriormente pelo usuário no navegador (`localStorage`), elas terão prioridade máxima.
2. **2º — `env.json`:** Se não houver dados no `localStorage`, o sistema tentará carregar o arquivo `env.json`. Se o arquivo for válido, os dados serão carregados e copiados para o `localStorage`.
3. **3º — Nenhuma configuração (Manual):** Se o `env.json` não existir ou estiver vazio/inválido e não houver dados salvos no `localStorage`, o modal de configurações será aberto automaticamente para que o usuário informe os dados necessários.

### 4. Armazenamento Local
As credenciais definidas pelo usuário ou carregadas do `env.json` são salvas no `localStorage` do navegador sob a chave:
```javascript
localStorage.setItem("azureConfig", JSON.stringify(config));
```

### 5. Ciclo de Inicialização
Ao carregar a página (`DOMContentLoaded`), a aplicação executa a função assíncrona `loadConfig()`, garantindo que as configurações estejam prontas antes de qualquer tentativa de envio de mensagens para a IA. Se o usuário tentar enviar uma mensagem antes de configurar a API, o modal de configurações será acionado imediatamente.

### 6. Tratamento de Erros
O sistema possui tratamento robusto para falhas operacionais:
* **`env.json` inexistente ou inválido:** O erro de carregamento ou parsing é interceptado sem travar a interface; o sistema passa para o modo de configuração manual.
* **Configurações incompletas:** O envio de mensagens é bloqueado até que todos os três campos estejam válidos. No modal, é exibido aviso de campos obrigatórios.
* **Endpoint ou URL inválidos:** É feita validação de formato no preenchimento e exibição amigável do erro caso a requisição HTTP falhe (exibindo o status HTTP e a resposta de erro retornada pelo Azure OpenAI no próprio balão do assistente).

---

## 🔒 Segurança

> [!WARNING]
> **Importante para Ambientes de Produção:**
> Como este chatbot é executado diretamente no navegador do usuário (lado do cliente / frontend), qualquer chave de API inserida, armazenada em `localStorage` ou transmitida via JavaScript **não é confidencial** e pode ser visualizada inspecionando o navegador (DevTools / Network / Application).
> 
> Esta arquitetura destina-se a fins didáticos, prototipagem e desenvolvimento local. Para colocar a aplicação em produção aberta a terceiros, **recomenda-se implementar um backend intermediário (BFF/Proxy)** onde as chaves da API permaneçam protegidas em variáveis de ambiente seguras no servidor.

---

## 📂 Arquivos do Projeto

```text
basketcoach-ai/
│
├── index.html       # Estrutura HTML da interface, layout do chat e modal de configurações
├── styles.css       # Estilos customizados, tema escuro e fundo de quadra tática
├── script.js        # Lógica de integração com Azure OpenAI, prioridade de credenciais e histórico
├── env.json         # Arquivo de configuração local das credenciais da API Azure OpenAI
└── README.md        # Documentação completa do projeto, guia de uso e especificações
```
