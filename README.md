# Radar de Leads Letalk

Aplicação full stack em **React + TypeScript + Express** para consultar um CNPJ, tratar os dados retornados pela BrasilAPI e apresentar um resumo mais útil para análise comercial.

## O Que A Aplicação Entrega

- Formulário com `nome`, `e-mail`, `telefone` e `CNPJ`
- Consulta feita pelo frontend em uma **API própria**
- Validação de CNPJ no backend
- Tratamento de erros de entrada e de indisponibilidade da API externa
- Resposta enriquecida com CNAE principal, segmento, faixa estimada de funcionários, cargo inferido do contato e prioridade sugerida para o lead

## Stack Escolhida

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express + TypeScript
- **Validação:** Zod
- **Fonte de dados:** BrasilAPI

## Estrutura

```text
.
|-- server
|   |-- cnpj.ts
|   |-- enrichment.ts
|   `-- index.ts
|-- src
|   |-- App.tsx
|   |-- main.tsx
|   |-- styles.css
|   |-- types.ts
|   `-- utils
|       `-- formatters.ts
|-- .env.example
|-- package.json
|-- README.md
`-- vite.config.ts
```

## Endpoint Consumido Pelo Frontend

### `POST /api/lead/enrich`

Payload:

```json
{
  "name": "Ana Oliveira",
  "email": "ana@empresa.com.br",
  "phone": "(11) 99999-0000",
  "cnpj": "50.202.925/0001-93"
}
```

Exemplo de retorno:

```json
{
  "requestedAt": "2026-05-13T12:00:00.000Z",
  "source": {
    "provider": "BrasilAPI",
    "disclaimer": "A faixa de funcionários e o cargo do contato são inferências heurísticas feitas pela API desta aplicação."
  },
  "lead": {
    "contact": {
      "name": "Ana Oliveira",
      "email": "ana@empresa.com.br",
      "phone": "(11) 99999-0000",
      "inferredRole": {
        "label": "Comercial / vendas",
        "confidence": "alta",
        "rationale": "O nome ou e-mail trazem sinais claros de atuação comercial."
      }
    },
    "company": {
      "cnpj": "50.202.925/0001-93",
      "legalName": "EMPRESA EXEMPLO LTDA",
      "tradeName": "Empresa Exemplo",
      "status": "ATIVA",
      "openedAt": "2023-04-04",
      "ageInYears": 3,
      "mainCnae": {
        "code": "4731800",
        "description": "Comércio varejista de combustíveis para veículos automotores"
      },
      "segment": "Comércio",
      "employeeRange": "100 ou mais funcionários",
      "employeeRangeSource": "Estimativa baseada no porte informado pela Receita Federal.",
      "legalNature": "Sociedade Empresária Limitada",
      "capitalSocial": 1400000,
      "address": "Rua Exemplo, 123, Centro",
      "city": "São Paulo",
      "state": "SP",
      "postalCode": "01000000",
      "isSimpleNational": false,
      "isMei": false,
      "partnersCount": 2
    },
    "insights": {
      "priority": "Alta",
      "summary": "Lead com bons sinais de maturidade e chance de conversa qualificada.",
      "reasons": [
        "Empresa com situação cadastral ativa.",
        "Contato utiliza e-mail corporativo."
      ]
    }
  }
}
```

## Como Instalar

```bash
npm install
```

## Variáveis De Ambiente

Crie um arquivo `.env` a partir do `.env.example`.

```env
PORT=3001
BRASIL_API_BASE_URL=https://brasilapi.com.br/api/cnpj/v1
```

## Como Rodar Localmente

Modo desenvolvimento:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

Build de produção:

```bash
npm run build
npm start
```

## Como A IA Ajudou Na Construção

Usei IA como apoio para acelerar o scaffolding inicial do projeto, revisar a modelagem da resposta da API, refinar a organização visual dos dados e ajudar na redação do README.

As decisões de arquitetura, heurísticas de enriquecimento e tratamento dos dados foram revisadas e ajustadas manualmente.

## Decisões De Projeto E Justificativas

- **API própria entre front e fonte externa:** atende ao requisito do desafio e centraliza validação, tratamento e enriquecimento.
- **Resposta enxuta para o frontend:** a BrasilAPI retorna muitos campos; a API da aplicação devolve apenas o que ajuda o time comercial a agir.
- **Heurísticas explícitas:** `faixa de funcionários` e `cargo do contato` não são fornecidos diretamente pela BrasilAPI, então a aplicação infere essas informações e sinaliza isso no retorno.
- **Prioridade do lead:** inclui uma camada simples de priorização baseada em status cadastral, porte estimado, e-mail corporativo, capital social e indícios do cargo.
- **Frontend orientado à leitura rápida:** a interface foi organizada em blocos de decisão para reduzir o esforço de análise.

## Tempo Gasto

Estimativa: **4 a 6 horas** para implementação inicial, refinando UX, API e documentação.

## Se Eu Tivesse Mais Tempo

- adicionaria testes automatizados para a API e para as heurísticas
- criaria observabilidade básica com logs estruturados
- adicionaria cache das consultas por CNPJ
- incluiria deploy automatizado com frontend e backend publicados
- buscaria dados complementares para melhorar a inferência do cargo e o fit comercial

## Link Do Frontend Para Testes

Não publicado neste ambiente. O projeto está pronto para rodar localmente e pode ser publicado em plataformas como Render, Railway ou Vercel.
