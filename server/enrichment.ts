import { formatCnpj, onlyDigits } from "./cnpj.js";

export interface LeadRequest {
  name: string;
  email: string;
  phone: string;
  cnpj: string;
}

interface BrasilApiPartner {
  nome_socio: string;
}

interface BrasilApiCompany {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  descricao_situacao_cadastral: string;
  data_inicio_atividade: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  natureza_juridica: string;
  porte: string | null;
  capital_social: number | string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  simples: {
    simples_optante: boolean | null;
    mei_optante: boolean | null;
  } | null;
  qsa: BrasilApiPartner[] | null;
}

export interface EnrichedLeadResponse {
  requestedAt: string;
  source: {
    provider: string;
    disclaimer: string;
  };
  lead: {
    contact: {
      name: string;
      email: string;
      phone: string;
      inferredRole: {
        label: string;
        confidence: "alta" | "média" | "baixa";
        rationale: string;
      };
    };
    company: {
      cnpj: string;
      legalName: string;
      tradeName: string | null;
      status: string;
      openedAt: string;
      ageInYears: number | null;
      mainCnae: {
        code: string;
        description: string;
      };
      segment: string;
      employeeRange: string;
      employeeRangeSource: string;
      legalNature: string;
      capitalSocial: number | null;
      address: string;
      city: string;
      state: string;
      postalCode: string;
      isSimpleNational: boolean | null;
      isMei: boolean | null;
      partnersCount: number;
    };
    insights: {
      priority: "Alta" | "Média" | "Baixa";
      summary: string;
      reasons: string[];
    };
  };
}

export class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
  }
}

function normalizeCapitalSocial(value: number | string | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function calculateCompanyAge(openedAt: string): number | null {
  const openedDate = new Date(openedAt);

  if (Number.isNaN(openedDate.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - openedDate.getFullYear();
  const sameYearStillPending =
    now.getMonth() < openedDate.getMonth() ||
    (now.getMonth() === openedDate.getMonth() && now.getDate() < openedDate.getDate());

  if (sameYearStillPending) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function getSegmentByCnae(code: number, description: string): string {
  const section = Number(String(code).slice(0, 2));

  if (section >= 1 && section <= 3) return "Agro e extração primária";
  if (section >= 5 && section <= 9) return "Indústria extrativa";
  if (section >= 10 && section <= 33) return "Indústria de transformação";
  if (section >= 35 && section <= 39) return "Energia, saneamento e utilidades";
  if (section >= 41 && section <= 43) return "Construção";
  if (section >= 45 && section <= 47) return "Comércio";
  if (section >= 49 && section <= 53) return "Logística e transporte";
  if (section >= 55 && section <= 56) return "Turismo e alimentação";
  if (section >= 58 && section <= 63) return "Tecnologia, dados e comunicação";
  if (section >= 64 && section <= 66) return "Serviços financeiros";
  if (section === 68) return "Mercado imobiliário";
  if (section >= 69 && section <= 75) return "Serviços profissionais";
  if (section >= 77 && section <= 82) return "Serviços administrativos";
  if (section === 85) return "Educação";
  if (section >= 86 && section <= 88) return "Saúde e bem-estar";
  if (section >= 90 && section <= 93) return "Cultura, esporte e entretenimento";
  if (section >= 94 && section <= 96) return "Outros serviços";

  return description ? `Segmento não mapeado: ${description}` : "Segmento não identificado";
}

function getEmployeeRange(porte: string | null): { value: string; source: string } {
  const normalized = (porte ?? "").toUpperCase();

  if (normalized.includes("MICRO")) {
    return {
      value: "1 a 19 funcionários",
      source: "Estimativa baseada no porte informado pela Receita Federal."
    };
  }

  if (normalized.includes("PEQUENO")) {
    return {
      value: "20 a 99 funcionários",
      source: "Estimativa baseada no porte informado pela Receita Federal."
    };
  }

  if (normalized.includes("DEMAIS")) {
    return {
      value: "100 ou mais funcionários",
      source: "Estimativa baseada no porte informado pela Receita Federal."
    };
  }

  return {
    value: "Faixa não identificada",
    source: "A API consultada não retorna o quadro exato de colaboradores."
  };
}

function inferRole(name: string, email: string) {
  const combined = `${name} ${email}`.toLowerCase();

  const dictionaries = [
    {
      label: "Liderança executiva",
      confidence: "alta" as const,
      rationale: "Detectamos termos associados à direção executiva ou fundação.",
      patterns: ["ceo", "founder", "cofounder", "diretor", "presidente", "owner", "socio"]
    },
    {
      label: "Comercial / vendas",
      confidence: "alta" as const,
      rationale: "O nome ou e-mail trazem sinais claros de atuação comercial.",
      patterns: ["sales", "vendas", "comercial", "bizdev", "account", "sdr", "closer"]
    },
    {
      label: "Marketing",
      confidence: "média" as const,
      rationale: "Encontramos termos ligados a marketing ou crescimento.",
      patterns: ["marketing", "growth", "crm", "midia", "conteudo"]
    },
    {
      label: "Financeiro",
      confidence: "média" as const,
      rationale: "Há indícios de responsabilidade financeira ou fiscal.",
      patterns: ["finance", "financeiro", "fiscal", "contabil", "accounting", "billing"]
    },
    {
      label: "People / RH",
      confidence: "média" as const,
      rationale: "O contato aparenta estar ligado a recrutamento ou RH.",
      patterns: ["rh", "hr", "people", "talent", "recrutamento"]
    },
    {
      label: "Tecnologia / produto",
      confidence: "média" as const,
      rationale: "O contato parece pertencer a um time técnico ou de produto.",
      patterns: ["tech", "ti", "cto", "product", "engenharia", "dev", "suporte"]
    }
  ];

  for (const item of dictionaries) {
    if (item.patterns.some((pattern) => combined.includes(pattern))) {
      return {
        label: item.label,
        confidence: item.confidence,
        rationale: item.rationale
      };
    }
  }

  return {
    label: "Não identificado",
    confidence: "baixa" as const,
    rationale: "Não há pistas suficientes no nome ou no e-mail para inferir o cargo."
  };
}

function getPriority(params: {
  status: string;
  employeeRange: string;
  email: string;
  capitalSocial: number | null;
  roleLabel: string;
}) {
  let score = 0;
  const reasons: string[] = [];

  if (params.status.toLowerCase().includes("ativa")) {
    score += 2;
    reasons.push("Empresa com situação cadastral ativa.");
  }

  if (params.employeeRange === "20 a 99 funcionários" || params.employeeRange === "100 ou mais funcionários") {
    score += 2;
    reasons.push("Porte indica potencial de estrutura comercial mais madura.");
  } else if (params.employeeRange === "1 a 19 funcionários") {
    score += 1;
    reasons.push("Empresa de menor porte, possivelmente com ciclo de venda mais curto.");
  }

  const emailDomain = params.email.split("@")[1] ?? "";
  if (emailDomain && !["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"].includes(emailDomain)) {
    score += 1;
    reasons.push("Contato utiliza e-mail corporativo.");
  }

  if (params.roleLabel !== "Não identificado") {
    score += 1;
    reasons.push("Foi possível inferir uma área de atuação para o contato.");
  }

  if ((params.capitalSocial ?? 0) >= 1_000_000) {
    score += 1;
    reasons.push("Capital social relevante para priorização comercial.");
  }

  if (score >= 6) {
    return {
      priority: "Alta" as const,
      summary: "Lead com bons sinais de maturidade e chance de conversa qualificada.",
      reasons
    };
  }

  if (score >= 4) {
    return {
      priority: "Média" as const,
      summary: "Lead promissor, mas ainda depende de validação comercial.",
      reasons
    };
  }

  return {
    priority: "Baixa" as const,
    summary: "Lead com poucos sinais fortes; vale abordagem mais exploratória.",
    reasons
  };
}

function buildAddress(company: BrasilApiCompany): string {
  const parts = [
    company.logradouro,
    company.numero,
    company.complemento,
    company.bairro
  ].filter(Boolean);

  return parts.join(", ");
}

async function fetchCompany(cnpj: string): Promise<BrasilApiCompany> {
  const digits = onlyDigits(cnpj);
  const baseUrl = process.env.BRASIL_API_BASE_URL ?? "https://brasilapi.com.br/api/cnpj/v1";
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/${digits}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LetalkLeadEnrichment/1.0"
      }
    });
  } catch {
    throw new ServiceError("Não foi possível conectar à API de CNPJ no momento.", 502);
  }

  if (response.status === 404) {
    throw new ServiceError("CNPJ não encontrado na base consultada.", 404);
  }

  if (response.status === 403) {
    throw new ServiceError("A BrasilAPI recusou a consulta. Tente novamente em alguns instantes.", 502);
  }

  if (!response.ok) {
    throw new ServiceError("Não foi possível consultar a API de CNPJ no momento.", 502);
  }

  return (await response.json()) as BrasilApiCompany;
}

