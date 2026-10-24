import { requerir } from "./entorno";

const API_GITHUB = "https://api.github.com";

function repositorio(): string {
  return requerir("GITHUB_REPOSITORY");
}

async function pedir(ruta: string, init: RequestInit = {}): Promise<Response> {
  const token = requerir("GITHUB_TOKEN");
  return fetch(`${API_GITHUB}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

function cuerpoDesdeTelegram(texto: string, usuario?: string): string {
  return usuario ? `@claude ${texto}\n\n_Enviado desde Telegram por @${usuario}_` : `@claude ${texto}`;
}

export function crearIssueDesdeTelegram(texto: string, usuario?: string): Promise<Response> {
  const titulo = texto.length > 80 ? `${texto.slice(0, 77)}...` : texto;
  return pedir(`/repos/${repositorio()}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: titulo, body: cuerpoDesdeTelegram(texto, usuario) }),
  });
}

export function comentarIssue(numero: number, texto: string, usuario?: string): Promise<Response> {
  return pedir(`/repos/${repositorio()}/issues/${numero}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: cuerpoDesdeTelegram(texto, usuario) }),
  });
}

/**
 * Issue vinculado a un PR: rama «issue-N» o palabra de cierre («Closes #N»…) en el título o
 * la descripción. Una mención suelta («sigue a #140», «issue-140» en el texto) no cuenta:
 * cerraría un issue ajeno.
 */
const RAMA_ISSUE = /^(?:.*\/)?issue-(\d+)\b/i;
const CIERRE_ISSUE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/i;

function issueVinculado(rama: string | undefined, textos: (string | undefined | null)[]): number | undefined {
  const m = rama?.match(RAMA_ISSUE) ?? textos.map((t) => t?.match(CIERRE_ISSUE)).find(Boolean);
  return m ? Number(m[1]) : undefined;
}

interface PullRequest {
  title?: string;
  body?: string | null;
  base?: { ref?: string; repo?: { id?: number } | null };
  head?: { ref?: string; sha?: string; repo?: { id?: number } | null };
}

/** Refuerzo por si el PR no trae la palabra de cierre que GitHub reconoce: cierra su issue al mergear. */
async function cerrarIssueVinculado(numeroPr: number, pr: PullRequest): Promise<void> {
  const repo = repositorio();
  const numero = issueVinculado(pr.head?.ref, [pr.body, pr.title]);
  if (!numero) return;

  const resIssue = await pedir(`/repos/${repo}/issues/${numero}`);
  if (!resIssue.ok || (await resIssue.json()).state === "closed") return;

  const resCierre = await pedir(`/repos/${repo}/issues/${numero}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "completed" }),
  });
  if (!resCierre.ok)
    console.error(`No se pudo cerrar el issue #${numero} del PR #${numeroPr}:`, await resCierre.text());
}

/**
 * Mergea solo PRs de una rama de este mismo repo contra main. Con `sha`, GitHub responde 409
 * si el PR ha recibido commits después del aviso: así no se aprueba código que no se ha visto.
 */
export async function mergearPr(numero: number, sha?: string): Promise<Response> {
  const repo = repositorio();
  const resPr = await pedir(`/repos/${repo}/pulls/${numero}`);
  if (!resPr.ok) return resPr;
  const pr = (await resPr.json()) as PullRequest;
  // Se compara con el repo de destino que da GitHub, no con GITHUB_REPOSITORY: esa variable puede
  // venir con otras mayúsculas (a la API le da igual) y entonces no se aprobaría ningún PR.
  if (pr.base?.ref !== "main" || !pr.head?.repo?.id || pr.head.repo.id !== pr.base?.repo?.id) {
    return new Response(`El PR #${numero} no va de una rama de este repo a main`, { status: 422 });
  }
  if (sha && !pr.head?.sha?.startsWith(sha)) {
    return new Response(`El PR #${numero} ha cambiado desde el aviso`, { status: 409 });
  }

  const res = await pedir(`/repos/${repo}/pulls/${numero}/merge`, {
    method: "PUT",
    body: JSON.stringify({ merge_method: "squash", ...(pr.head?.sha ? { sha: pr.head.sha } : {}) }),
  });
  if (res.ok) await cerrarIssueVinculado(numero, pr);
  return res;
}

export function cerrarPr(numero: number): Promise<Response> {
  return pedir(`/repos/${repositorio()}/pulls/${numero}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" }),
  });
}

/** ¿Hay una ejecución de este workflow en cola o en marcha? */
export async function workflowEnMarcha(archivo: string): Promise<boolean> {
  const repo = repositorio();
  for (const estado of ["in_progress", "queued"]) {
    const res = await pedir(`/repos/${repo}/actions/workflows/${archivo}/runs?status=${estado}&per_page=1`);
    if (res.ok && ((await res.json()) as { total_count?: number }).total_count) return true;
  }
  return false;
}

/** Lanza un workflow por workflow_dispatch. El token necesita permiso «Actions: write». */
export async function lanzarWorkflow(archivo: string, inputs: Record<string, string>): Promise<Response> {
  return pedir(`/repos/${repositorio()}/actions/workflows/${archivo}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: "main", inputs }),
  });
}
