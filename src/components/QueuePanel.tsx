import { useMemo } from "react";
import type { Specimen, Stage } from "../herbarium";
import { STAGES, cabinetLabel } from "../herbarium";
import StageBadge from "./StageBadge";

export type QueueFilter = Stage | "全部";

interface Props {
  specimens: Specimen[];
  filter: QueueFilter;
  onFilterChange: (f: QueueFilter) => void;
  onPress: (id: string) => void;
  onOpenDetail: (id: string) => void;
}

export default function QueuePanel({
  specimens,
  filter,
  onFilterChange,
  onPress,
  onOpenDetail,
}: Props) {
  const counts = useMemo(() => {
    const map = new Map<Stage, number>();
    STAGES.forEach((s) => map.set(s, 0));
    specimens.forEach((s) => map.set(s.stage, (map.get(s.stage) ?? 0) + 1));
    return map;
  }, [specimens]);

  const list = useMemo(
    () =>
      specimens
        .filter((s) => filter === "全部" || s.stage === filter)
        .sort((a, b) => a.createdAt - b.createdAt),
    [specimens, filter]
  );

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>按鉴定状态筛选</p>
          <h2>入库队列</h2>
        </div>
        <div className="chips">
          {(["全部", ...STAGES] as QueueFilter[]).map((f) => (
            <button
              key={f}
              className={filter === f ? "chip chip-active" : "chip"}
              onClick={() => onFilterChange(f)}
            >
              {f}
              <em>{f === "全部" ? specimens.length : counts.get(f as Stage) ?? 0}</em>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="empty">当前筛选下暂无标本。</p>
      ) : (
        <div className="queue">
          {list.map((s) => {
            const label = cabinetLabel(s);
            return (
              <article
                key={s.id}
                className="queue-row"
                onClick={() => onOpenDetail(s.id)}
              >
                <div className="q-main">
                  <div className="q-title">
                    <strong>{s.collectionNo}</strong>
                    <StageBadge stage={s.stage} />
                    {label && <span className="cabinet-tag">{label}</span>}
                  </div>
                  <p>
                    {s.species} · {s.location}
                    {s.elevation != null && ` · ${s.elevation}m`} · 采集人 {s.collector}
                  </p>
                </div>
                <div className="q-side">
                  {s.stage === "待压制" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPress(s.id);
                      }}
                    >
                      完成压制
                    </button>
                  )}
                  {s.stage === "待鉴定" && (
                    <button
                      className="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(s.id);
                      }}
                    >
                      鉴定入柜
                    </button>
                  )}
                  <button
                    className="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(s.id);
                    }}
                  >
                    详情
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
