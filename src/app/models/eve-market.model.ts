export interface EveItem {
  typeId: number;
  name: string;
  categoryName: string;
  groupName: string;
  description?: string;
  iconUrl?: string;
}

export interface EveCategory {
  name: string;
  icon: string;
  groups: {
    name: string;
    items: EveItem[];
  }[];
}

export interface MarketPrice {
  typeId: number;
  sellMin: number;
  buyMax: number;
  sellVolume?: number;
  buyVolume?: number;
  averagePrice?: number;
  lastUpdated: string;
  stationName?: string;
}

export interface PriceHistoryPoint {
  date: string;
  average: number;
  highest: number;
  lowest: number;
  volume: number;
  orderCount: number;
}

export interface UserProfile {
  username: string;
  characterId?: number;
  portraitUrl: string;
  corporation?: string;
  securityStatus?: number;
}

// Usuario almacenado en la "base de datos" local del dispositivo
export interface StoredUser {
  username: string;
  passwordHash: string;     // SHA-256 hex de la contraseña
  characterId?: number;
  portraitUrl: string;
  corporation?: string;
  registeredAt: string;     // ISO date string
}

