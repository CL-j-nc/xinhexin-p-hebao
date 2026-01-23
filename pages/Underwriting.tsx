import React, { useEffect, useState } from "react";

const API_BASE = "https://xinhexin-api.chinalife-shiexinhexin.workers.dev";

interface CoveragePremium {
  type: string;
  premium: number;
}

const Underwriting: React.FC = () => {
  const [applicationNo, setApplicationNo] = useState("");
  const [coverages, setCoverages] = useState<CoveragePremium[]>([]);
  const [totalPremium, setTotalPremium] = useState<number>(0);
  const [vat, setVat] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [applications, setApplications] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API_BASE}/api/application/search?keyword=`)
      .then(res => res.json())
      .then(setApplications);
  }, []);

  const updatePremium = (type: string, premium: number) => {
    setCoverages(prev => {
      const next = [...prev];
      const idx = next.findIndex(c => c.type === type);
      if (idx >= 0) {
        next[idx].premium = premium;
      } else {
        next.push({ type, premium });
      }
      return next;
    });
  };

  const handleStartUnderwriting = async () => {
    setLoading(true);
    await fetch(`${API_BASE}/api/underwriting/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationNo })
    });
    setStatusMsg("已进入核保中状态");
    setLoading(false);
  };

  const handleApprove = async () => {
    setLoading(true);

    const premiumSummary = {
      totalPremium,
      vat,
      premiumExclTax: Number((totalPremium - vat).toFixed(2))
    };

    const res = await fetch(`${API_BASE}/api/underwriting/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationNo,
        coverages,
        premiumSummary
      })
    });

    const data = await res.json();
    setStatusMsg(`核保通过，支付码：${data.paymentCode}`);
    setLoading(false);
  };

  const handleIssue = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/policy/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationNo })
    });
    const data = await res.json();
    setStatusMsg(`成功承保，保单号：${data.policyNo}`);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">核保处理（补齐信息素）</h1>

      <select
        value={applicationNo}
        onChange={e => setApplicationNo(e.target.value)}
        className="border px-3 py-2 rounded w-full"
      >
        <option value="">选择投保申请</option>
        {applications.map(app => (
          <option key={app.applicationNo} value={app.applicationNo}>
            {app.applicationNo} ｜ {app.status}
          </option>
        ))}
      </select>

      <div className="space-y-3">
        <h2 className="font-semibold text-sm">各险种保费填写</h2>
        {["third_party", "damage", "driver", "passenger"].map(type => (
          <div key={type} className="flex gap-2 items-center">
            <span className="w-32 text-sm">{type}</span>
            <input
              type="number"
              placeholder="保费"
              className="border px-2 py-1 rounded flex-1"
              onChange={e => updatePremium(type, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <input
          type="number"
          placeholder="保费合计"
          className="border px-3 py-2 rounded w-full"
          value={totalPremium}
          onChange={e => setTotalPremium(Number(e.target.value))}
        />
        <input
          type="number"
          placeholder="增值税"
          className="border px-3 py-2 rounded w-full"
          value={vat}
          onChange={e => setVat(Number(e.target.value))}
        />
      </div>

      <div className="space-y-3">
        <button
          onClick={handleStartUnderwriting}
          disabled={loading}
          className="btn-primary w-full"
        >
          开始核保
        </button>

        <button
          onClick={handleApprove}
          disabled={loading}
          className="btn-primary w-full"
        >
          核保通过 / 出码
        </button>

        <button
          onClick={handleIssue}
          disabled={loading}
          className="btn-primary w-full"
        >
          确认收付 / 出单
        </button>
      </div>

      {statusMsg && (
        <div className="text-sm text-emerald-700 font-medium">
          {statusMsg}
        </div>
      )}
    </div>
  );
};

export default Underwriting;