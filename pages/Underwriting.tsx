import React, { useEffect, useState } from "react";

const API_BASE = "https://xinhexin-api.chinalife-shiexinhexin.workers.dev";

interface CoveragePremium {
  type: string;
  premium: number;
}

interface ApplicationItem {
  applicationNo: string;
  status: string;
  applyAt?: string;
  underwritingAt?: string;
  policyNo?: string;
}

type UnderwritingCategory = 'NORMAL' | 'SPECIAL';

const Underwriting: React.FC = () => {
  const [applicationNo, setApplicationNo] = useState<string>("");
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [currentApp, setCurrentApp] = useState<ApplicationItem | null>(null);

  const [coverages, setCoverages] = useState<CoveragePremium[]>([]);
  const [totalPremium, setTotalPremium] = useState<number>(0);
  const [vat, setVat] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  const [underwritingCategory, setUnderwritingCategory] =
    useState<UnderwritingCategory>('NORMAL');

  /**
   * 加载投保申请列表
   */
  useEffect(() => {
    fetch(`${API_BASE}/api/application/search?keyword=`)
      .then(res => res.json())
      .then((list: ApplicationItem[]) => {
        setApplications(list);
      })
      .catch(() => {
        setApplications([]);
      });
  }, []);

  /**
   * 更新单个险种保费
   */
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

  /**
   * 开始核保
   */
  const handleStartUnderwriting = async () => {
    if (!applicationNo) return;
    setLoading(true);

    await fetch(`${API_BASE}/api/underwriting/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationNo })
    });

    setStatusMsg("已进入核保中状态");
    setLoading(false);
  };

  /**
   * 核保通过 / 出码
   */
  const handleApprove = async () => {
    if (!applicationNo) return;
    setLoading(true);

    const premiumSummary = {
      totalPremium,
      vat,
      premiumExclTax: Number((totalPremium - vat).toFixed(2))
    };

    await fetch(`${API_BASE}/api/underwriting/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationNo,
        coverages,
        premiumSummary,
        underwritingCategory
      })
    });

    const verifyRes = await fetch(`${API_BASE}/api/verify/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationNo })
    });

    const verifyData = await verifyRes.json();
    setStatusMsg(`核保通过，验证码：${verifyData.code}`);
    setLoading(false);
  };

  /**
   * 确认收付 / 出单
   */
  const handleIssue = async () => {
    if (!applicationNo) return;
    setLoading(true);

    const res = await fetch(`${API_BASE}/api/policy/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationNo })
    });

    const data = (await res.json()) as { policyNo: string };
    setStatusMsg(`成功承保，保单号：${data.policyNo}`);

    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">核保处理（补齐信息素）</h1>

      {/* 选择投保申请 */}
      <select
        value={applicationNo}
        onChange={e => {
          const no = e.target.value;
          setApplicationNo(no);
          const found = applications.find(a => a.applicationNo === no) || null;
          setCurrentApp(found);
        }}
        className="border px-3 py-2 rounded w-full"
      >
        <option value="">选择投保申请</option>
        {applications.map(app => (
          <option key={app.applicationNo} value={app.applicationNo}>
            {app.applicationNo} ｜ {app.status}
          </option>
        ))}
      </select>

      {/* 只读信息面板 */}
      {currentApp && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-1">
          <div><b>投保单号：</b>{currentApp.applicationNo}</div>
          <div><b>状态：</b>{currentApp.status}</div>
          <div><b>提交时间：</b>{currentApp.applyAt || "-"}</div>
          <div><b>核保时间：</b>{currentApp.underwritingAt || "-"}</div>
          <div><b>保单号：</b>{currentApp.policyNo || "-"}</div>
        </div>
      )}

      {/* 承保车辆类别裁定 */}
      <div className="border border-slate-200 rounded-lg p-4 space-y-2">
        <div className="text-sm font-semibold">承保车辆类别（核保裁定）</div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="NORMAL"
              checked={underwritingCategory === 'NORMAL'}
              onChange={() => setUnderwritingCategory('NORMAL')}
            />
            机动车
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="SPECIAL"
              checked={underwritingCategory === 'SPECIAL'}
              onChange={() => setUnderwritingCategory('SPECIAL')}
            />
            特种车
          </label>
        </div>
        <div className="text-xs text-slate-500">
          核保人员根据行驶证、使用性质、车辆照片等信息裁定最终承保类别
        </div>
      </div>

      {/* 保费填写 */}
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

      {/* 保费汇总 */}
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

      {/* 操作按钮 */}
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