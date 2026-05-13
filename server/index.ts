import "dotenv/config";

import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatCnpj, isValidCnpj } from "./cnpj.js";
import { enrichLead, ServiceError } from "./enrichment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT ?? 3001);

const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do contato."),
  email: z.string().trim().email("Informe um e-mail válido."),
  phone: z.string().trim().min(8, "Informe um telefone válido."),
  cnpj: z.string().trim().min(14, "Informe um CNPJ válido.")
});

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/lead/enrich", async (request, response, next) => {
  try {
    const payload = leadSchema.parse(request.body);

    if (!isValidCnpj(payload.cnpj)) {
      return response.status(400).json({
        message: "CNPJ inválido. Revise o número informado.",
        field: "cnpj"
      });
    }

    const result = await enrichLead({
      ...payload,
      cnpj: formatCnpj(payload.cnpj)
    });

    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

const clientDistPath = path.resolve(__dirname, "../dist");
const builtIndexPath = path.join(clientDistPath, "index.html");

if (fs.existsSync(builtIndexPath)) {
  app.use(express.static(clientDistPath));

  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api")) {
      return next();
    }

    return response.sendFile(builtIndexPath);
  });
} else {
  app.get("/", (_request, response) => {
    response.json({
      message: "API Letalk ativa. Rode o frontend com `npm run dev:web` ou gere o build com `npm run build`."
    });
  });
}

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
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
});

app.listen(port, () => {
  console.log(`API Letalk rodando em http://localhost:${port}`);
});
