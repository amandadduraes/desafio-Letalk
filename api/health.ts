interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

export default function handler(_request: unknown, response: VercelResponse) {
  response.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}

