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
  progress: number; // 0–100
  estimatedDelivery?: string;
  lastUpdate: string;
  statusHistory: StatusEvent[];
  createdAt: string;
  deliveredAt?: string;
  notes?: string;
  tags?: string[];
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
