import { useMemo } from "react";
import type { Specimen } from "../herbarium";
import { cabinetLabel } from "../herbarium";
import StageBadge from "./StageBadge";

interface Props {
  specimens: Specimen[];
  onOpenDetail: (id: string) => void;
}

interface LocationGroup {
  location: string;
  list: Specimen[];
  elevationRange: string | null;
  cabinets: string[];
}

export default function LocationCards({ specimens, onOpenDetail }: Props) {
  const groups = useMemo<LocationGroup[]>(() => {
    const map = new Map<string, Specimen[]>();
    specimens.forEach((s) => {
      const key = s.location.trim() || "未填写地点";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return [...map.entries()]
      .map(([location, list]) => {
        const elevations = list
          .map((s) => s.elevation)
          .filter((e): e is number => e != null);
        const elevationRange =
          elevations.length === 0
            ? null
            : `${Math.min(...elevations)}–${Math.max(...elevations)}m`;
        const cabinets = [
          ...new Set(
            list.map((s) => cabinetLabel(s)).filter((l): l is string => l != null)
          ),
        ];
        return { location, list, elevationRange, cabinets };
      })
      .sort((a, b) => b.list.length - a.list.length);
  }, [specimens]);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>按采集地点汇总</p>
          <h2>采集地点卡</h2>
        </div>
        <span className="hint-tag">{groups.length} 个采集点</span>
      </div>
      {groups.length === 0 ? (
        <p className="empty">暂无采集记录。</p>
      ) : (
        <div className="loc-grid">
          {groups.map((g) => (
            <article key={g.location} className="loc-card">
              <header>
                <h3>{g.location}</h3>
                <span className="loc-count">{g.list.length} 份</span>
              </header>
              <p className="loc-meta">
                {g.elevationRange ? `海拔 ${g.elevationRange}` : "海拔未记录"}
                {" · "}
                {g.cabinets.length > 0 ? `柜位 ${g.cabinets.join("、")}` : "尚未入柜"}
              </p>
              <ul>
                {g.list.map((s) => {
                  const label = cabinetLabel(s);
                  return (
                    <li key={s.id}>
                      <button className="link" onClick={() => onOpenDetail(s.id)}>
                        {s.collectionNo}
                      </button>
                      <span className="loc-species" title={s.species}>
                        {s.species}
                      </span>
                      <StageBadge stage={s.stage} />
                      {label && <span className="cabinet-tag">{label}</span>}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
