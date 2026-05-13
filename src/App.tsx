import { FormEvent, useState } from "react";

import { type EnrichmentResponse, type LeadFormData } from "./types";
import { formatCnpjInput, formatCurrency, formatDate, formatPhoneInput } from "./utils/formatters";

const initialForm: LeadFormData = {
  name: "",
  email: "",
  phone: "",
  cnpj: ""
};

type FormField = keyof LeadFormData;

function priorityClass(priority: EnrichmentResponse["lead"]["insights"]["priority"]) {
  const slug = priority
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return `priority-badge priority-${slug}`;
}

function yesNo(value: boolean | null): string {
  if (value === null) return "Não informado";

  return value ? "Sim" : "Não";
}

export default function App() {
  const [form, setForm] = useState<LeadFormData>(initialForm);
  const [result, setResult] = useState<EnrichmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField(field: FormField, value: string) {
    const nextValue =
      field === "cnpj" ? formatCnpjInput(value) : field === "phone" ? formatPhoneInput(value) : value;

    setForm((current) => ({
      ...current,
      [field]: nextValue
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/lead/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as EnrichmentResponse | { message: string };

      if (!response.ok) {
        throw new Error("message" in data ? data.message : "Falha ao consultar o CNPJ.");
      }

      setResult(data as EnrichmentResponse);
    } catch (requestError) {
      setResult(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível concluir a consulta. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Letalk</p>
          <h1>Radar de leads</h1>
        </div>
        <span className="api-pill">API própria + BrasilAPI</span>
      </header>

      <section className="workspace-grid">
        <aside className="panel form-panel">
          <div className="panel-heading">
            <p className="eyebrow">Nova consulta</p>
            <h2>Dados do lead</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <label>
              Nome
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Ex.: Ana Oliveira"
                required
              />
            </label>

            <label>
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="ana@empresa.com.br"
                required
              />
            </label>

            <label>
              Telefone
              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="(11) 99999-0000"
                required
              />
            </label>

            <label>
              CNPJ
              <input
                value={form.cnpj}
                onChange={(event) => updateField("cnpj", event.target.value)}
                placeholder="00.000.000/0000-00"
                required
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Consultando..." : "Consultar e enriquecer"}
            </button>
          </form>

          {error ? <div className="alert error">{error}</div> : null}

          <p className="helper-text">
            O CNPJ é validado no backend antes da consulta externa. Se a BrasilAPI falhar, o erro
            volta tratado para a interface.
          </p>
        </aside>

        <section className="content-area">
          {result ? (
            <>
              <article className="company-header">
                <div>
                  <p className="eyebrow">Lead enriquecido</p>
                  <h2>{result.lead.company.tradeName ?? result.lead.company.legalName}</h2>
                  <p>{result.lead.company.legalName}</p>
                </div>

                <span className={priorityClass(result.lead.insights.priority)}>
                  Prioridade {result.lead.insights.priority}
                </span>
              </article>

              <section className="summary-strip">
                <div>
                  <span>CNPJ</span>
                  <strong>{result.lead.company.cnpj}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{result.lead.company.status}</strong>
                </div>
                <div>
                  <span>Segmento</span>
                  <strong>{result.lead.company.segment}</strong>
                </div>
                <div>
                  <span>Funcionários</span>
                  <strong>{result.lead.company.employeeRange}</strong>
                </div>
              </section>

              <section className="panel insights-panel">
                <div className="panel-heading">
                  <p className="eyebrow">Análise</p>
                  <h3>{result.lead.insights.summary}</h3>
                </div>
                <ul>
                  {result.lead.insights.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </section>

              <section className="details-grid">
                <article className="panel">
                  <div className="panel-heading">
                    <p className="eyebrow">Contato</p>
                    <h3>{result.lead.contact.name}</h3>
                  </div>

                  <dl className="data-list">
                    <div>
                      <dt>E-mail</dt>
                      <dd>{result.lead.contact.email}</dd>
                    </div>
                    <div>
                      <dt>Telefone</dt>
                      <dd>{result.lead.contact.phone}</dd>
                    </div>
                    <div>
                      <dt>Cargo inferido</dt>
                      <dd>{result.lead.contact.inferredRole.label}</dd>
                    </div>
                    <div>
                      <dt>Confiança</dt>
                      <dd>{result.lead.contact.inferredRole.confidence}</dd>
                    </div>
                  </dl>

                  <p className="helper-text">{result.lead.contact.inferredRole.rationale}</p>
                </article>

                <article className="panel">
                  <div className="panel-heading">
                    <p className="eyebrow">Empresa</p>
                    <h3>Dados principais</h3>
                  </div>

                  <dl className="data-list">
                    <div>
                      <dt>CNAE principal</dt>
                      <dd>
                        {result.lead.company.mainCnae.code} | {result.lead.company.mainCnae.description}
                      </dd>
                    </div>
                    <div>
                      <dt>Natureza jurídica</dt>
                      <dd>{result.lead.company.legalNature}</dd>
                    </div>
                    <div>
                      <dt>Capital social</dt>
                      <dd>{formatCurrency(result.lead.company.capitalSocial)}</dd>
                    </div>
                    <div>
                      <dt>Início das atividades</dt>
                      <dd>
                        {formatDate(result.lead.company.openedAt)}
                        {result.lead.company.ageInYears !== null
                          ? ` (${result.lead.company.ageInYears} anos)`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Sócios listados</dt>
                      <dd>{result.lead.company.partnersCount}</dd>
                    </div>
                  </dl>

                  <p className="helper-text">{result.lead.company.employeeRangeSource}</p>
                </article>

                <article className="panel wide-panel">
                  <div className="panel-heading">
                    <p className="eyebrow">Contexto</p>
                    <h3>Localização e regime</h3>
                  </div>

                  <dl className="data-list compact-list">
                    <div>
                      <dt>Endereço</dt>
                      <dd>{result.lead.company.address || "Não informado"}</dd>
                    </div>
                    <div>
                      <dt>Cidade / UF</dt>
                      <dd>
                        {result.lead.company.city} / {result.lead.company.state}
                      </dd>
                    </div>
                    <div>
                      <dt>CEP</dt>
                      <dd>{result.lead.company.postalCode || "Não informado"}</dd>
                    </div>
                    <div>
                      <dt>Simples Nacional</dt>
                      <dd>{yesNo(result.lead.company.isSimpleNational)}</dd>
                    </div>
                    <div>
                      <dt>MEI</dt>
                      <dd>{yesNo(result.lead.company.isMei)}</dd>
                    </div>
                    <div>
                      <dt>Fonte</dt>
                      <dd>{result.source.provider}</dd>
                    </div>
                  </dl>

                  <p className="helper-text">{result.source.disclaimer}</p>
                </article>
              </section>
            </>
          ) : (
            <section className="empty-state">
              <div>
                <p className="eyebrow">Aguardando consulta</p>
                <h2>Preencha os dados do lead para gerar a análise.</h2>
                <p>
                  O resultado vai destacar CNAE, segmento, faixa estimada de funcionários,
                  cargo inferido e sinais de priorização comercial.
                </p>
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
