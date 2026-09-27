import { useEffect, useState } from "react";
import type { NewSpecimenInput, Specimen } from "../herbarium";
import { CABINETS, STAGES, cabinetLabel, occupantsOf } from "../herbarium";
import StageBadge from "./StageBadge";

interface Props {
  specimen: Specimen;
  specimens: Specimen[];
  onClose: () => void;
  onSave: (id: string, patch: NewSpecimenInput) => string | null;
  onPress: (id: string) => void;
  onShelve: (id: string, cabinetId: string) => string | null;
  onMove: (id: string, cabinetId: string) => string | null;
  onRemove: (id: string) => void;
}

type Draft = Record<keyof NewSpecimenInput, string>;

function toDraft(s: Specimen): Draft {
  return {
    collectionNo: s.collectionNo,
    species: s.species,
    location: s.location,
    elevation: s.elevation == null ? "" : String(s.elevation),
    habitat: s.habitat,
    collector: s.collector,
  };
}

export default function DetailModal({
  specimen,
  specimens,
  onClose,
  onSave,
  onPress,
  onShelve,
  onMove,
  onRemove,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(specimen));
  const [cabinetId, setCabinetId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // 切换到另一条记录时重置草稿
  useEffect(() => {
    setDraft(toDraft(specimen));
    setCabinetId("");
    setError(null);
    setSaved(false);
  }, [specimen.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key: keyof Draft) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  /** 提交草稿，返回是否成功 */
  const saveDraft = (): boolean => {
    const patch: NewSpecimenInput = {
      collectionNo: draft.collectionNo.trim(),
      species: draft.species.trim(),
      location: draft.location.trim(),
      elevation:
        draft.elevation.trim() === "" || Number.isNaN(Number(draft.elevation))
          ? null
          : Math.round(Number(draft.elevation)),
      habitat: draft.habitat.trim(),
      collector: draft.collector.trim(),
    };
    if (!patch.collectionNo || !patch.species || !patch.location || !patch.collector) {
      setError("采集号、物种名称、采集地点和采集人不能为空。");
      return false;
    }
    const err = onSave(specimen.id, patch);
    if (err) {
      setError(err);
      return false;
    }
    setError(null);
    setSaved(true);
    return true;
  };

  const handlePress = () => {
    if (!saveDraft()) return;
    onPress(specimen.id);
  };

  const handleShelve = () => {
    if (!saveDraft()) return;
    if (!cabinetId) {
      setError("请选择要分配的柜位。");
      return;
    }
    const err = onShelve(specimen.id, cabinetId);
    setError(err);
  };

  const handleMove = () => {
    if (!cabinetId) {
      setError("请选择要调入的柜位。");
      return;
    }
    const err = onMove(specimen.id, cabinetId);
    setError(err);
  };

  const handleRemove = () => {
    if (window.confirm(`确定删除标本 ${specimen.collectionNo} 吗？该操作不可恢复。`)) {
      onRemove(specimen.id);
    }
  };

  const stageIndex = STAGES.indexOf(specimen.stage);
  const label = cabinetLabel(specimen);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`标本详情 ${specimen.collectionNo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <div className="q-title">
              <h2>{specimen.collectionNo}</h2>
              <StageBadge stage={specimen.stage} />
              {label && <span className="cabinet-tag">{label}</span>}
            </div>
            <p className="modal-sub">
              更新于 {new Date(specimen.updatedAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <button className="ghost" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>

        <ol className="steps">
          {STAGES.map((st, i) => (
            <li
              key={st}
              className={
                i < stageIndex ? "step step-done" : i === stageIndex ? "step step-now" : "step"
              }
            >
              {st}
            </li>
          ))}
        </ol>

        <div className="field-grid">
          <label>
            <span>采集号 *</span>
            <input
              value={draft.collectionNo}
              onChange={(e) => set("collectionNo")(e.target.value)}
            />
          </label>
          <label>
            <span>物种名称 *</span>
            <input
              value={draft.species}
              onChange={(e) => set("species")(e.target.value)}
            />
          </label>
          <label>
            <span>采集地点 *</span>
            <input
              value={draft.location}
              onChange={(e) => set("location")(e.target.value)}
            />
          </label>
          <label>
            <span>海拔（米）</span>
            <input
              type="number"
              min="0"
              value={draft.elevation}
              onChange={(e) => set("elevation")(e.target.value)}
            />
          </label>
          <label>
            <span>采集人 *</span>
            <input
              value={draft.collector}
              onChange={(e) => set("collector")(e.target.value)}
            />
          </label>
          <label>
            <span>生境描述</span>
            <input
              value={draft.habitat}
              onChange={(e) => set("habitat")(e.target.value)}
            />
          </label>
        </div>

        <div className="flow-box">
          {specimen.stage === "待压制" && (
            <>
              <p>标本尚未压制，不能鉴定；完成压制后进入待鉴定。</p>
              <button className="primary" onClick={handlePress}>
                完成压制，转入待鉴定
              </button>
            </>
          )}

          {specimen.stage === "待鉴定" && (
            <>
              <p>已压制，可鉴定。鉴定需指定馆藏柜位，未鉴定不能上柜。</p>
              <div className="flow-row">
                <select value={cabinetId} onChange={(e) => setCabinetId(e.target.value)}>
                  <option value="">选择柜位…</option>
                  {CABINETS.map((cab) => {
                    const used = occupantsOf(specimens, cab.id).length;
                    const full = used >= cab.capacity;
                    return (
                      <option key={cab.id} value={cab.id} disabled={full}>
                        {cab.name} · {full ? `已满 ${used}/${cab.capacity}` : `余 ${cab.capacity - used}/${cab.capacity}`}
                      </option>
                    );
                  })}
                </select>
                <button className="primary" onClick={handleShelve}>
                  鉴定并入柜
                </button>
              </div>
            </>
          )}

          {specimen.stage === "已入库" && (
            <>
              <p>
                已上柜，藏位 <b>{label}</b>。如需调整柜位请选择新柜位。
              </p>
              <div className="flow-row">
                <select value={cabinetId} onChange={(e) => setCabinetId(e.target.value)}>
                  <option value="">调入柜位…</option>
                  {CABINETS.map((cab) => {
                    const used = occupantsOf(specimens, cab.id).length;
                    const full = used >= cab.capacity;
                    const current = cab.id === specimen.cabinetId;
                    return (
                      <option key={cab.id} value={cab.id} disabled={full || current}>
                        {cab.name} ·{" "}
                        {current
                          ? `当前所在 ${used}/${cab.capacity}`
                          : full
                            ? `已满 ${used}/${cab.capacity}`
                            : `余 ${cab.capacity - used}/${cab.capacity}`}
                      </option>
                    );
                  })}
                </select>
                <button onClick={handleMove}>调柜</button>
              </div>
            </>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <footer className="modal-foot">
          <button className="danger" onClick={handleRemove}>
            删除记录
          </button>
          <div className="modal-foot-right">
            {saved && !error && <span className="saved-tag">已保存并同步</span>}
            <button className="primary" onClick={saveDraft}>
              保存修改
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
