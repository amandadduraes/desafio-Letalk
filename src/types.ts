export interface EnrichmentResponse {
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

export interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  cnpj: string;
}
