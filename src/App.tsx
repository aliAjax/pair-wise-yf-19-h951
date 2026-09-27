import { useCallback, useMemo, useRef, useState } from "react";
import "./styles.css";
import type {
  DBShape,
  IdFilter,
  QueueFilter,
  Specimen,
  ToastItem,
} from "./types";
import {
  genId,
  loadDB,
  nextFreePosition,
  now,
  occupiedMap,
  resetDB,
  saveDB,
  stageOf,
} from "./store";
import { EntryForm } from "./components/EntryForm";
import { Queue } from "./components/Queue";
import { CabinetBoard } from "./components/CabinetBoard";
import { LocationCards } from "./components/LocationCards";
import { DetailModal } from "./components/DetailModal";
import { Toasts } from "./components/Toasts";

function App() {
  const [db, setDB] = useState<DBShape>(() => loadDB());
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [idFilter, setIdFilter] = useState<IdFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draftCabinet, setDraftCabinetState] = useState<Record<string, string>>(
    {}
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(1);

  const persist = useCallback((next: DBShape) => {
    setDB(next);
    saveDB(next);
  }, []);

  const pushToast = useCallback(
    (
      type: ToastItem["type"],
      text: string,
      action?: ToastItem["action"],
      ttl = 3800
    ) => {
      const id = toastSeq.current++;
      setToasts((ts) => [...ts, { id, type, text, action }]);
      window.setTimeout(() => {
        setToasts((ts) => ts.filter((t) => t.id !== id));
      }, ttl);
    },
    []
  );

  const onToastAction = useCallback((t: ToastItem) => {
    t.action?.run();
    setToasts((ts) => ts.filter((x) => x.id !== t.id));
  }, []);

  const occupancy = useMemo(
    () => occupiedMap(db.specimens),
    [db.specimens]
  );

  const updateSpecimen = useCallback(
    (id: string, fn: (s: Specimen) => Specimen) => {
      let changed: Specimen | undefined;
      const next: DBShape = {
        ...db,
        specimens: db.specimens.map((s) => {
          if (s.id !== id) return s;
          changed = fn(s);
          return changed;
        }),
      };
      persist(next);
      return changed as Specimen | undefined;
    },
    [db, persist]
  );

  const addHistory = (s: Specimen, text: string): Specimen => ({
    ...s,
    updatedAt: now(),
    history: [...s.history, { time: now(), text }],
  });

  /* ---------- 登记：重复采集号保留原记录并提示 ---------- */

  const register = useCallback(
    (data: {
      collectingNo: string;
      species: string;
      location: string;
      altitude: string;
      habitat: string;
      collector: string;
    }): string | null => {
      const dup = db.specimens.find(
        (s) =>
          s.collectingNo.trim().toUpperCase() ===
          data.collectingNo.toUpperCase()
      );
      if (dup) {
        pushToast(
          "warn",
          `采集号 ${data.collectingNo} 已存在（原记录已保留，未做任何改动）`,
          { label: "查看原记录", run: () => setOpenId(dup.id) },
          6000
        );
        return `采集号 ${data.collectingNo} 已存在，原记录保留，可在提示中打开查看`;
      }
      const ts = now();
      const specimen: Specimen = {
        id: genId(),
        ...data,
        pressed: false,
        identified: false,
        position: null,
        createdAt: ts,
        updatedAt: ts,
        history: [{ time: ts, text: "采集登记入库队列" }],
      };
      persist({ ...db, specimens: [specimen, ...db.specimens] });
      pushToast(
        "success",
        `${data.collectingNo} 已登记，进入「待压制」队列`
      );
      return null;
    },
    [db, persist, pushToast]
  );

  /* ---------- 流转：压制 → 鉴定 → 上柜 ---------- */

  const press = useCallback(
    (id: string) => {
      const target = db.specimens.find((s) => s.id === id);
      if (!target) return;
      if (target.pressed) return;
      updateSpecimen(id, (s) =>
        addHistory({ ...s, pressed: true }, "完成压制干燥，进入待鉴定队列")
      );
      pushToast("success", `${target.collectingNo} 已压制，可安排鉴定`);
    },
    [db, updateSpecimen, pushToast]
  );

  const identify = useCallback(
    (id: string): string | null => {
      const target = db.specimens.find((s) => s.id === id);
      if (!target) return "标本不存在";
      if (!target.pressed) return "未压制标本不能鉴定，请先完成压制";
      if (target.identified) return null;
      if (!target.species.trim()) return "请先填写物种名称（鉴定结果）再鉴定";
      updateSpecimen(id, (s) =>
        addHistory(
          { ...s, identified: true },
          `完成鉴定：${s.species.trim()}`
        )
      );
      pushToast(
        "success",
        `${target.collectingNo} 鉴定完成（${target.species.trim()}），可分配柜位`
      );
      return null;
    },
    [db, updateSpecimen, pushToast]
  );

  const assignCabinet = useCallback(
    (id: string, cabinetId: string): string | null => {
      const target = db.specimens.find((s) => s.id === id);
      if (!target) return "标本不存在";
      if (!target.pressed) return "未压制标本不能鉴定，更不能上柜";
      if (!target.identified) return "未鉴定标本不能上柜，请先完成鉴定";
      if (target.position) return "该标本已在柜，请使用「调整柜位」";
      const cabinet = db.cabinets.find((c) => c.id === cabinetId);
      if (!cabinet) return "请选择柜位";
      const pos = nextFreePosition(cabinet, db.specimens);
      if (!pos) {
        pushToast(
          "error",
          `柜位 ${cabinet.id} 已满（占用 ${cabinet.capacity}/${cabinet.capacity}），已拒绝分配，请改用其他柜位`
        );
        return `柜位 ${cabinet.id} 已满，拒绝分配`;
      }
      updateSpecimen(id, (s) =>
        addHistory({ ...s, position: pos }, `分配藏位并上柜：${pos}`)
      );
      setDraftCabinetState((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      pushToast("success", `${target.collectingNo} 已上柜，藏位 ${pos}`);
      return null;
    },
    [db, updateSpecimen, pushToast]
  );

  const moveCabinet = useCallback(
    (id: string, cabinetId: string): string | null => {
      const target = db.specimens.find((s) => s.id === id);
      if (!target) return "标本不存在";
      if (!target.identified) return "未鉴定标本不能上柜";
      const cabinet = db.cabinets.find((c) => c.id === cabinetId);
      if (!cabinet) return "请选择柜位";
      if (target.position?.startsWith(`${cabinet.id}-`)) {
        return `标本已在柜 ${cabinet.id}，无需调整`;
      }
      // 计算目标柜空位时先把本标本从占用中剔除
      const others = db.specimens.filter((s) => s.id !== id);
      const pos = nextFreePosition(cabinet, others);
      if (!pos) {
        pushToast(
          "error",
          `柜位 ${cabinet.id} 已满（占用 ${cabinet.capacity}/${cabinet.capacity}），已拒绝调整`
        );
        return `柜位 ${cabinet.id} 已满，拒绝分配`;
      }
      const oldPos = target.position;
      updateSpecimen(id, (s) =>
        addHistory(
          { ...s, position: pos },
          `柜位调整：${oldPos ?? "未上柜"} → ${pos}`
        )
      );
      pushToast("success", `${target.collectingNo} 藏位已调整为 ${pos}`);
      return null;
    },
    [db, updateSpecimen, pushToast]
  );

  /* ---------- 字段编辑：修改后同步更新 ---------- */

  const saveFields = useCallback(
    (
      id: string,
      fields: Partial<
        Pick<
          Specimen,
          | "collectingNo"
          | "species"
          | "location"
          | "altitude"
          | "habitat"
          | "collector"
        >
      >
    ): string | null => {
      const target = db.specimens.find((s) => s.id === id);
      if (!target) return "标本不存在";
      if (fields.collectingNo) {
        const dup = db.specimens.find(
          (s) =>
            s.id !== id &&
            s.collectingNo.trim().toUpperCase() ===
              fields.collectingNo!.trim().toUpperCase()
        );
        if (dup) {
          return `采集号 ${fields.collectingNo} 与已有记录重复，原记录保留，未保存该修改`;
        }
      }
      const notes: string[] = [];
      (
        [
          ["collectingNo", "采集号"],
          ["species", "物种名称"],
          ["location", "采集地点"],
          ["altitude", "海拔"],
          ["habitat", "生境描述"],
          ["collector", "采集人"],
        ] as const
      ).forEach(([key, label]) => {
        if (
          fields[key] !== undefined &&
          fields[key] !== target[key]
        ) {
          notes.push(`${label}：${target[key] || "（空）"} → ${fields[key] || "（空）"}`);
        }
      });
      updateSpecimen(id, (s) => {
        let next = { ...s, ...fields, updatedAt: now() };
        if (notes.length > 0) {
          next = {
            ...next,
            history: [
              ...next.history,
              { time: now(), text: `字段修改：${notes.join("；")}` },
            ],
          };
        }
        return next;
      });
      return null;
    },
    [db, updateSpecimen]
  );

  /* ---------- 筛选与指标 ---------- */

  const matchIdFilter = (s: Specimen, f: IdFilter) => {
    if (f === "all") return true;
    if (f === "unpressed") return !s.pressed;
    if (f === "unidentified") return !s.identified;
    return s.identified;
  };

  const counts = useMemo<Record<QueueFilter, number>>(() => {
    const c: Record<QueueFilter, number> = {
      all: db.specimens.length,
      unpressed: 0,
      pending: 0,
      stored: 0,
    };
    for (const s of db.specimens) c[stageOf(s)] += 1;
    return c;
  }, [db.specimens]);

  const idCounts = useMemo<Record<IdFilter, number>>(() => {
    return {
      all: db.specimens.length,
      unpressed: db.specimens.filter((s) => !s.pressed).length,
      unidentified: db.specimens.filter((s) => !s.identified).length,
      identified: db.specimens.filter((s) => s.identified).length,
    };
  }, [db.specimens]);

  const visibleSpecimens = useMemo(() => {
    return db.specimens
      .filter((s) => queueFilter === "all" || stageOf(s) === queueFilter)
      .filter((s) => matchIdFilter(s, idFilter))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.specimens, queueFilter, idFilter]);

  const locationCount = useMemo(
    () => new Set(db.specimens.map((s) => s.location.trim()).filter(Boolean)).size,
    [db.specimens]
  );

  const openSpecimen =
    db.specimens.find((s) => s.id === openId) ?? null;

  const setDraftCabinet = (specimenId: string, cabinetId: string) => {
    setDraftCabinetState((d) => ({ ...d, [specimenId]: cabinetId }));
  };

  const handleReset = () => {
    if (
      window.confirm(
        "确定恢复演示数据？本地保存的所有标本记录与柜位占用将被重置。"
      )
    ) {
      setDB(resetDB());
      setDraftCabinetState({});
      setOpenId(null);
      pushToast("success", "已恢复为演示数据");
    }
  };

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">植物标本馆 · 压制鉴定入库工作台</p>
          <h1>标本流转工作台</h1>
          <span className="subtitle">
            纸单录入后按「待压制 → 待鉴定 → 已入库」流转，数据保存在本机浏览器
          </span>
        </div>
        <div className="topbar-actions">
          <em className="storage-note">本地存储 · localStorage</em>
          <button className="ghost" onClick={handleReset}>
            恢复演示数据
          </button>
        </div>
      </header>

      <section className="metrics">
        <article>
          <small>待压制</small>
          <strong>{counts.unpressed}</strong>
        </article>
        <article>
          <small>待鉴定（含已鉴定待上柜）</small>
          <strong>{counts.pending}</strong>
        </article>
        <article>
          <small>已入库</small>
          <strong>{counts.stored}</strong>
        </article>
        <article>
          <small>未鉴定标本</small>
          <strong>{idCounts.unidentified}</strong>
        </article>
        <article>
          <small>采集点</small>
          <strong>{locationCount}</strong>
        </article>
      </section>

      <section className="workspace">
        <aside className="panel sidebar">
          <h2>流转规则</h2>
          <ol className="rules">
            <li>
              <em className="rule-badge r-unpressed">待压制</em>
              新登记纸单在此队列，压制干燥后进入下一步。
            </li>
            <li>
              <em className="rule-badge r-pending">待鉴定</em>
              未压制不能鉴定；鉴定需先写明物种名称。
            </li>
            <li>
              <em className="rule-badge r-stored">已入库</em>
              未鉴定不能上柜；柜位满时拒绝分配并显示占用。
            </li>
          </ol>
          <p className="muted small">
            采集号重复时，系统保留原记录并在右上角提示，可直接打开原记录核对。
          </p>
        </aside>

        <EntryForm onSubmit={register} />
      </section>

      <Queue
        specimens={visibleSpecimens}
        cabinets={db.cabinets}
        queueFilter={queueFilter}
        idFilter={idFilter}
        counts={counts}
        idCounts={idCounts}
        occupancy={occupancy}
        onQueueFilter={setQueueFilter}
        onIdFilter={setIdFilter}
        onOpen={(s) => setOpenId(s.id)}
        onPress={(s) => press(s.id)}
        onIdentify={(s) => {
          const err = identify(s.id);
          if (err) pushToast("error", err);
        }}
        onAssign={(s, cabId) => assignCabinet(s.id, cabId)}
        draftCabinet={draftCabinet}
        setDraftCabinet={setDraftCabinet}
      />

      <div className="two-col">
        <CabinetBoard
          cabinets={db.cabinets}
          specimens={db.specimens}
          onOpen={(s) => setOpenId(s.id)}
        />
      </div>

      <LocationCards
        specimens={db.specimens}
        cabinets={db.cabinets}
        onOpen={(s) => setOpenId(s.id)}
      />

      <DetailModal
        specimen={openSpecimen}
        cabinets={db.cabinets}
        specimens={db.specimens}
        occupancy={occupancy}
        onClose={() => setOpenId(null)}
        onSaveFields={saveFields}
        onPress={press}
        onIdentify={identify}
        onAssign={assignCabinet}
        onMove={moveCabinet}
      />

      <Toasts toasts={toasts} onAction={onToastAction} />
    </main>
  );
}

export default App;
