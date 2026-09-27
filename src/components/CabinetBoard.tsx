import type { Cabinet, Specimen } from "../types";
import { cabinetOfPosition } from "../store";

interface Props {
  cabinets: Cabinet[];
  specimens: Specimen[];
  onOpen: (s: Specimen) => void;
}

export function CabinetBoard({ cabinets, specimens, onOpen }: Props) {
  const byPosition = new Map<string, Specimen>();
  for (const s of specimens) {
    if (s.position) byPosition.set(s.position, s);
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>馆藏柜位记录</p>
          <h2>柜位占用</h2>
        </div>
      </div>
      <div className="cabinet-list">
        {cabinets.map((c) => {
          const slots = Array.from({ length: c.capacity }, (_, i) => i + 1);
          const usedCount = specimens.filter(
            (s) => s.position && cabinetOfPosition(s.position) === c.id
          ).length;
          const full = usedCount >= c.capacity;
          return (
            <article key={c.id} className={full ? "cabinet full" : "cabinet"}>
              <div className="cabinet-head">
                <div>
                  <h3>
                    柜 {c.id}
                    {full && <em className="full-flag">已满</em>}
                  </h3>
                  <p>{c.name}</p>
                </div>
                <strong className={full ? "count-full" : ""}>
                  {usedCount}/{c.capacity}
                </strong>
              </div>
              <div className="cabinet-grid">
                {slots.map((i) => {
                  const pos = `${c.id}-${String(i).padStart(2, "0")}`;
                  const occupant = byPosition.get(pos);
                  return occupant ? (
                    <button
                      key={pos}
                      className="slot occupied"
                      title={`${pos} · ${occupant.collectingNo} ${occupant.species}（点击查看详情）`}
                      onClick={() => onOpen(occupant)}
                    >
                      {String(i).padStart(2, "0")}
                    </button>
                  ) : (
                    <span key={pos} className="slot empty" title={`${pos} 空闲`}>
                      {String(i).padStart(2, "0")}
                    </span>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
