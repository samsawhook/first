"use client";
import { useState, useMemo } from "react";
import type { PortfolioCompany } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtM = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1_000_000).toFixed(2)}M`
    : `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1_000).toFixed(0)}K`;

const fmtMx = (n: number) => `${n.toFixed(2)}x`;

// ── Stage spectrum ────────────────────────────────────────────────────────────

const STAGES = [
  { label: "Pre-Seed", max: 3_000_000,    color: "#64748B" },
  { label: "Seed",     max: 10_000_000,   color: "#8B5CF6" },
  { label: "Series A", max: 30_000_000,   color: "#3B82F6" },
  { label: "Series B", max: 80_000_000,   color: "#10B981" },
  { label: "Series C", max: 200_000_000,  color: "#F59E0B" },
  { label: "Mezz",     max: 600_000_000,  color: "#F97316" },
  { label: "IPO",      max: Infinity,     color: "#EC4899" },
];

function stageForValuation(v: number): { label: string; color: string; idx: number } {
  const idx = STAGES.findIndex((s) => v <= s.max);
  const clamped = idx < 0 ? STAGES.length - 1 : idx;
  return { ...STAGES[clamped], idx: clamped };
}

// ── Chart constants ───────────────────────────────────────────────────────────

const SVG_W = 620;
const SVG_H = 240;
const LEFT  = 110;  // label column width
const RIGHT = 20;
const CHART_W = SVG_W - LEFT - RIGHT;
const BAR_H = 16;
const BAR_GAP = 10;
const TOP_PAD = 16;
const STAGE_H = 28;

// ── Component ─────────────────────────────────────────────────────────────────

export default function FootballField({
  company,
  controlled,
}: {
  company: PortfolioCompany;
  controlled?: { value: number; onChange: (v: number) => void };
}) {
  const baseRefs = company.valuationRefs ?? [];
  const refs = company.customPricePerShare && company.totalShares
    ? [
        {
          label: "Fund Est.",
          low:  company.customPricePerShare * company.totalShares,
          high: company.customPricePerShare * company.totalShares,
          color: "#10B981",
          note: `$${company.customPricePerShare.toFixed(4)}/sh`,
          isEnterpriseValue: false as const,
        },
        ...baseRefs,
      ]
    : baseRefs;
  const totalShares = company.totalShares ?? 0;
  const invested = company.invested;
  const revenue = company.revenue ?? 0;
  const ebitda = company.ebitda;
  const employees = company.employees;
  const bs = company.balanceSheet;

  // EV → equity bridge: net debt + preferred liquidation preference
  const evBridge = bs
    ? Math.max((bs.totalLiabilities - bs.cash) + (bs.preferredLiquidation ?? 0), 0)
    : 0;

  // For EV refs, shift bar position to equity value space (EV - bridge)
  const equityLow  = (r: typeof refs[0]) => r.isEnterpriseValue ? Math.max(r.low  - evBridge, 0) : r.low;
  const equityHigh = (r: typeof refs[0]) => r.isEnterpriseValue ? Math.max(r.high - evBridge, 0) : r.high;

  // Axis bounds: 0 → 130% of the widest equity-adjusted range, min $500K
  const allVals = refs.flatMap((r) => [equityLow(r), equityHigh(r)]).concat([company.impliedValuation]);
  const axisMax = Math.max(...allVals) * 1.3;
  const axisMin = 0;

  // Slider: controlled externally (modal) or internal state (CompanyPage)
  const [localVal, setLocalVal] = useState(company.impliedValuation);
  const sliderVal = controlled ? controlled.value : localVal;
  const setSliderVal = controlled ? controlled.onChange : setLocalVal;

  // Derived per-share price
  const pricePerShare = totalShares > 0 ? sliderVal / totalShares : 0;

  // Imputed metrics
  const equityValue = sliderVal;
  // EV = equity + net debt + preferred liquidation (from balance sheet if available)
  const ev = equityValue + evBridge;
  const revMultiple = revenue > 0 ? ev / revenue : null;
  const ebitdaMultiple = ebitda && ebitda > 0 ? equityValue / ebitda : null;
  const valuePerEmployee = employees > 0 ? equityValue / employees : null;
  const moic = invested > 0 ? equityValue / invested : null;
  const currentStage = stageForValuation(sliderVal);

  // SVG x-coordinate helpers
  const toX = (v: number) =>
    LEFT + ((v - axisMin) / (axisMax - axisMin)) * CHART_W;

  // Tick marks on axis
  const ticks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count + 1 }, (_, i) => axisMin + (i / count) * axisMax);
  }, [axisMax]);

  // Bar rows
  const rowCount = refs.length;
  const chartContentH = rowCount * (BAR_H + BAR_GAP) + 12;
  const totalSvgH = TOP_PAD + chartContentH + STAGE_H + 30;

  return (
    <div className="space-y-5">
      {/* SVG chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${totalSvgH}`}
          className="w-full"
          style={{ minWidth: 380, maxHeight: 340 }}
          aria-label={`${company.name} football field valuation`}
        >
          {/* ── Grid lines ── */}
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={toX(t)} y1={TOP_PAD}
              x2={toX(t)} y2={TOP_PAD + chartContentH}
              stroke="#1E2D3D" strokeWidth={1}
            />
          ))}

          {/* ── Valuation ref bars ── */}
          {refs.map((ref, i) => {
            const y = TOP_PAD + i * (BAR_H + BAR_GAP);
            const eLow  = equityLow(ref);
            const eHigh = equityHigh(ref);
            const x1 = toX(eLow);
            const x2 = toX(eHigh);
            const isPoint = eLow === eHigh;
            const barColor = ref.color ?? company.accentColor;

            return (
              <g key={ref.label}>
                {/* Row label */}
                <text
                  x={LEFT - 8} y={y + BAR_H / 2 + 4}
                  textAnchor="end" fontSize="9.5"
                  fill="#94A3B8"
                  fontFamily="Poppins, sans-serif"
                >
                  {ref.label}
                </text>

                {/* Bar background lane */}
                <rect
                  x={LEFT} y={y}
                  width={CHART_W} height={BAR_H}
                  fill="#111D2E" rx={3}
                />

                {isPoint ? (
                  /* Diamond for point transactions */
                  <g>
                    <rect
                      x={x1 - 1} y={y}
                      width={2} height={BAR_H}
                      fill={barColor} opacity={0.9}
                    />
                    <polygon
                      points={`${x1},${y - 5} ${x1 + 5},${y + BAR_H / 2} ${x1},${y + BAR_H + 5} ${x1 - 5},${y + BAR_H / 2}`}
                      fill={barColor} opacity={0.95}
                    />
                  </g>
                ) : (
                  /* Range bar */
                  <rect
                    x={x1} y={y}
                    width={Math.max(x2 - x1, 2)} height={BAR_H}
                    fill={barColor} opacity={0.75} rx={3}
                  />
                )}

                {/* Note tooltip-ish label on right */}
                {(ref.note || ref.isEnterpriseValue) && (
                  <text
                    x={SVG_W - RIGHT - 2} y={y + BAR_H / 2 + 4}
                    textAnchor="end" fontSize="8"
                    fill="#475569"
                    fontFamily="Poppins, sans-serif"
                  >
                    {ref.isEnterpriseValue
                      ? `EV ${fmtM(ref.low)} → eq. ${fmtM(eLow)}`
                      : ref.note}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Slider vertical line ── */}
          <line
            x1={toX(sliderVal)} y1={TOP_PAD - 4}
            x2={toX(sliderVal)} y2={TOP_PAD + chartContentH - 4}
            stroke="#10B981" strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          {/* Slider pin label */}
          <rect
            x={toX(sliderVal) - 26} y={TOP_PAD - 16}
            width={52} height={14}
            fill="#10B98130" rx={3}
          />
          <text
            x={toX(sliderVal)} y={TOP_PAD - 5}
            textAnchor="middle" fontSize="8.5" fontWeight="600"
            fill="#10B981"
            fontFamily="Poppins, sans-serif"
          >
            {fmtM(sliderVal)}
          </text>

          {/* ── Axis ticks ── */}
          {ticks.map((t, i) => (
            <text
              key={i}
              x={toX(t)} y={TOP_PAD + chartContentH + 12}
              textAnchor="middle" fontSize="8"
              fill="#475569"
              fontFamily="Poppins, sans-serif"
            >
              {fmtM(t)}
            </text>
          ))}

          {/* ── Stage spectrum ── */}
          {(() => {
            const sy = TOP_PAD + chartContentH + 22;
            // Render stage bands proportionally in log space for readability
            // We use a simpler approach: distribute within axisMax linearly
            let prev = axisMin;
            return STAGES.map((stage, si) => {
              const bandMax = Math.min(stage.max, axisMax);
              const bx = toX(prev);
              const bw = Math.max(toX(bandMax) - bx, 0);
              prev = bandMax;
              if (bw < 1) return null;
              const isCurrent = si === currentStage.idx;
              return (
                <g key={stage.label}>
                  <rect
                    x={bx} y={sy}
                    width={bw} height={STAGE_H - 4}
                    fill={stage.color}
                    opacity={isCurrent ? 0.45 : 0.12}
                    rx={2}
                  />
                  {bw > 30 && (
                    <text
                      x={bx + bw / 2} y={sy + (STAGE_H - 4) / 2 + 4}
                      textAnchor="middle" fontSize="8" fontWeight={isCurrent ? "700" : "400"}
                      fill={isCurrent ? stage.color : "#475569"}
                      fontFamily="Poppins, sans-serif"
                    >
                      {stage.label}
                    </text>
                  )}
                </g>
              );
            });
          })()}
        </svg>
      </div>

      {/* ── Slider ── */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Equity Valuation</span>
          <span className="text-xs font-semibold text-emerald-400 tabular-nums">{fmtM(sliderVal)}</span>
        </div>
        <input
          type="range"
          min={axisMin}
          max={axisMax}
          step={Math.round(axisMax / 500)}
          value={sliderVal}
          onChange={(e) => setSliderVal(Number(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer"
          style={{ height: 4 }}
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>{fmtM(axisMin)}</span>
          <span>{fmtM(axisMax)}</span>
        </div>
      </div>

      {/* ── Imputed metrics grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {totalShares > 0 && (
          <MetricCell label="Price / Share" value={`$${pricePerShare.toFixed(4)}`} color="#94A3B8" />
        )}
        <MetricCell label="Equity Value" value={fmtM(equityValue)} color={company.accentColor} highlight />
        <MetricCell label="Enterprise Value" value={fmtM(ev)} color="#94A3B8" />
        {moic !== null && (
          <MetricCell
            label="MOIC"
            value={fmtMx(moic)}
            color={moic >= 2 ? "#10B981" : moic >= 1 ? "#F59E0B" : "#EF4444"}
            highlight
          />
        )}
        {revMultiple !== null && (
          <MetricCell label="EV / Revenue" value={`${revMultiple.toFixed(1)}×`} color="#8B5CF6" />
        )}
        {ebitdaMultiple !== null && (
          <MetricCell label="EBITDA Multiple" value={`${ebitdaMultiple.toFixed(1)}×`} color="#F59E0B" />
        )}
        {ebitda && ebitda > 0 && (
          <MetricCell
            label="Implied Growth (PEG=1)"
            value={`${(equityValue / ebitda).toFixed(0)}%`}
            color={
              company.revenueGrowth != null && (equityValue / ebitda) <= company.revenueGrowth
                ? "#10B981"
                : "#F59E0B"
            }
          />
        )}
        {valuePerEmployee !== null && (
          <MetricCell label="Value / Employee" value={fmtM(valuePerEmployee)} color="#94A3B8" />
        )}
        <div className="col-span-1 sm:col-span-1 bg-[#111D2E] rounded-lg p-3 flex flex-col gap-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Stage</p>
          <p
            className="text-sm font-semibold"
            style={{ color: currentStage.color }}
          >
            {currentStage.label}
          </p>
          {/* mini progress bar */}
          <div className="flex gap-0.5 mt-1">
            {STAGES.map((s, i) => (
              <div
                key={s.label}
                className="h-1 flex-1 rounded-full"
                style={{
                  background: i <= currentStage.idx ? s.color : "#1E2D3D",
                  opacity: i === currentStage.idx ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small metric cell ─────────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-[#111D2E] rounded-lg p-3 ${highlight ? "ring-1 ring-inset" : ""}`}
      style={highlight ? { outlineColor: `${color}30` } : undefined}
    >
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-sm font-semibold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
