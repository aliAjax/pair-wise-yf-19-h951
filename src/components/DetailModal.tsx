import { useEffect, useRef, useState } from "react";
import type { Cabinet, Specimen } from "../types";
import { cabinetOfPosition, formatTime, nextFreePosition, stageOf, STAGE_LABEL } from "../store";

interface Props {
  specimen: Specimen | null;
  cabinets: Cabinet[];
  specimens: Specimen[];
  occupancy: Record<string, string[]>;
  onClose: () => void;
  onSaveFields: (
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
  ) => string | null;
  onPress: (id: string) => void;
  onIdentify: (id: string) => string | null;
  onAssign: (id: string, cabinetId: string) => string | null;
  onMove: (id: string, cabinetId: string) => string | null;
}

type Fields = Pick<
  Specimen,
  "collectingNo" | "species" | "location" | "altitude" | "habitat" | "collector"
>;

export function DetailModal({
  specimen,
  cabinets,
  specimens,
  occupancy,
  onClose,
  onSaveFields,
  onPress,
  onIdentify,
  onAssign,
  onMove,
}: Props) {
  const [fields, setFields] = useState<Fields>({
    collectingNo: "",
    species: "",
    location: "",
    altitude: "",
    habitat: "",
    collector: "",
  });
  const [cabinetChoice, setCabinetChoice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedTip, setSavedTip] = useState(false);

  const prevId = useRef<string | null>(null);
  useEffect(() => {
    if (!specimen) return;
    if (prevId.current !== specimen.id) {
      setError(null);
      setSavedTip(false);
      prevId.current = specimen.id;
    }
    setFields({
      collectingNo: specimen.collectingNo,
      species: specimen.species,
      location: specimen.location,
      altitude: specimen.altitude,
      habitat: specimen.habitat,
      collector: specimen.collector,
    });
    if (specimen.position) {
      setCabinetChoice(specimen.position.split("-").slice(0, 2).join("-"));
    }
  }, [specimen]);

  useEffect(() => {
    if (!specimen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [specimen, onClose]);

  if (!specimen) return null;

  const stage = stageOf(specimen);
  const set = (key: keyof Fields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setError(null);
    setSavedTip(false);
  };

  const handleSave = () => {
    if (!fields.collectingNo.trim()) {
      setError("采集号不能为空");
      return;
    }
    if (!fields.location.trim()) {
      setError("采集地点不能为空");
      return;
    }
    const err = onSaveFields(specimen.id, {
      collectingNo: fields.collectingNo.trim(),
      species: fields.species.trim(),
      location: fields.location.trim(),
      altitude: fields.altitude.trim(),
      habitat: fields.habitat.trim(),
      collector: fields.collector.trim(),
    });
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSavedTip(true);
  };

  const cabinetOptions = cabinets.map((c) => {
    const used = occupancy[c.id]?.length ?? 0;
    return { cabinet: c, used, full: used >= c.capacity };
  });

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="标本详情"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p>单份标本详情 · {STAGE_LABEL[stage]}</p>
            <h2>{specimen.collectingNo}</h2>
          </div>
          <button className="ghost icon-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-state">
            <span className={specimen.pressed ? "state-on" : "state-off"}>
              {specimen.pressed ? "✓ 已压制" : "○ 未压制"}
            </span>
            <span className={specimen.identified ? "state-on" : "state-off"}>
              {specimen.identified ? "✓ 已鉴定" : "○ 未鉴定"}
            </span>
            <span className={specimen.position ? "state-on" : "state-off"}>
              {specimen.position ? `✓ 已上柜 ${specimen.position}` : "○ 未上柜"}
            </span>
          </div>

          <div className="field-grid">
            <label>
              <span>采集号</span>
              <input
                value={fields.collectingNo}
                onChange={(e) => set("collectingNo", e.target.value)}
              />
            </label>
            <label>
              <span>物种名称</span>
              <input
                value={fields.species}
                placeholder="鉴定后补填"
                onChange={(e) => set("species", e.target.value)}
              />
            </label>
            <label>
              <span>采集地点</span>
              <input
                value={fields.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </label>
            <label>
              <span>海拔</span>
              <input
                value={fields.altitude}
                placeholder="如 1050 m"
                onChange={(e) => set("altitude", e.target.value)}
              />
            </label>
            <label className="wide">
              <span>生境描述</span>
              <textarea
                rows={2}
                value={fields.habitat}
                onChange={(e) => set("habitat", e.target.value)}
              />
            </label>
            <label>
              <span>采集人</span>
              <input
                value={fields.collector}
                onChange={(e) => set("collector", e.target.value)}
              />
            </label>
          </div>

          {error && <p className="form-error">⚠ {error}</p>}
          {savedTip && !error && (
            <p className="form-ok">字段修改已同步到队列、地点卡和柜位。</p>
          )}

          <div className="detail-actions">
            {!specimen.pressed && (
              <button
                className="primary"
                onClick={() => {
                  onPress(specimen.id);
                  setError(null);
                }}
              >
                标记已压制
              </button>
            )}
            {specimen.pressed && !specimen.identified && (
              <button
                className="primary"
                disabled={!fields.species.trim()}
                title={
                  fields.species.trim()
                    ? "未压制标本不能鉴定；当前已压制，可鉴定"
                    : "请先填写物种名称（鉴定结果）"
                }
                onClick={() => {
                  // 鉴定前先落定编辑中的字段
                  if (!fields.collectingNo.trim() || !fields.location.trim()) {
                    setError("采集号与采集地点不能为空");
                    return;
                  }
                  const saveErr = onSaveFields(specimen.id, {
                    collectingNo: fields.collectingNo.trim(),
                    species: fields.species.trim(),
                    location: fields.location.trim(),
                    altitude: fields.altitude.trim(),
                    habitat: fields.habitat.trim(),
                    collector: fields.collector.trim(),
                  });
                  if (saveErr) {
                    setError(saveErr);
                    return;
                  }
                  const err = onIdentify(specimen.id);
                  if (err) setError(err);
                }}
              >
                完成鉴定
              </button>
            )}
            {!specimen.pressed && (
              <p className="action-hint">未压制标本不能鉴定。</p>
            )}
            {specimen.pressed && !specimen.identified && !fields.species.trim() && (
              <p className="action-hint">请先填写物种名称，再完成鉴定。</p>
            )}
          </div>

          <div className="cabinet-assign">
            <div className="cabinet-assign-head">
              <span>馆藏位置</span>
              {specimen.position ? (
                <em className="current-pos">当前藏位 {specimen.position}</em>
              ) : (
                <em className="action-hint">未鉴定标本不能上柜。</em>
              )}
            </div>
            <div className="cabinet-assign-row">
              <select
                value={cabinetChoice}
                disabled={!specimen.identified}
                onChange={(e) => {
                  setCabinetChoice(e.target.value);
                  setError(null);
                }}
              >
                <option value="" disabled>
                  选择柜位
                </option>
                {cabinetOptions.map(({ cabinet: c, used, full }) => (
                  <option key={c.id} value={c.id} disabled={full}>
                    {c.id} {c.name}（{used}/{c.capacity}
                    {full ? "·已满" : ""}）
                  </option>
                ))}
              </select>
              {specimen.identified && (
                <button
                  className="primary"
                  disabled={!cabinetChoice}
                  onClick={() => {
                    const targetCab = cabinetOptions.find(
                      (o) => o.cabinet.id === cabinetChoice
                    );
                    if (targetCab?.full) {
                      setError(
                        `柜位 ${targetCab.cabinet.id} 已满（占用 ${targetCab.used}/${targetCab.cabinet.capacity}），已拒绝分配`
                      );
                      return;
                    }
                    const err = specimen.position
                      ? onMove(specimen.id, cabinetChoice)
                      : onAssign(specimen.id, cabinetChoice);
                    if (err) setError(err);
                    else setError(null);
                  }}
                >
                  {specimen.position ? "调整柜位" : "分配上柜"}
                </button>
              )}
            </div>
            {specimen.identified &&
              cabinetChoice &&
              (() => {
                const opt = cabinetOptions.find(
                  (o) => o.cabinet.id === cabinetChoice
                );
                if (!opt) return null;
                if (opt.full) {
                  return (
                    <p className="form-error">
                      该柜已满（占用 {opt.used}/{opt.cabinet.capacity}），拒绝分配，请改选其他柜位。
                    </p>
                  );
                }
                // 预览下一个空藏位；本标本若已在目标柜中，其格位不计入占用
                const others = specimens.filter(
                  (x) =>
                    x.id !== specimen.id &&
                    x.position &&
                    cabinetOfPosition(x.position) === opt.cabinet.id
                );
                const preview = nextFreePosition(opt.cabinet, others);
                return (
                  <p className="action-hint">
                    柜内占用 {opt.used}/{opt.cabinet.capacity}，下一个空藏位{" "}
                    {preview ?? "（无空位）"}。
                  </p>
                );
              })()}
          </div>

          <div className="detail-history">
            <h4>流转记录</h4>
            <ol>
              {specimen.history.map((h, i) => (
                <li key={`${h.time}-${i}`}>
                  <time>{formatTime(h.time)}</time>
                  <span>{h.text}</span>
                </li>
              ))}
            </ol>
            <p className="muted">
              登记于 {formatTime(specimen.createdAt)} · 最近更新{" "}
              {formatTime(specimen.updatedAt)}
            </p>
          </div>
        </div>

        <div className="modal-foot">
          <button className="ghost" onClick={onClose}>
            关闭
          </button>
          <button className="primary" onClick={handleSave}>
            保存字段修改
          </button>
        </div>
      </div>
    </div>
  );
}
