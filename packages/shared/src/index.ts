export type UUID = string;

export type UserRole = 'admin' | 'worker' | 'supervisor' | 'guest';
export type MicroRole = 'constructor' | 'electronics' | 'programmer';

export type ProjectType = 'diy' | 'machine_part' | 'device' | 'pcb' | 'firmware' | 'mixed';
export type ProjectDomain = 'design_bureau' | 'commercial_3d';
export type ProjectStatus = 'draft' | 'pending_review' | 'active' | 'completed' | 'archived';

export type ArtifactKind = 'model_3d' | 'pcb' | 'firmware' | 'document' | 'other';

export type WorkOrderSource = 'commercial' | 'internal';
export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent';
export type WorkOrderTech = 'fdm' | 'sla' | 'laser';
export type DeductionMode = 'auto' | 'manual';

export type WorkOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'queued'
  | 'assigned'
  | 'in_progress'
  | 'post_process'
  | 'done'
  | 'failed'
  | 'cancelled';

export type MachineType =
  | 'fdm_printer'
  | 'resin_printer'
  | 'laser'
  | 'solder'
  | 'wash'
  | 'uv_cure'
  | 'accessory';

export type MachineStatus = 'idle' | 'busy' | 'error' | 'maintenance' | 'offline';

export type ConnectorType = 'manual' | 'moonraker' | 'octoprint' | 'custom';

export type MachineIntegrationStatus = 'stub' | 'planned' | 'connected';

export type InventoryCategory =
  | 'filament'
  | 'resin'
  | 'electronics'
  | 'consumables'
  | 'blanks'
  | 'other';

export type InventoryUnit = 'g' | 'ml' | 'pcs' | 'm' | 'kg' | 'l';
export type InventoryMovementType = 'in' | 'out' | 'adjustment';

export type ArticleStatus = 'draft' | 'pending_review' | 'published' | 'rejected';

export interface User {
  id: UUID;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  micro_roles: MicroRole[];
  pd_consent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectShowcase {
  published: boolean;
  photos: string[];
  public_description: string;
}

export interface Project {
  id: UUID;
  title: string;
  description: string;
  type: ProjectType;
  domain: ProjectDomain;
  status: ProjectStatus;
  parent_project_id?: UUID;
  owner_id: UUID;
  showcase?: ProjectShowcase;
  created_at: string;
  updated_at: string;
}

export interface FileRef {
  path: string;
  mime_type: string;
  size_bytes: number;
  synced_to_cloud: boolean;
}

export interface ArtifactVersion {
  version: number;
  files: FileRef[];
  gcode_path?: string;
  created_by: UUID;
  created_at: string;
  changelog?: string;
}

export interface Artifact {
  id: UUID;
  project_id: UUID;
  kind: ArtifactKind;
  title: string;
  versions: ArtifactVersion[];
  current_version: number;
}

export interface CostBreakdownLine {
  key: string;
  label: string;
  amount: number;
}

export interface CostBreakdown {
  lines: CostBreakdownLine[];
  total_cost: number;
  final_price: number;
  weight_g?: number;
  volume_ml?: number;
}

export interface SubJob {
  id: UUID;
  machine_type: 'wash' | 'uv_cure' | 'solder';
  status: WorkOrderStatus;
  machine_id?: UUID;
}

export interface WorkOrder {
  id: UUID;
  title: string;
  notes?: string;
  source: WorkOrderSource;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  artifact_id?: UUID;
  project_id?: UUID;
  requested_by: UUID;
  approved_by?: UUID;
  machine_id?: UUID;
  tech: WorkOrderTech;
  queue_position?: number;
  cost_breakdown?: CostBreakdown;
  deduction_mode: DeductionMode;
  sub_jobs?: SubJob[];
  created_at: string;
  updated_at: string;
}

export interface MachineCapabilities {
  materials: string[];
  max_temp_c?: number;
  bed_size: { x: number; y: number; z: number };
  max_power_pct?: number;
}

export interface MachineLiveStatus {
  progress_pct?: number;
  temps?: Record<string, number>;
  camera_url?: string;
  last_seen?: string;
  message?: string;
}

export interface MachineConnector {
  type: ConnectorType;
  host?: string;
  port?: number;
  /** false = заглушка, интеграция позже */
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface Machine {
  id: UUID;
  name: string;
  type: MachineType;
  model: string;
  purpose: string;
  capabilities: MachineCapabilities;
  loaded_material?: string;
  motor_hours: number;
  status: MachineStatus;
  integration_status: MachineIntegrationStatus;
  connector: MachineConnector;
  live_status?: MachineLiveStatus;
  camera_url?: string;
  image_url?: string;
  notes?: string;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: UUID;
  name: string;
  category: InventoryCategory;
  sku?: string;
  qty: number;
  unit: InventoryUnit;
  cost_per_unit: number;
  alert_threshold_pct: number;
  initial_qty: number;
  created_at: string;
}

export interface InventoryMovement {
  id: UUID;
  item_id: UUID;
  type: InventoryMovementType;
  qty: number;
  cost?: number;
  work_order_id?: UUID;
  created_by: UUID;
  note?: string;
  created_at: string;
}

export interface ArticleAuthor {
  user_id: UUID;
  name: string;
  affiliation?: string;
}

export interface Article {
  id: UUID;
  project_id?: UUID;
  udc: string;
  title: string;
  authors: ArticleAuthor[];
  abstract: string;
  body: string;
  keywords: string[];
  status: ArticleStatus;
  format_version: string;
  reviewed_by?: UUID;
  published_at?: string;
}

export interface AuditLog {
  id: UUID;
  actor_id: UUID;
  action: string;
  entity_type: string;
  entity_id: UUID;
  payload: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export { APP_VERSION } from './version.js';
