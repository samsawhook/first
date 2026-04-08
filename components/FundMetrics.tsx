import { fund } from "@/lib/data";
import { TrendingUp, DollarSign, BarChart2, Activity } from "lucide-react";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const pct = (called: number, target: number) =>
  Math.round((called / target) * 100);

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-4 card-hover">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: accent ?? "#E2E8F0" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function FundMetrics() {
  const calledPct = pct(fund.calledCapital, fund.targetSize);

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{fund.name}</h2>
          <p className="text-sm text-slate-500">
            Vintage {fund.vintage} · As of {fund.asOf}
          </p>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
          Active
        </span>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Metric
          label="NAV"
          value={fmt(fund.nav)}
          sub={`as of ${fund.asOf}`}
          accent="#10B981"
        />
        <Metric
          label="TVPI"
          value={`${fund.tvpi.toFixed(2)}x`}
          sub="Total value / paid-in"
          accent="#E2E8F0"
        />
        <Metric
          label="IRR (net)"
          value={`${fund.irr.toFixed(1)}%`}
          sub="Since inception"
          accent="#E2E8F0"
        />
        <Metric
          label="DPI"
          value={`${fund.dpi.toFixed(2)}x`}
          sub="Distributions / paid-in"
        />
        <Metric
          label="RVPI"
          value={`${fund.rvpi.toFixed(2)}x`}
          sub="Residual value / paid-in"
        />
        <Metric
          label="Called"
          value={`${calledPct}%`}
          sub={`${fmt(fund.calledCapital)} of ${fmt(fund.targetSize)}`}
        />
      </div>

      {/* Capital call progress bar */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Capital Deployment
          </span>
          <span className="text-xs text-slate-400 tabular-nums">
            {fmt(fund.calledCapital)} called · {fmt(fund.targetSize - fund.calledCapital)} remaining
          </span>
        </div>
        <div className="h-2 bg-[#111D2E] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
            style={{ width: `${calledPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-slate-600">
            {fund.totalInvestments} companies · {fund.unrealized} active · {fund.realized} realized
          </span>
          <span className="text-xs text-slate-600">{calledPct}% deployed</span>
        </div>
      </div>
    </div>
  );
}
