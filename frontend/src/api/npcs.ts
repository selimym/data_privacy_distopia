import { fetchJson } from './client';
import type {
  NPCListResponse,
  NPCWithDomains,
  DomainType,
  DomainData,
} from '../types/npc';

export async function listNPCs(
  limit: number = 100,
  offset: number = 0
): Promise<NPCListResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  return fetchJson<NPCListResponse>(`/api/npcs/?${params}`);
}

export async function getNPC(
  id: string,
  domains?: DomainType[]
): Promise<NPCWithDomains> {
  const params = new URLSearchParams();

  if (domains && domains.length > 0) {
    domains.forEach(domain => params.append('domains', domain));
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/npcs/${id}?${queryString}`
    : `/api/npcs/${id}`;

  return fetchJson<NPCWithDomains>(endpoint);
}

export async function getNPCDomain(
  id: string,
  domain: DomainType
): Promise<DomainData> {
  return fetchJson<DomainData>(`/api/npcs/${id}/domain/${domain}`);
}
