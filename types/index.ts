export type OrderStatus =
  | 'processed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'issue';

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
  estimatedDelivery?: string;       // legacy display string; new orders use estimatedDeliveryDate
  estimatedDeliveryDate?: string;   // YYYY-MM-DD (local date)
  lastUpdate: string;               // ISO timestamp (older orders may hold a display string)
  statusHistory: StatusEvent[];
  createdAt: string;
  deliveredAt?: string;
  archivedAt?: string;              // set when moved to history from active
  notes?: string;
  isArchived?: boolean;             // true = in History
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
export type StatusFilter = 'all' | 'today' | Exclude<OrderStatus, 'delivered'>;

/** How sure the detector is about the number and its carrier. */
export type Confidence =
  | 'verified'   // format + check digit confirmed
  | 'likely'     // format matches, no check digit to confirm it
  | 'invalid'    // format matches but the check digit is wrong (probably a typo)
  | 'unknown';   // no known format

export interface ValidationResult {
  valid: boolean;
  normalized: string;
  confidence: Confidence;
  carrier?: string;
  candidates?: string[];
  warning?: string;
  canForce: boolean;
}
