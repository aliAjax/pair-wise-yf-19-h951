import type { Specimen } from "../herbarium";
import { CABINETS, occupantsOf } from "../herbarium";

interface Props {
  specimens: Specimen[];
  onOpenDetail: (id: string) => void;
}

export default function CabinetPanel({ specimens, onOpenDetail }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>馆藏柜位记录</p>
          <h2>柜位占用</h2>
        </div>
      </div>
      <div className="cab-list">
        {CABINETS.map((cab) => {
          const occupants = occupantsOf(specimens, cab.id);
          const used = occupants.length;
          const full = used >= cab.capacity;
          return (
            <div key={cab.id} className={full ? "cab cab-full" : "cab"}>
              <div className="cab-head">
                <strong>{cab.name}</strong>
                <span>
                  {used}/{cab.capacity}
                  {full && <em className="cab-full-tag">已满</em>}
                </span>
              </div>
              <div className="cab-bar">
                <i style={{ width: `${Math.min(100, (used / cab.capacity) * 100)}%` }} />
              </div>
              <div className="cab-occupants">
                {occupants.length === 0 ? (
                  <span className="cab-empty">空闲</span>
                ) : (
                  occupants.map((s) => (
                    <button
                      key={s.id}
                      className="link"
                      title={`${s.species} · 格位 ${s.slot}`}
                      onClick={() => onOpenDetail(s.id)}
                    >
                      {s.collectionNo}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