export async function enrichLead(input: LeadRequest): Promise<EnrichedLeadResponse> {
  const company = await fetchCompany(input.cnpj);
  const employeeRange = getEmployeeRange(company.porte);
  const inferredRole = inferRole(input.name, input.email);
  const capitalSocial = normalizeCapitalSocial(company.capital_social);
  const priority = getPriority({
    status: company.descricao_situacao_cadastral,
    employeeRange: employeeRange.value,
    email: input.email,
    capitalSocial,
    roleLabel: inferredRole.label
  });

  return {
    requestedAt: new Date().toISOString(),
    source: {
      provider: "BrasilAPI",
      disclaimer:
        "A faixa de funcionários e o cargo do contato são inferências heurísticas feitas pela API desta aplicação."
    },
    lead: {
      contact: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        inferredRole
      },
      company: {
        cnpj: formatCnpj(company.cnpj),
        legalName: company.razao_social,
        tradeName: company.nome_fantasia,
        status: company.descricao_situacao_cadastral,
        openedAt: company.data_inicio_atividade,
        ageInYears: calculateCompanyAge(company.data_inicio_atividade),
        mainCnae: {
          code: String(company.cnae_fiscal),
          description: company.cnae_fiscal_descricao
        },
        segment: getSegmentByCnae(company.cnae_fiscal, company.cnae_fiscal_descricao),
        employeeRange: employeeRange.value,
        employeeRangeSource: employeeRange.source,
        legalNature: company.natureza_juridica,
        capitalSocial,
        address: buildAddress(company),
        city: company.municipio,
        state: company.uf,
        postalCode: company.cep,
        isSimpleNational: company.simples?.simples_optante ?? null,
        isMei: company.simples?.mei_optante ?? null,
        partnersCount: company.qsa?.length ?? 0
      },
      insights: priority
    }
  };
}
