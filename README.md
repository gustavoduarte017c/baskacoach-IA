# 🏀 BasketCoach AI

O **BasketCoach AI** é uma aplicação Web de inteligência artificial de alta performance desenvolvida para atuar como um treinador e assistente tático estritamente especializado em basquete (NBA, FIBA, mecânica de arremessos, táticas e mentalidade de jogo). 

A aplicação foi projetada com um design moderno em modo escuro total (`#000000`), quadra tática minimalista de fundo, balões de conversação personalizados e integração direta com o **Azure OpenAI**.

---

## 🚀 Funcionalidades Principais

* **Especialização Estrita (Apenas Basquete):** A inteligência artificial é configurada com um perfil rigoroso para recusar qualquer assunto fora do universo do basquete, mantendo o foco total no desempenho do atleta.
* **Perfil de Treinador Implacável:** Comportamento focado em alta performance, disciplina e superação física/mental.
* **Sem Markdown:** Respostas limpas em texto puro, sem formatações indesejadas (como asteriscos ou hashtags), proporcionando uma leitura fluida e natural no chat.
* **Barra Lateral com Histórico de Conversas (Pranchetas) e Agente Gerador de Títulos:**
  * Fundo laranja oficial (`#FF6B00`) com tipografia preta em alto contraste.
  * **Agente IA de Títulos Automáticos:** analisa unicamente a primeira mensagem de cada conversa e gera um título curto (2 a 6 palavras), objetivo e contextualmente representativo para o histórico lateral.
  * Título persistente salvo na conversa, sem alterações automáticas nas mensagens subsequentes.
  * Botão de **Novo Chat** com formato estilizado de **prancheta tática de basquete** e tooltip interativo.
  * Persistência completa no `localStorage` sob a chave `basketcoach_conversations`.
  * Estados visuais para conversa ativa, hover e opção de exclusão.
* **Tela Inicial de Alta Performance ("ELEVE SEU JOGO"):**
  * Apresentação profissional e motivadora com título impactante e proposta esportiva.
  * Cards interativos de atalho tático (arremessos de 3 pontos, dribles sob pressão, finalizações e plano semanal personalizado).
  * Transição suave: a tela dá lugar ao fluxo de mensagens assim que a conversa se inicia.
* **Área de Conversação Expandida:**
  * Layout flexível e ampliado para melhor aproveitamento horizontal (`max-w-5xl`).
  * Três zonas de interface claramente definidas: barra lateral, painel central e barra de controles superiores.
* **Minigame Interativo "Desafio do Arremesso":**
  * Botão discreto em formato de controle de videogame (`fa-gamepad`) no cabeçalho com tooltip "Jogar basquete".
  * Modal interativo com motor físico em HTML5 Canvas: mira elástica (arrastar e soltar), gravidade, tabelas de acrílico e aro.
  * **Limite Visual Estrito da Bola:** a bola é confinada perfeitamente no limite interno do modal, considerando seu raio (14px), sem ultrapassar as bordas laterais, teto ou chão.
  * **Sistema Rigoroso de Pontuação (1 Ponto por Cesta Convertida):** validação em duas etapas com colisão física nos aros e verificação de trajetória descendente pelo espaço interno real da cesta; toques no aro ou passagens externas não pontuam.
  * Sistema completo de 10 arremessos por rodada, 1 ponto por cesta convertida, feedback visual dinâmico "CESTA! +1", tela de fim de treino com estatísticas de aproveitamento e botão para jogar novamente.
* **Integração com Azure OpenAI / Responses API:** Suporte nativo ao formato da Responses API utilizando o parâmetro `input` (com histórico conversacional preservado), instruções de sistema (`instructions`), limite de saída (`max_output_tokens`), suporte a `output_text`/`output[]` e tratamento robusto de erros.
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
As credenciais e as conversas salvas ficam armazenadas no `localStorage` do navegador:
* `azureConfig`: Guarda os parâmetros de conexão com a API.
* `basketcoach_conversations`: Guarda a lista de pranchetas/sessões e seus respectivos históricos de mensagens.

### 5. Ciclo de Inicialização
Ao carregar a página (`DOMContentLoaded`), a aplicação executa a função assíncrona `loadConfig()` e restaura o histórico via `loadConversationsFromStorage()`, garantindo que as configurações e as pranchetas estejam prontas antes de qualquer tentativa de envio de mensagens para a IA.

---

## 🔒 Segurança

> [!WARNING]
> **Importante para Ambientes de Produção:**
> Como este chatbot é executado diretamente no navegador do usuário (lado do cliente / frontend), qualquer chave de API inserida, armazenada em `localStorage` ou transmitida via JavaScript **não é confidencial** e pode ser visualizada inspecionando o navegador (DevTools / Network / Application).
> 
> Esta arquitetura destina-se a fins didáticos, prototipagem e desenvolvimento local. Para colocar a aplicação em produção aberta a terceiros, **recomenda-se implementar um backend intermediário (BFF/Proxy)** onde as chaves da API permaneçam protegidas em variáveis de ambiente seguras no servidor. O arquivo `env.json` está devidamente listado no `.gitignore` para prevenir commits acidentais de credenciais reais.

---

## 📂 Arquivos do Projeto

```text
basketcoach-ai/
│
├── index.html       # Interface visual: sidebar de pranchetas, tela inicial "ELEVE SEU JOGO", modais
├── styles.css       # Estilos customizados, tema escuro, scrollbars e suporte ao canvas
├── script.js        # Lógica central: histórico persistente, chamadas à API, canvas physics do minigame
├── env.json         # Arquivo de configuração local das credenciais da API Azure OpenAI (ignorado no Git)
├── .gitignore       # Proteção contra vazamento de credenciais locais
└── README.md        # Documentação completa do projeto, especificações e guia de uso
```
