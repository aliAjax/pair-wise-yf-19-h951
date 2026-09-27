import type { Cabinet, DBShape, HistoryEntry, Specimen, Stage } from "./types";

const STORAGE_KEY = "herbarium-workbench-v1";

export function now(): string {
  return new Date().toISOString();
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function stageOf(s: Specimen): Stage {
  if (s.position) return "stored";
  if (s.pressed && !s.identified) return "pending";
  // 已压制且已鉴定、等待上柜：流转上仍按“待鉴定”队列展示
  return s.pressed ? "pending" : "unpressed";
}

export const STAGE_LABEL: Record<Stage, string> = {
  unpressed: "待压制",
  pending: "待鉴定",
  stored: "已入库",
};

/* ---------- 藏位 / 柜位 ---------- */

export function cabinetOfPosition(position: string): string {
  const parts = position.split("-");
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : position;
}

export function slotIndex(position: string): number {
  const parts = position.split("-");
  const n = Number(parts[2]);
  return Number.isInteger(n) ? n : 0;
}

export function occupiedMap(specimens: Specimen[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const s of specimens) {
    if (!s.position) continue;
    const cab = cabinetOfPosition(s.position);
    (map[cab] ??= new Set()).add(s.position);
  }
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, [...v].sort()])
  );
}

/** 返回柜位的下一个空藏位；柜满时返回 null */
export function nextFreePosition(
  cabinet: Cabinet,
  specimens: Specimen[]
): string | null {
  const used = new Set(
    (occupiedMap(specimens)[cabinet.id] ?? []).map(slotIndex)
  );
  for (let i = 1; i <= cabinet.capacity; i++) {
    if (!used.has(i)) {
      return `${cabinet.id}-${String(i).padStart(2, "0")}`;
    }
  }
  return null;
}

/* ---------- 种子数据 ---------- */

