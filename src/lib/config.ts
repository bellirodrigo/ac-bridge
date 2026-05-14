export interface BridgeConfig {
  pipedriveApiToken: string
  pipedriveBaseUrl: string
  pipelineId: number
  stageId: number
  claySecret: string
}

export function loadConfig(): BridgeConfig {
  const required = (key: string): string => {
    const v = process.env[key]
    if (!v) throw new Error(`${key} not configured`)
    return v
  }

  return {
    pipedriveApiToken: required('PIPEDRIVE_API_TOKEN'),
    pipedriveBaseUrl: process.env.PIPEDRIVE_BASE_URL ?? 'https://api.pipedrive.com/v1',
    pipelineId: Number.parseInt(process.env.PIPEDRIVE_PIPELINE_ID ?? '1', 10),
    stageId: Number.parseInt(process.env.PIPEDRIVE_STAGE_ID ?? '67', 10),
    claySecret: required('CLAY_INBOUND_SECRET'),
  }
}
