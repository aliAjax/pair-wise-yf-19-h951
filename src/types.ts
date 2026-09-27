export type Stage = "unpressed" | "pending" | "stored";

export interface HistoryEntry {
  time: string;
  text: string;
}

export interface Specimen {
  id: string;
  /** 采集号 */
  collectingNo: string;
  /** 物种名称（鉴定结果） */
  species: string;
  /** 采集地点 */
  location: string;
  /** 海拔 */
  altitude: string;
  /** 生境描述 */
  habitat: string;
  /** 采集人 */
  collector: string;
  /** 是否已压制 */
  pressed: boolean;
  /** 是否已鉴定 */
  identified: boolean;
  /** 藏位，形如 A-01-03；未上柜为 null */
  position: string | null;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntry[];
}

export interface Cabinet {
  /** 柜号，形如 A-01 */
  id: string;
  name: string;
  /** 格位总数 */
  capacity: number;
}

export interface DBShape {
  specimens: Specimen[];
  cabinets: Cabinet[];
}

export type QueueFilter = "all" | Stage;
export type IdFilter = "all" | "unpressed" | "unidentified" | "identified";

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastItem {
  id: number;
  type: "success" | "warn" | "error";
  text: string;
  action?: ToastAction;
}
