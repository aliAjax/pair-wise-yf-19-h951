import { useState } from "react";

interface Props {
  onSubmit: (data: {
    collectingNo: string;
    species: string;
    location: string;
    altitude: string;
    habitat: string;
    collector: string;
  }) => string | null;
  /** 返回错误信息；null 表示登记成功 */
}

const EMPTY = {
  collectingNo: "",
  species: "",
  location: "",
  altitude: "",
  habitat: "",
  collector: "",
};

export function EntryForm({ onSubmit }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError(null);
  };

  const submit = () => {
    if (!form.collectingNo.trim()) {
      setError("采集号必填，纸单靠它串起压制、鉴定和上柜记录");
      return;
    }
    if (!form.location.trim()) {
      setError("采集地点必填");
      return;
    }
    const err = onSubmit({
      collectingNo: form.collectingNo.trim(),
      species: form.species.trim(),
      location: form.location.trim(),
      altitude: form.altitude.trim(),
      habitat: form.habitat.trim(),
      collector: form.collector.trim(),
    });
    if (err) {
      setError(err);
      return;
    }
    setForm(EMPTY);
    setError(null);
  };

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>新到纸单</p>
          <h2>标本登记</h2>
        </div>
        <button className="primary" onClick={submit}>
          登记入队
        </button>
      </div>
      <div className="field-grid">
        <label className={!form.collectingNo ? "required" : ""}>
          <span>采集号 *</span>
          <input
            value={form.collectingNo}
            placeholder="如 HX-240627-01"
            onChange={(e) => set("collectingNo", e.target.value)}
          />
        </label>
        <label>
          <span>物种名称</span>
          <input
            value={form.species}
            placeholder="可留空，鉴定后补填"
            onChange={(e) => set("species", e.target.value)}
          />
        </label>
        <label className={!form.location ? "required" : ""}>
          <span>采集地点 *</span>
          <input
            value={form.location}
            placeholder="如 天目山·老殿后山"
            onChange={(e) => set("location", e.target.value)}
          />
        </label>
        <label>
          <span>海拔</span>
          <input
            value={form.altitude}
            placeholder="如 1050 m"
            onChange={(e) => set("altitude", e.target.value)}
          />
        </label>
        <label>
          <span>生境描述</span>
          <input
            value={form.habitat}
            placeholder="如 针阔混交林缘，腐殖层厚"
            onChange={(e) => set("habitat", e.target.value)}
          />
        </label>
        <label>
          <span>采集人</span>
          <input
            value={form.collector}
            placeholder="采集人姓名"
            onChange={(e) => set("collector", e.target.value)}
          />
        </label>
      </div>
      {error && <p className="form-error">⚠ {error}</p>}
      <p className="form-hint">
        新登记标本一律进入「待压制」队列；采集号重复时不会覆盖原记录。
      </p>
    </section>
  );
}
