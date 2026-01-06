import { fetchJson } from './client';
import type {
  InferencesResponse,
  InferenceResult,
  DomainType,
} from '../types/npc';

export async function getInferences(
  npcId: string,
  domains: DomainType[]
): Promise<InferencesResponse> {
  const params = new URLSearchParams();

  if (domains && domains.length > 0) {
    domains.forEach(domain => params.append('domains', domain));
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/inferences/${npcId}?${queryString}`
    : `/api/inferences/${npcId}`;

  return fetchJson<InferencesResponse>(endpoint);
}

export async function previewDomainUnlock(
  npcId: string,
  currentDomains: DomainType[],
  newDomain: DomainType
): Promise<InferenceResult[]> {
  const params = new URLSearchParams();

  if (currentDomains && currentDomains.length > 0) {
    currentDomains.forEach(domain => params.append('current_domains', domain));
  }

  params.append('new_domain', newDomain);

  return fetchJson<InferenceResult[]>(`/api/inferences/${npcId}/preview?${params}`);
}
