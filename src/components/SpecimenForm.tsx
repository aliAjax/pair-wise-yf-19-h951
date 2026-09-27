import { useState } from "react";
import type { FormEvent } from "react";
import type { NewSpecimenInput, Specimen } from "../herbarium";

export type AddResult = { ok: true } | { ok: false; existing: Specimen };

interface Props {
  onAdd: (input: NewSpecimenInput) => AddResult;
  onOpenDetail: (id: string) => void;
}

const EMPTY: Record<keyof NewSpecimenInput, string> = {
  collectionNo: "",
  species: "",
  location: "",
  elevation: "",
  habitat: "",
  collector: "",
};

export default function SpecimenForm({ onAdd, onOpenDetail }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Specimen | null>(null);

  const set = (key: keyof NewSpecimenInput) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "collectionNo") setDuplicate(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDuplicate(null);

    const input: NewSpecimenInput = {
      collectionNo: form.collectionNo.trim(),
      species: form.species.trim(),
      location: form.location.trim(),
      elevation:
        form.elevation.trim() === "" || Number.isNaN(Number(form.elevation))
          ? null
          : Math.round(Number(form.elevation)),
      habitat: form.habitat.trim(),
      collector: form.collector.trim(),
    };

    if (!input.collectionNo || !input.species || !input.location || !input.collector) {
      setError("请填写采集号、物种名称、采集地点和采集人。");
      return;
    }

    const result = onAdd(input);
    if (result.ok) {
      setForm(EMPTY);
    } else {
      // 重复采集号：保留原记录，仅提示，不覆盖
      setDuplicate(result.existing);
    }
  };

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>新采标本登记</p>
          <h2>录入标本</h2>
        </div>
        <span className="hint-tag">登记后进入「待压制」</span>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            <span>采集号 *</span>
            <input
              value={form.collectionNo}
              onChange={(e) => set("collectionNo")(e.target.value)}
              placeholder="如 HX-240620-01"
            />
          </label>
          <label>
            <span>物种名称 *</span>
            <input
              value={form.species}
              onChange={(e) => set("species")(e.target.value)}
              placeholder="中文名 / 学名，待定可注明"
            />
          </label>
          <label>
            <span>采集地点 *</span>
            <input
              value={form.location}
              onChange={(e) => set("location")(e.target.value)}
              placeholder="如 云雾山北坡"
            />
          </label>
          <label>
            <span>海拔（米）</span>
            <input
              type="number"
              min="0"
              value={form.elevation}
              onChange={(e) => set("elevation")(e.target.value)}
              placeholder="如 1420"
            />
          </label>
          <label>
            <span>采集人 *</span>
            <input
              value={form.collector}
              onChange={(e) => set("collector")(e.target.value)}
              placeholder="采集人姓名"
            />
          </label>
          <label>
            <span>生境描述</span>
            <input
              value={form.habitat}
              onChange={(e) => set("habitat")(e.target.value)}
              placeholder="植被、坡向、基质等"
            />
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}
        {duplicate && (
          <div className="form-dup">
            <span>
              采集号 <b>{duplicate.collectionNo}</b> 已存在（{duplicate.species} ·{" "}
              {duplicate.location}），已保留原记录，未重复登记。
            </span>
            <button type="button" onClick={() => onOpenDetail(duplicate.id)}>
              查看原记录
            </button>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="primary">
            登记入库队列
          </button>
        </div>
      </form>
    </section>
  );
}
