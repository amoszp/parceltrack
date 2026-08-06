export type OrderStatus =
  | 'processed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'issue';

export type MetricFilter = 'active' | 'issues' | 'today' | null;

export interface StatusEvent {
  timestamp: string;
  location: string;
  description: string;
  status: OrderStatus;
}

export interface Order {
  id: string;
  name: string;
  platform: string;
  trackingNumber: string;
  carrier: string;
  status: OrderStatus;
  progress: number;
  estimatedDelivery?: string;       // display string e.g. "Dec 22" or "Today"
  estimatedDeliveryDate?: string;   // ISO date string for the date picker
  lastUpdate: string;
  statusHistory: StatusEvent[];
  createdAt: string;
  deliveredAt?: string;
  archivedAt?: string;              // set when moved to history from active
  notes?: string;
  isArchived?: boolean;             // true = in History, permanent delete allowed
}

export interface SuggestedOrder {
  id: string;
  name: string;
  platform: string;
  trackingNumber: string;
  source: 'email' | 'sms' | 'webhook';
  raw: string;
  createdAt: string;
}

export type ActiveTab = 'list' | 'add' | 'history';
export type StatusFilter = 'all' | OrderStatus;

export interface ValidationResult {
  valid: boolean;
  carrier?: string;
  warning?: string;
  canForce: boolean;
}
