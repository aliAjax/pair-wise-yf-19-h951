import type { Stage } from "../herbarium";

const CLASS_BY_STAGE: Record<Stage, string> = {
  待压制: "badge badge-press",
  待鉴定: "badge badge-identify",
  已入库: "badge badge-shelved",
};

export default function StageBadge({ stage }: { stage: Stage }) {
  return <span className={CLASS_BY_STAGE[stage]}>{stage}</span>;
}
