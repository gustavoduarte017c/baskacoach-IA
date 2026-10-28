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

---

## 📂 Estrutura do Projeto

O projeto está dividido em três arquivos principais para manter o código limpo, modular e de fácil manutenção:

```text
basketcoach-ai/
│
├── index.html       # Estrutura HTML da interface e layout do chat
├── styles.css       # Estilos customizados, tema escuro e fundo tático
└── script.js        # Lógica de integração com a API, histórico e filtros de segurança