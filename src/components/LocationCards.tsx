import { useMemo } from "react";
import type { Cabinet, Specimen } from "../types";
import { cabinetOfPosition, stageOf } from "../store";

interface Props {
  specimens: Specimen[];
  cabinets: Cabinet[];
  onOpen: (s: Specimen) => void;
}

const STAGE_NAME = {
  unpressed: "待压制",
  pending: "待鉴定",
  stored: "已入库",
} as const;

export function LocationCards({ specimens, cabinets, onOpen }: Props) {
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { specimens: Specimen[]; cabinets: Map<string, number> }
    >();
    for (const s of specimens) {
      const loc = s.location.trim() || "未填地点";
      const g =
        map.get(loc) ?? {
          specimens: [] as Specimen[],
          cabinets: new Map<string, number>(),
        };
      g.specimens.push(s);
      if (s.position) {
        const cab = cabinetOfPosition(s.position);
        g.cabinets.set(cab, (g.cabinets.get(cab) ?? 0) + 1);
      }
      map.set(loc, g);
    }
    return [...map.entries()]
      .map(([loc, g]) => ({
        loc,
        specimens: g.specimens,
        cabinets: g.cabinets,
      }))
      .sort((a, b) => a.loc.localeCompare(b.loc, "zh-Hans-CN"));
  }, [specimens]);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>按采集地点汇总</p>
          <h2>采集地点信息卡</h2>
        </div>
      </div>
      {groups.length === 0 && <p className="empty-hint">暂无地点数据。</p>}
      <div className="location-grid">
        {groups.map((g) => {
          const altitudes = g.specimens
            .map((s) => s.altitude)
            .filter(Boolean)
            .sort();
          const counts = { unpressed: 0, pending: 0, stored: 0 };
          for (const s of g.specimens) counts[stageOf(s)] += 1;
          return (
            <article key={g.loc} className="location-card">
              <header>
                <h3>{g.loc}</h3>
                <p>
                  共 <b>{g.specimens.length}</b> 份
                  {altitudes.length > 0 && (
                    <>
                      {" "}
                      · 海拔 {altitudes[0]}
                      {altitudes[altitudes.length - 1] !== altitudes[0] &&
                        ` ~ ${altitudes[altitudes.length - 1]}`}
                    </>
                  )}
                </p>
                <div className="loc-counts">
                  <span className="dot-unpressed">待压制 {counts.unpressed}</span>
                  <span className="dot-pending">待鉴定 {counts.pending}</span>
                  <span className="dot-stored">已入库 {counts.stored}</span>
                </div>
              </header>
              {g.cabinets.size > 0 && (
                <div className="loc-cabinets">
                  <span>占用柜位：</span>
                  {[...g.cabinets.entries()]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([cab, n]) => {
                      const meta = cabinets.find((c) => c.id === cab);
                      return (
                        <em key={cab} className="cab-chip" title={meta?.name}>
                          {cab} × {n}
                        </em>
                      );
                    })}
                </div>
              )}
              <ul className="loc-specimens">
                {g.specimens.map((s) => (
                  <li key={s.id}>
                    <button
                      className="loc-specimen"
                      onClick={() => onOpen(s)}
                      title="打开标本详情"
                    >
                      <span className={`mini-stage stage-${stageOf(s)}`}>
                        {STAGE_NAME[stageOf(s)]}
                      </span>
                      <span className="loc-body">
                        <span className="loc-no">{s.collectingNo}</span>
                        <span className="loc-species">
                          {s.species || "物种待鉴定"}
                          {s.habitat ? ` · ${s.habitat}` : ""}
                        </span>
                      </span>
                      {s.position && (
                        <span className="loc-pos">{s.position}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