function iso(daysAgo: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

interface SeedInput {
  no: string;
  species: string;
  location: string;
  altitude: string;
  habitat: string;
  collector: string;
  pressed: boolean;
  identified?: boolean;
  position?: string | null;
  daysAgo: number;
}

function seedSpecimen(input: SeedInput): Specimen {
  const created = iso(input.daysAgo, 9, 15);
  const history: HistoryEntry[] = [{ time: created, text: "采集登记入库队列" }];
  if (input.pressed) {
    history.push({ time: iso(input.daysAgo, 14, 30), text: "完成压制干燥" });
  }
  if (input.identified) {
    history.push({
      time: iso(Math.max(0, input.daysAgo - 1), 10, 20),
      text: `完成鉴定：${input.species}`,
    });
  }
  if (input.position) {
    history.push({
      time: iso(Math.max(0, input.daysAgo - 2), 16, 0),
      text: `分配藏位并上柜：${input.position}`,
    });
  }
  const last = history[history.length - 1];
  return {
    id: genId(),
    collectingNo: input.no,
    species: input.species,
    location: input.location,
    altitude: input.altitude,
    habitat: input.habitat,
    collector: input.collector,
    pressed: input.pressed,
    identified: input.identified ?? false,
    position: input.position ?? null,
    createdAt: created,
    updatedAt: last.time,
    history,
  };
}

export const seedCabinets: Cabinet[] = [
  { id: "A-01", name: "一号柜·蕨类与裸子", capacity: 12 },
  { id: "A-02", name: "二号柜·双子叶（上）", capacity: 16 },
  { id: "B-12", name: "十二号柜·双子叶（下）", capacity: 12 },
  { id: "C-03", name: "三号柜·单子叶与菊科", capacity: 10 },
];

const seedInputs: SeedInput[] = [
  {
    no: "HX-240615-01",
    species: "色木槭",
    location: "天目山·三里亭沟谷",
    altitude: "1420 m",
    habitat: "落叶阔叶林下，沟边半阴处",
    collector: "周以栗",
    pressed: true,
    identified: true,
    position: "B-12-01",
    daysAgo: 12,
  },
  {
    no: "HX-240615-08",
    species: "蕨类待定",
    location: "天目山·三里亭沟谷",
    altitude: "1180 m",
    habitat: "阴湿沟谷，石缝腐殖土",
    collector: "林湄",
    pressed: true,
    position: null,
    daysAgo: 11,
  },
  {
    no: "HX-240616-03",
    species: "兔儿风",
    location: "天目山·老殿后山",
    altitude: "1050 m",
    habitat: "针阔混交林缘，腐殖层厚",
    collector: "周以栗",
    pressed: true,
    identified: true,
    position: "B-12-04",
    daysAgo: 10,
  },
  {
    no: "HX-240616-05",
    species: "水杉（栽培）",
    location: "天目山·禅源寺前",
    altitude: "330 m",
    habitat: "寺院旁水杉林，人工栽培",
    collector: "吴其湛",
    pressed: true,
    identified: true,
    position: "A-01-01",
    daysAgo: 10,
  },
  {
    no: "HX-240618-02",
    species: "蕨属待定",
    location: "天目山·三里亭沟谷",
    altitude: "1210 m",
    habitat: "溪边岩石阴面，苔藓丛中",
    collector: "林湄",
    pressed: true,
    identified: true,
    position: "A-01-02",
    daysAgo: 8,
  },
  {
    no: "HX-240620-01",
    species: "槭树科待定",
    location: "天目山·开山老殿",
    altitude: "980 m",
    habitat: "林窗下，落叶层上",
    collector: "吴其湛",
    pressed: true,
    position: null,
    daysAgo: 7,
  },
  {
    no: "HX-240620-06",
    species: "南方红豆杉",
    location: "天目山·狮子口",
    altitude: "760 m",
    habitat: "村旁风水林，老树萌生枝",
    collector: "周以栗",
    pressed: true,
    identified: true,
    position: "A-01-03",
    daysAgo: 7,
  },
  {
    no: "HX-240621-04",
    species: "菊科待定",
    location: "天目山·老殿后山",
    altitude: "1090 m",
    habitat: "毛竹林缘向阳草坡",
    collector: "郑樵",
    pressed: true,
    position: null,
    daysAgo: 6,
  },
  {
    no: "HX-240622-02",
    species: "萱草",
    location: "清凉峰·南坡垭口",
    altitude: "1600 m",
    habitat: "亚高山灌丛草甸边缘",
    collector: "郑樵",
    pressed: true,
    identified: true,
    position: "C-03-01",
    daysAgo: 5,
  },
  {
    no: "HX-240623-07",
    species: "三脉紫菀",
    location: "清凉峰·南坡垭口",
    altitude: "1560 m",
    habitat: "灌丛边草甸，土壤湿润",
    collector: "林湄",
    pressed: true,
    identified: true,
    position: "C-03-02",
    daysAgo: 4,
  },
  {
    no: "HX-240624-03",
    species: "白顶溪鸲寄主藓（记录）",
    location: "龙王山·千亩田沼泽",
    altitude: "1320 m",
    habitat: "泥炭沼泽边缘，常年积水",
    collector: "吴其湛",
    pressed: true,
    position: null,
    daysAgo: 3,
  },
  // 以下为 A-01 柜历史归档标本（该柜 12 格，用于演示柜满拒绝分配）
  {
    no: "HX-231012-02",
    species: "鳞毛蕨",
    location: "天目山·三里亭沟谷",
    altitude: "1150 m",
    habitat: "阔叶林下阴处",
    collector: "周以栗",
    pressed: true,
    identified: true,
    position: "A-01-04",
    daysAgo: 260,
  },
  {
    no: "HX-231012-05",
    species: "贯众",
    location: "天目山·禅源寺前",
    altitude: "350 m",
    habitat: "寺墙石缝",
    collector: "林湄",
    pressed: true,
    identified: true,
    position: "A-01-05",
    daysAgo: 260,
  },
  {
    no: "HX-231015-03",
    species: "凤丫蕨",
    location: "天目山·三里亭沟谷",
    altitude: "1200 m",
    habitat: "沟边湿地",
    collector: "林湄",
    pressed: true,
    identified: true,
    position: "A-01-06",
    daysAgo: 250,
  },
  {
    no: "HX-231018-01",
    species: "银杏（栽培）",
    location: "天目山·禅源寺前",
    altitude: "330 m",
    habitat: "古树落枝标本",
    collector: "吴其湛",
    pressed: true,
    identified: true,
    position: "A-01-07",
    daysAgo: 240,
  },
  {
    no: "HX-231020-04",
    species: "针毛蕨",
    location: "龙王山·千亩田沼泽",
    altitude: "1280 m",
    habitat: "沼泽外缘林下",
    collector: "郑樵",
    pressed: true,
    identified: true,
    position: "A-01-08",
    daysAgo: 230,
  },
  {
    no: "HX-231022-02",
    species: "卷柏",
    location: "天目山·狮子口",
    altitude: "780 m",
    habitat: "干旱岩面",
    collector: "周以栗",
    pressed: true,
    identified: true,
    position: "A-01-09",
    daysAgo: 220,
  },
  {
    no: "HX-231025-06",
    species: "铁角蕨",
    location: "天目山·老殿后山",
    altitude: "1060 m",
    habitat: "老树树干附生",
    collector: "林湄",
    pressed: true,
    identified: true,
    position: "A-01-10",
    daysAgo: 210,
  },
  {
    no: "HX-231028-03",
    species: "柳杉",
    location: "天目山·开山老殿",
    altitude: "960 m",
    habitat: "柳杉纯林萌生枝",
    collector: "吴其湛",
    pressed: true,
    identified: true,
    position: "A-01-11",
    daysAgo: 200,
  },
  {
    no: "HX-231102-01",
    species: "瓦韦",
    location: "清凉峰·南坡垭口",
    altitude: "1490 m",
    habitat: "岩石薄土层",
    collector: "郑樵",
    pressed: true,
    identified: true,
    position: "A-01-12",
    daysAgo: 190,
  },
  {
    no: "HX-240625-02",
    species: "待压制登记",
    location: "龙王山·千亩田沼泽",
    altitude: "1290 m",
    habitat: "沼泽旁灌丛，叶背白粉",
    collector: "郑樵",
    pressed: false,
    daysAgo: 2,
  },
  {
    no: "HX-240625-09",
    species: "待压制登记",
    location: "天目山·禅源寺前",
    altitude: "340 m",
    habitat: "行道树冠层，花枝",
    collector: "周以栗",
    pressed: false,
    daysAgo: 2,
  },
  {
    no: "HX-240626-01",
    species: "待压制登记",
    location: "天目山·狮子口",
    altitude: "800 m",
    habitat: "油茶林下幼苗",
    collector: "林湄",
    pressed: false,
    daysAgo: 1,
  },
  {
    no: "HX-240626-04",
    species: "十字花科待定",
    location: "清凉峰·南坡垭口",
    altitude: "1475 m",
    habitat: "步道旁弃土，早春短命植物",
    collector: "吴其湛",
    pressed: true,
    identified: true,
    position: "C-03-03",
    daysAgo: 1,
  },
];

function buildSeed(): DBShape {
  return {
    specimens: seedInputs.map(seedSpecimen),
    cabinets: seedCabinets,
  };
}

/* ---------- 本地存储 ---------- */

export function loadDB(): DBShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DBShape;
      if (Array.isArray(parsed.specimens) && Array.isArray(parsed.cabinets)) {
        return parsed;
      }
    }
  } catch {
    // 存储损坏时回退到种子数据
  }
  const seed = buildSeed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch {
    // 隐私模式等场景下仅使用内存数据
  }
  return seed;
}

export function saveDB(db: DBShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // 忽略写入失败
  }
}

export function resetDB(): DBShape {
  const seed = buildSeed();
  saveDB(seed);
  return seed;
}
