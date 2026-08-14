// Server configuration types
export interface ServerConfig {
  name: string;
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
  isDefault: boolean;
  timeout?: number;
}

export interface ConfigStore {
  configs: Record<string, ServerConfig>;
  activeConfig?: string;
}

// Dashboard types
export interface Dashboard {
  uid: string;
  title: string;
  tags?: string[];
  folderTitle?: string;
  url?: string;
  panels?: Panel[];
}

export interface Panel {
  id: number;
  title?: string;
  type: string;
  datasource?: Datasource;
  targets: Query[];
}

export interface Datasource {
  type?: string;
  uid?: string;
  id?: number;
}

// Query types
export interface Query {
  refId: string;
  datasource?: Datasource;
  expr?: string;
  query?: string;
  queryType?: string;
  rawQuery?: any;
}

export interface QueryResult {
  refId: string;
  series: TimeSeries[];
}

export interface TimeSeries {
  name: string;
  labels: Record<string, string>;
  datapoints: Datapoint[];
}

export interface Datapoint {
  timestamp: number;
  value: number | null;
}

// Alert types
export interface Alert {
  id: number;
  dashboardId?: number;
  panelId?: number;
  name: string;
  state: AlertState;
  folderTitle?: string;
  message?: string;
}

export interface AlertCondition {
  evaluator: { type: string; params: number[] };
  reducer: { type: string };
  query: { params: string[] };
  type: string;
}

export interface AlertDetail {
  id: number;
  name: string;
  state: AlertState;
  message: string;
  frequency: number;
  forDuration: number;
  conditions: AlertCondition[];
  executionError: string;
  newStateDate: string;
}

export enum AlertState {
  OK = "ok",
  PAUSED = "paused",
  ALERTING = "alerting",
  PENDING = "pending",
  NO_DATA = "no_data",
  EXECUTION_ERROR = "execution_error",
}

// Server status types
export interface ServerStatus {
  version: string;
  database: string;
  commit?: string;
}

// Folder types
export interface Folder {
  id: number;
  uid?: string;
  title: string;
}

// Datasource listing types (distinct from the lightweight Datasource
// reference type above, which describes a panel/query's datasource pointer)
export interface DatasourceInfo {
  id: number;
  uid?: string;
  name: string;
  type: string;
  isDefault: boolean;
}

// Alert notification channel types (list/detail split, mirroring Alert/AlertDetail)
export interface NotificationChannel {
  id: number;
  uid?: string;
  name: string;
  type: string;
  isDefault: boolean;
}

export interface NotificationChannelDetail {
  id: number;
  uid?: string;
  name: string;
  type: string;
  isDefault: boolean;
  sendReminder: boolean;
  disableResolveMessage: boolean;
  frequency?: string;
  created?: string;
  updated?: string;
  settings: Record<string, unknown>;
}
