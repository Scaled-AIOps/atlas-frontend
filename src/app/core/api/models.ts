// ── Shared enums ─────────────────────────────────────────────────────────
export type Environment = 'local' | 'dev' | 'int' | 'uat' | 'prd';
export const ENVIRONMENTS: Environment[] = ['local', 'dev', 'int', 'uat', 'prd'];

// ── Tribal hierarchy ─────────────────────────────────────────────────────
export interface TribeDomain {
  name: string;
  lead?: string;
  description?: string;
  tags?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubDomain {
  name: string;
  tribeDomain: string;
  lead?: string;
  description?: string;
  tags?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tribe {
  name: string;
  subDomain: string;
  tribeDomain: string;
  lead?: string;
  releaseManager?: string;
  description?: string;
  confluence?: string;
  tags?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// ── Squad ────────────────────────────────────────────────────────────────
export interface Squad {
  key: string;
  name?: string;
  description?: string;
  po?: string;
  sm?: string;
  ao?: string[];
  mailingList?: string[];
  jira?: string;
  github?: string;
  confluence?: string;
  devops?: string[];
  sre?: string[];
  backendDevs?: string[];
  frontendDevs?: string[];
  qa?: string[];
  members?: string[];
  productsService?: string[];
  tribe?: string;
  tribeDomain?: string;
  subDomain?: string;
  squads?: string[];
  tags?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// ── Infra ────────────────────────────────────────────────────────────────
export interface Infra {
  platformId: string;
  name?: string;
  platform?: string;          // 'onprem' | 'cloud' | …
  platformType?: string;      // 'OCP' | 'CloudRun' | …
  environment?: Environment;
  clusterId?: string;
  tokenId?: string;
  host?: string;
  routeHostName?: string;
  tags?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// ── AppInfo ──────────────────────────────────────────────────────────────
export type AppStatus = 'active' | 'inactive' | 'marked-for-decommissioning' | 'failed';

export interface AppInfo {
  appId: string;
  squad?: string;
  gitRepo?: string;
  status?: AppStatus;
  tags?: Record<string, unknown>;

  localPlatform?: string;  localUrl?: string;
  devPlatform?: string;    devUrl?: string;
  intPlatform?: string;    intUrl?: string;
  uatPlatform?: string;    uatUrl?: string;
  prdPlatform?: string;    prdUrl?: string;

  probeHealth?: string;
  probeInfo?: string;
  probeLiveness?: string;
  probeReadiness?: string;

  createdAt?: string;
  updatedAt?: string;
}

// ── AppStatus ────────────────────────────────────────────────────────────
export type DeployState = 'success' | 'failed' | 'pending' | 'rolledback';
export type JavaComplianceStatus = 'compliant' | 'non-compliant' | 'exempt' | 'unknown';
export const JAVA_COMPLIANCE_STATUSES: JavaComplianceStatus[] = [
  'compliant', 'non-compliant', 'exempt', 'unknown',
];

export interface DeployEntry {
  state: DeployState;
  version?: string;
  commitId?: string;
  branch?: string;
  deployedAt: string;
  deployedBy?: string;
  notes?: string;
  xray?: string;
  javaVersion?: string;
  javaComplianceStatus?: JavaComplianceStatus | '';
  changeRequest?: string;
}

export interface AppStatusRecord {
  appId: string;
  local?: DeployEntry[];
  dev?: DeployEntry[];
  int?: DeployEntry[];
  uat?: DeployEntry[];
  prd?: DeployEntry[];
  createdAt?: string;
  updatedAt?: string;
}
