import { z } from "zod";

import { ServiceError } from "../../server/enrichment.js";
import { enrichLeadFromRequest } from "../../server/lead.js";

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
  end(): void;
}

function parseBody(body: unknown) {
  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    return response.status(204).end();
  }

  if (request.method !== "POST") {
    return response.status(405).json({ message: "Método não permitido." });
  }

  try {
    const result = await enrichLeadFromRequest(parseBody(request.body));

    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(400).json({
        message: error.issues[0]?.message ?? "Dados inválidos enviados para a API."
      });
    }

    if (error instanceof ServiceError) {
      return response.status(error.statusCode).json({
        message: error.message
      });
    }

    console.error(error);

    return response.status(500).json({
      message: "Ocorreu um erro inesperado ao processar a consulta."
    });
  }
}

