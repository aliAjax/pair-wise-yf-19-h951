import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  CABINETS,
  STORAGE_KEY,
  findByCollectionNo,
  loadSpecimens,
  nextFreeSlot,
  occupantsOf,
  saveSpecimens,
  uid,
} from "./herbarium";
import type { NewSpecimenInput, Specimen } from "./herbarium";
import SpecimenForm from "./components/SpecimenForm";
import type { AddResult } from "./components/SpecimenForm";
import QueuePanel from "./components/QueuePanel";
import type { QueueFilter } from "./components/QueuePanel";
import LocationCards from "./components/LocationCards";
import CabinetPanel from "./components/CabinetPanel";
import DetailModal from "./components/DetailModal";
import ToastStack from "./components/ToastStack";
import type { Toast, ToastKind } from "./components/ToastStack";

function App() {
  const [specimens, setSpecimens] = useState<Specimen[]>(loadSpecimens);
  const [filter, setFilter] = useState<QueueFilter>("全部");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  // 数据存本地
  useEffect(() => {
    saveSpecimens(specimens);
  }, [specimens]);

  // 多标签页之间同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSpecimens(loadSpecimens());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pushToast = (kind: ToastKind, text: string) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((list) => [...list, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3800);
  };

  /** 新增标本：重复采集号保留原记录并提示 */
  const addSpecimen = (input: NewSpecimenInput): AddResult => {
    const existing = findByCollectionNo(specimens, input.collectionNo);
    if (existing) {
      pushToast("warn", `采集号 ${existing.collectionNo} 已存在，已保留原记录`);
      return { ok: false, existing };
    }
    const now = Date.now();
    const item: Specimen = {
      ...input,
      id: uid(),
      stage: "待压制",
      cabinetId: null,
      slot: null,
      createdAt: now,
      updatedAt: now,
    };
    setSpecimens((list) => [...list, item]);
    pushToast("ok", `已登记 ${item.collectionNo}，进入待压制队列`);
    return { ok: true };
  };

  /** 待压制 → 待鉴定 */
  const pressSpecimen = (id: string) => {
    const s = specimens.find((x) => x.id === id);
    if (!s) return;
    if (s.stage !== "待压制") {
      pushToast("warn", `${s.collectionNo} 当前为「${s.stage}」，无需压制`);
      return;
    }
    setSpecimens((list) =>
      list.map((x) =>
        x.id === id ? { ...x, stage: "待鉴定", updatedAt: Date.now() } : x
      )
    );
    pushToast("ok", `${s.collectionNo} 已完成压制，转入待鉴定`);
  };

  /** 待鉴定 → 已入库：未压制不能鉴定，柜满拒绝分配 */
  const shelveSpecimen = (id: string, cabinetId: string): string | null => {
    const s = specimens.find((x) => x.id === id);
    if (!s) return "记录不存在";
    if (s.stage === "待压制") return "该标本尚未压制，不能鉴定入柜";
    if (s.stage === "已入库") return "该标本已上柜，如需调整请使用调柜";
    if (!s.species.trim()) return "请先填写物种名称再鉴定";
    const cab = CABINETS.find((c) => c.id === cabinetId);
    if (!cab) return "请选择柜位";
    const slot = nextFreeSlot(specimens, cab);
    if (slot == null) {
      const used = occupantsOf(specimens, cab.id).length;
      return `柜位 ${cab.name} 已满（占用 ${used}/${cab.capacity}），无法分配`;
    }
    setSpecimens((list) =>
      list.map((x) =>
        x.id === id
          ? { ...x, stage: "已入库", cabinetId, slot, updatedAt: Date.now() }
          : x
      )
    );
    pushToast(
      "ok",
      `${s.collectionNo} 已鉴定入柜 → ${cabinetId}-${String(slot).padStart(2, "0")}`
    );
    return null;
  };

  /** 已入库标本调柜 */
  const moveSpecimen = (id: string, cabinetId: string): string | null => {
    const s = specimens.find((x) => x.id === id);
    if (!s) return "记录不存在";
    if (s.stage !== "已入库") return "仅已入库标本可调柜";
    if (s.cabinetId === cabinetId) return "该标本已在所选柜位";
    const cab = CABINETS.find((c) => c.id === cabinetId);
    if (!cab) return "请选择柜位";
    const slot = nextFreeSlot(specimens, cab);
    if (slot == null) {
      const used = occupantsOf(specimens, cab.id).length;
      return `柜位 ${cab.name} 已满（占用 ${used}/${cab.capacity}），无法调入`;
    }
    setSpecimens((list) =>
      list.map((x) =>
        x.id === id ? { ...x, cabinetId, slot, updatedAt: Date.now() } : x
      )
    );
    pushToast("ok", `${s.collectionNo} 已调入 ${cabinetId}-${String(slot).padStart(2, "0")}`);
    return null;
  };

  /** 详情页字段修改：采集号与其他记录重复时拒绝并保留原记录 */
  const updateSpecimen = (id: string, patch: NewSpecimenInput): string | null => {
    const dup = findByCollectionNo(specimens, patch.collectionNo, id);
    if (dup) {
      return `采集号 ${dup.collectionNo} 已被记录「${dup.species}」使用，已保留原记录`;
    }
    setSpecimens((list) =>
      list.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x))
    );
    return null;
  };

  const removeSpecimen = (id: string) => {
    const s = specimens.find((x) => x.id === id);
    setSpecimens((list) => list.filter((x) => x.id !== id));
    setDetailId(null);
    if (s) pushToast("ok", `已删除 ${s.collectionNo}`);
  };

  const stats = useMemo(() => {
    const slotsTotal = CABINETS.reduce((sum, c) => sum + c.capacity, 0);
    return {
      queue: specimens.filter((s) => s.stage !== "已入库").length,
      pressing: specimens.filter((s) => s.stage === "待压制").length,
      identifying: specimens.filter((s) => s.stage === "待鉴定").length,
      shelved: specimens.filter((s) => s.stage === "已入库").length,
      locations: new Set(specimens.map((s) => s.location.trim() || "未填写地点")).size,
      slotsUsed: specimens.filter((s) => s.cabinetId != null).length,
      slotsTotal,
    };
  }, [specimens]);

  const detail = detailId ? specimens.find((s) => s.id === detailId) ?? null : null;

  return (
    <main className="app">
      <section className="hero">
        <p>植物标本馆 · 压制标本入库工作台</p>
        <h1>标本入库工作台</h1>
        <span>
          登记采集号、物种、地点、海拔、生境与采集人，标本按「待压制 → 待鉴定 →
          已入库」流转：未压制不能鉴定，未鉴定不能上柜；柜位满时拒绝分配并显示占用。
          重复采集号自动保留原记录。数据保存在本机浏览器。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>入库队列</small>
          <strong>{stats.queue}</strong>
        </article>
        <article>
          <small>待压制</small>
          <strong>{stats.pressing}</strong>
        </article>
        <article>
          <small>待鉴定</small>
          <strong>{stats.identifying}</strong>
        </article>
        <article>
          <small>已上柜</small>
          <strong>{stats.shelved}</strong>
        </article>
        <article>
          <small>采集点</small>
          <strong>{stats.locations}</strong>
        </article>
        <article>
          <small>柜位占用</small>
          <strong>
            {stats.slotsUsed}
            <i>/{stats.slotsTotal}</i>
          </strong>
        </article>
      </section>

      <div className="board">
        <div className="board-side">
          <SpecimenForm onAdd={addSpecimen} onOpenDetail={setDetailId} />
          <CabinetPanel specimens={specimens} onOpenDetail={setDetailId} />
        </div>
        <div className="board-main">
          <QueuePanel
            specimens={specimens}
            filter={filter}
            onFilterChange={setFilter}
            onPress={pressSpecimen}
            onOpenDetail={setDetailId}
          />
          <LocationCards specimens={specimens} onOpenDetail={setDetailId} />
        </div>
      </div>

      {detail && (
        <DetailModal
          specimen={detail}
          specimens={specimens}
          onClose={() => setDetailId(null)}
          onSave={updateSpecimen}
          onPress={pressSpecimen}
          onShelve={shelveSpecimen}
          onMove={moveSpecimen}
          onRemove={removeSpecimen}
        />
      )}

      <ToastStack toasts={toasts} />
    </main>
  );
}

export default App;
