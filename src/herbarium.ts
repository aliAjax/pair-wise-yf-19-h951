export type Stage = "待压制" | "待鉴定" | "已入库";

export const STAGES: Stage[] = ["待压制", "待鉴定", "已入库"];

export interface Specimen {
  id: string;
  collectionNo: string; // 采集号
  species: string; // 物种名称
  location: string; // 采集地点
  elevation: number | null; // 海拔（米）
  habitat: string; // 生境描述
  collector: string; // 采集人
  stage: Stage;
  cabinetId: string | null; // 所属柜位
  slot: number | null; // 柜内格位
  createdAt: number;
  updatedAt: number;
}

export type NewSpecimenInput = Pick<
  Specimen,
  "collectionNo" | "species" | "location" | "elevation" | "habitat" | "collector"
>;

export interface Cabinet {
  id: string;
  name: string;
  capacity: number;
}

export const CABINETS: Cabinet[] = [
  { id: "A-01", name: "A 柜 · 01 层", capacity: 3 },
  { id: "A-02", name: "A 柜 · 02 层", capacity: 4 },
  { id: "B-01", name: "B 柜 · 01 层", capacity: 4 },
  { id: "B-02", name: "B 柜 · 02 层", capacity: 6 },
];

export const STORAGE_KEY = "hxy-herbarium-specimens-v1";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 藏位标签，如 A-01-03 */
export function cabinetLabel(s: Specimen): string | null {
  if (!s.cabinetId || s.slot == null) return null;
  return `${s.cabinetId}-${String(s.slot).padStart(2, "0")}`;
}

export function occupantsOf(specimens: Specimen[], cabinetId: string): Specimen[] {
  return specimens
    .filter((s) => s.cabinetId === cabinetId)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
}

/** 柜内最小空位；柜满返回 null */
export function nextFreeSlot(specimens: Specimen[], cabinet: Cabinet): number | null {
  const used = new Set(
    specimens.filter((s) => s.cabinetId === cabinet.id).map((s) => s.slot)
  );
  for (let i = 1; i <= cabinet.capacity; i += 1) {
    if (!used.has(i)) return i;
  }
  return null;
}

export function findByCollectionNo(
  specimens: Specimen[],
  collectionNo: string,
  excludeId?: string
): Specimen | undefined {
  const key = collectionNo.trim().toLowerCase();
  return specimens.find(
    (s) => s.id !== excludeId && s.collectionNo.trim().toLowerCase() === key
  );
}

function seedSpecimens(): Specimen[] {
  const now = Date.now();
  const at = (minutesAgo: number) => now - minutesAgo * 60_000;
  const rows: Array<
    NewSpecimenInput & { stage: Stage; cabinetId?: string | null; slot?: number | null; ago: number }
  > = [
    {
      collectionNo: "HX-240615-01",
      species: "槭属待定 Acer sp.",
      location: "云雾山北坡",
      elevation: 1420,
      habitat: "常绿阔叶林林缘，半阴坡，腐殖质厚",
      collector: "李慕白",
      stage: "待鉴定",
      ago: 60 * 50,
    },
    {
      collectionNo: "HX-240615-08",
      species: "凤尾蕨 Pteris cretica",
      location: "云雾山北坡",
      elevation: 1380,
      habitat: "阴湿沟谷溪边石缝",
      collector: "李慕白",
      stage: "待压制",
      ago: 60 * 49,
    },
    {
      collectionNo: "HX-240616-03",
      species: "丝路蓟 Cirsium arvense",
      location: "黑龙潭河谷",
      elevation: 960,
      habitat: "河谷撂荒地，向阳草丛",
      collector: "王青禾",
      stage: "已入库",
      cabinetId: "A-01",
      slot: 1,
      ago: 60 * 40,
    },
    {
      collectionNo: "HX-240616-05",
      species: "华中五味子 Schisandra sphenanthera",
      location: "黑龙潭河谷",
      elevation: 1010,
      habitat: "河谷灌丛边缘，藤本",
      collector: "王青禾",
      stage: "已入库",
      cabinetId: "A-01",
      slot: 2,
      ago: 60 * 38,
    },
    {
      collectionNo: "HX-240617-02",
      species: "太白杜鹃 Rhododendron taibaiense",
      location: "杜鹃花海",
      elevation: 2360,
      habitat: "亚高山杜鹃灌丛，酸性土",
      collector: "陈一山",
      stage: "已入库",
      cabinetId: "A-01",
      slot: 3,
      ago: 60 * 30,
    },
    {
      collectionNo: "HX-240617-09",
      species: "秦岭冷杉 Abies chensiensis",
      location: "杜鹃花海",
      elevation: 2540,
      habitat: "针叶林内，苔藓层厚",
      collector: "陈一山",
      stage: "已入库",
      cabinetId: "B-01",
      slot: 1,
      ago: 60 * 26,
    },
    {
      collectionNo: "HX-240618-04",
      species: "野核桃 Juglans cathayensis",
      location: "白石崖",
      elevation: 1180,
      habitat: "石灰岩崖壁下缓坡，落叶阔叶林",
      collector: "赵拾遗",
      stage: "待压制",
      ago: 60 * 12,
    },
    {
      collectionNo: "HX-240618-11",
      species: "菊科待定 Asteraceae",
      location: "白石崖",
      elevation: 1230,
      habitat: "崖顶草甸，风口处",
      collector: "赵拾遗",
      stage: "待鉴定",
      ago: 60 * 6,
    },
  ];
  return rows.map((row, i) => ({
    id: `seed-${i + 1}`,
    collectionNo: row.collectionNo,
    species: row.species,
    location: row.location,
    elevation: row.elevation,
    habitat: row.habitat,
    collector: row.collector,
    stage: row.stage,
    cabinetId: row.cabinetId ?? null,
    slot: row.slot ?? null,
    createdAt: at(row.ago),
    updatedAt: at(row.ago),
  }));
}

export function loadSpecimens(): Specimen[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSpecimens();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedSpecimens();
    return parsed as Specimen[];
  } catch {
    return seedSpecimens();
  }
}

export function saveSpecimens(list: Specimen[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 本地存储不可用时静默失败，页面内数据仍可用
  }
}
