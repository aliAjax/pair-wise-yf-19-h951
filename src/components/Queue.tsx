import type {
  Cabinet,
  IdFilter,
  QueueFilter,
  Specimen,
} from "../types";
import { STAGE_LABEL, stageOf } from "../store";

interface Props {
  specimens: Specimen[];
  cabinets: Cabinet[];
  queueFilter: QueueFilter;
  idFilter: IdFilter;
  counts: Record<QueueFilter, number>;
  idCounts: Record<IdFilter, number>;
  occupancy: Record<string, string[]>;
  onQueueFilter: (f: QueueFilter) => void;
  onIdFilter: (f: IdFilter) => void;
  onOpen: (s: Specimen) => void;
  onPress: (s: Specimen) => void;
  onIdentify: (s: Specimen) => void;
  onAssign: (s: Specimen, cabinetId: string) => void;
  draftCabinet: Record<string, string>;
  setDraftCabinet: (specimenId: string, cabinetId: string) => void;
}

function StatusBadge({ s }: { s: Specimen }) {
  if (s.position) return <em className="badge badge-stored">已入库</em>;
  if (s.identified) return <em className="badge badge-identified">已鉴定·待上柜</em>;
  if (s.pressed) return <em className="badge badge-pending">待鉴定</em>;
  return <em className="badge badge-unpressed">待压制</em>;
}

export function Queue(props: Props) {
  const {
    specimens,
    cabinets,
    queueFilter,
    idFilter,
    counts,
    idCounts,
    occupancy,
    onQueueFilter,
    onIdFilter,
    onOpen,
    onPress,
    onIdentify,
    onAssign,
    draftCabinet,
    setDraftCabinet,
  } = props;

  const queueChips: { key: QueueFilter; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "unpressed", label: STAGE_LABEL.unpressed },
    { key: "pending", label: STAGE_LABEL.pending },
    { key: "stored", label: STAGE_LABEL.stored },
  ];
  const idChips: { key: IdFilter; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "unpressed", label: "未压制" },
    { key: "unidentified", label: "未鉴定" },
    { key: "identified", label: "已鉴定" },
  ];

  return (
    <section className="panel queue-panel">
      <div className="heading">
        <div>
          <p>流转队列</p>
          <h2>入库工作台</h2>
        </div>
      </div>

      <div className="filter-groups">
        <div className="filter-group">
          <span className="filter-label">队列</span>
          <div className="chips">
            {queueChips.map((c) => (
              <button
                key={c.key}
                className={queueFilter === c.key ? "chip active" : "chip"}
                onClick={() => onQueueFilter(c.key)}
              >
                {c.label}
                <b>{counts[c.key]}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">鉴定状态</span>
          <div className="chips">
            {idChips.map((c) => (
              <button
                key={c.key}
                className={idFilter === c.key ? "chip active" : "chip"}
                onClick={() => onIdFilter(c.key)}
              >
                {c.label}
                <b>{idCounts[c.key]}</b>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="queue-list">
        {specimens.length === 0 && (
          <p className="empty-hint">当前筛选下没有标本。</p>
        )}
        {specimens.map((s) => {
          const stage = stageOf(s);
          return (
            <article
              key={s.id}
              className={`queue-row stage-${stage}`}
              onClick={() => onOpen(s)}
            >
              <div className="queue-main">
                <div className="queue-title">
                  <h3>{s.collectingNo}</h3>
                  <StatusBadge s={s} />
                </div>
                <p className="queue-meta">
                  <b>{s.species || "物种待鉴定"}</b>
                  <span>· {s.location}</span>
                  {s.altitude && <span>· {s.altitude}</span>}
                  <span>· 采集人 {s.collector || "未填"}</span>
                  {s.position && (
                    <span className="queue-position">· 藏位 {s.position}</span>
                  )}
                </p>
              </div>
              <div
                className="queue-actions"
                onClick={(e) => e.stopPropagation()}
              >
                {!s.pressed && (
                  <button
                    className="primary small"
                    onClick={() => onPress(s)}
                    title="压制完成后才能进入鉴定环节"
                  >
                    标记已压制
                  </button>
                )}
                {s.pressed && !s.identified && (
                  <button
                    className="primary small"
                    disabled={!s.species.trim()}
                    title={
                      s.species.trim()
                        ? "确认鉴定结果"
                        : "请先在详情中填写物种名称再鉴定；未压制标本不能鉴定"
                    }
                    onClick={() => onIdentify(s)}
                  >
                    完成鉴定
                  </button>
                )}
                {s.pressed && s.identified && !s.position && (
                  <div className="assign-inline">
                    <select
                      value={draftCabinet[s.id] ?? ""}
                      onChange={(e) => setDraftCabinet(s.id, e.target.value)}
                      title="选择馆藏柜位，自动分配空藏位"
                    >
                      <option value="" disabled>
                        选择柜位
                      </option>
                      {cabinets.map((c) => {
                        const used = occupancy[c.id]?.length ?? 0;
                        const full = used >= c.capacity;
                        return (
                          <option key={c.id} value={c.id} disabled={full}>
                            {c.id} {c.name}（{used}/{c.capacity}
                            {full ? "·已满" : ""}）
                          </option>
                        );
                      })}
                    </select>
                    <button
                      className="primary small"
                      disabled={!draftCabinet[s.id]}
                      title="柜位满时会拒绝分配"
                      onClick={() =>
                        draftCabinet[s.id] &&
                        onAssign(s, draftCabinet[s.id] as string)
                      }
                    >
                      分配上柜
                    </button>
                  </div>
                )}
                {s.position && <span className="stored-tag">已在柜</span>}
                <button className="small ghost" onClick={() => onOpen(s)}>
                  详情
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
