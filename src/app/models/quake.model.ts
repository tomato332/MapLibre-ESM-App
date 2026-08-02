export interface Hypocenter {
  name?: string;
  magnitude?: number;
  depth?: number;
  latitude?: number;
  longitude?: number;
}

export interface EarthquakeInfo {
  time?: string;
  originTime?: string;
  hypocenter?: Hypocenter;
  maxScale?: number;
  domesticTsunami?: string;
  foreignTsunami?: string;
}

export interface P2PQuakeItem {
  id?: string;
  code?: number;
  time?: string;
  issue?: {
    type?: string;
    source?: string;
  };
  earthquake?: EarthquakeInfo;
  points?: {
    addr?: string;
    pref?: string;
    scale?: number;
    isArea?: boolean;
  }[];
  areas?: {
    name?: string;
    prefName?: string;
    scaleFrom?: number;
    scaleTo?: number;
    scale?: number;
  }[];
  Longitude?: number;
  Latitude?: number;
  longitude?: number;
  latitude?: number;
}

export interface EEWMessage {
  Title?: string;
  Hypocenter?: string;
  Longitude?: number;
  Latitude?: number;
  Depth?: number;
  Magunitude?: number;
  MaxIntensity?: string;
  OriginTime?: string;
  AnnouncedTime?: string;
  ReportTime?: string;
  ReportNum?: number;
  isFinal?: boolean;
  isWarn?: boolean;
  isCancel?: boolean;
  Issue?: {
    Status?: string;
  };
  isSimulation?: boolean;
  simulationStartTime?: number;
  simulatedElapsed?: number;
  areas?: any[];
}

export interface StationState {
  id: string;
  name: string;
  lonlat: [number, number];
  intensity: number;
  event: any | null;
  lastUpdated?: number;
}

export interface ProcessedHistoryItem {
  isGroup: boolean;
  item?: P2PQuakeItem;
  groupKey?: string;
  items?: P2PQuakeItem[];
  latestItem?: P2PQuakeItem;
  maxScale?: number;
}
