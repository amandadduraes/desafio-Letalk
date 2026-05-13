import { z } from "zod";

import { formatCnpj, isValidCnpj } from "./cnpj.js";
import { enrichLead, ServiceError } from "./enrichment.js";

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do contato."),
  email: z.string().trim().email("Informe um e-mail válido."),
  phone: z.string().trim().min(8, "Informe um telefone válido."),
  cnpj: z.string().trim().min(14, "Informe um CNPJ válido.")
});

export async function enrichLeadFromRequest(body: unknown) {
  const payload = leadSchema.parse(body);

  if (!isValidCnpj(payload.cnpj)) {
    throw new ServiceError("CNPJ inválido. Revise o número informado.", 400);
  }

  return enrichLead({
    ...payload,
    cnpj: formatCnpj(payload.cnpj)
  });
}

