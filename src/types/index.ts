export interface Prize {
  id: number;
  name: string;
  quantity: number;
  probability: number;
  image_url: string;
  active: boolean;
  wheelCount: number;
  isLosePrize?: boolean;
}

export interface SpinRequest {
  id: number;
  prize: Prize;
  timestamp: string;
  status: 'processed' | 'undone';
}

export interface AppData {
  wheelUnlocked: boolean;
  prizes: Prize[];
  spinRequests: SpinRequest[];
}
