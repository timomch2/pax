import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fetchRegistryPage } from '@/lib/facility-directory';

/** Optional native trust-store transport for hosts where the registry's certificate chain fails Node validation. */
export function fetchConfiguredRegistryPage(page: number, size = 30) {
  if (process.env.PRACTICE_REGISTRY_TRANSPORT !== 'native-https') return fetchRegistryPage(page, size);
  return fetchRegistryPage(page, size, (async (_url: unknown, options: RequestInit) => {
    // Endpoint and headers are fixed, shell execution is disabled, and TLS verification remains enabled.
    const { stdout } = await promisify(execFile)('curl', ['--fail', '--silent', '--show-error', '--max-time', '20', 'https://nhfr.dha.go.ke/api/', '-H', 'Content-Type: application/json', '-H', 'apollo-require-preflight: true', '-H', 'x-apollo-operation-name: SearchFacilities', '--data', String(options.body)], { maxBuffer: 2000000, timeout: 25000 });
    return new Response(stdout, { status: 200 });
  }) as typeof fetch);
}
