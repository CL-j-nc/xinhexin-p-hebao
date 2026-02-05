import React, { useEffect, useState } from 'react';

// Get API Base URL from env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface PendingProposal {
  proposal_id: string;
  proposal_status: string;
  created_at: string;
  vehicle_type?: string;
  plate_number?: string;
  brand_model?: string;
}

interface ProposalDetail {
  proposal: {
    proposal_id: string;
    created_at: string;
    proposal_status: string;
  };
  vehicle: {
    plate_number: string;
    vehicle_type: string;
    usage_nature: string;
    brand_model: string;
    vin_chassis_number: string;
    engine_number: string;
    curb_weight: number;
    approved_load_weight: number;
    approved_passenger_count: number;
    energy_type: string;
    registration_date: string;
    license_issue_date: string;
  };
}

interface ManualDecision {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskReason: string;
  acceptance: 'ACCEPT' | 'REJECT' | 'MODIFIED';
  finalPremium: number;
  premiumReason?: string;
  notes?: string;
  // Simplified fields for now, can be expanded
}

const UnderwritingPage: React.FC = () => {
  const [list, setList] = useState<PendingProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProposalDetail | null>(null);

  // Decision Form State
  const [decision, setDecision] = useState<ManualDecision>({
    riskLevel: 'LOW',
    riskReason: '正常风险业务',
    acceptance: 'ACCEPT',
    finalPremium: 0,
    premiumReason: '标准费率',
    notes: ''
  });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/underwriting/pending`);
      if (res.ok) {
        const data = await res.json();
        setList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
      alert("加载列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/underwriting/detail?id=${id}`);
      if (res.ok) {
        const data = await res.json() as ProposalDetail;
        setDetail(data);
        setSelectedId(id);
        // Reset decision form
        setDecision({
          riskLevel: 'LOW',
          riskReason: '正常风险业务',
          acceptance: 'ACCEPT',
          finalPremium: 0,
          premiumReason: '标准费率',
          notes: ''
        });
      } else {
        alert("加载详情失败");
      }
    } catch (e) {
      console.error(e);
      alert("加载详情异常");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSubmit = async (isReject: boolean) => {
    if (!detail) return;

    // Construct final payload
    const payload = {
      proposalId: detail.proposal.proposal_id,
      underwriterName: "人工核保员", // Should be real user
      decision: {
        ...decision,
        acceptance: isReject ? 'REJECT' : decision.acceptance
      },
      // Verify vehicle data (assuming verified same as proposed for simplicity here)
      vehicleConfirmed: detail.vehicle
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/underwriting/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(isReject ? "已拒绝" : "核保完成");
        setSelectedId(null);
        setDetail(null);
        fetchList();
      } else {
        alert("提交失败");
      }
    } catch (e) {
      console.error(e);
      alert("提交异常");
    }
  };

  if (selectedId && detail) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setSelectedId(null)} className="mb-4 text-gray-600 hover:text-gray-900">
            ← 返回列表
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Detail View */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">🚗 车辆申报信息</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">车牌号:</span> {detail.vehicle.plate_number}</div>
                  <div><span className="text-gray-500">品牌型号:</span> {detail.vehicle.brand_model}</div>
                  <div><span className="text-gray-500">车架号:</span> {detail.vehicle.vin_chassis_number}</div>
                  <div><span className="text-gray-500">发动机号:</span> {detail.vehicle.engine_number}</div>
                  <div><span className="text-gray-500">使用性质:</span> {detail.vehicle.usage_nature}</div>
                  <div><span className="text-gray-500">车辆类型:</span> {detail.vehicle.vehicle_type}</div>
                </div>
              </div>
            </div>

            {/* Right: Decision Form */}
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 shadow">
                <h2 className="text-xl font-bold mb-4 text-blue-900">⚖️ 人工核保裁决</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">风险评级</label>
                    <select
                      value={decision.riskLevel}
                      onChange={e => setDecision({ ...decision, riskLevel: e.target.value as any })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                    >
                      <option value="LOW">低风险</option>
                      <option value="MEDIUM">中风险</option>
                      <option value="HIGH">高风险</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">最终定价 (元)</label>
                    <input
                      type="number"
                      value={decision.finalPremium}
                      onChange={e => setDecision({ ...decision, finalPremium: parseFloat(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-lg font-bold text-green-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">核保详情/备注</label>
                    <textarea
                      value={decision.riskReason}
                      onChange={e => setDecision({ ...decision, riskReason: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 h-24"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => handleSubmit(false)}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700"
                    >
                      ✓ 批准承保
                    </button>
                    <button
                      onClick={() => handleSubmit(true)}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700"
                    >
                      ✗ 拒绝/拒保
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">核保工作台</h1>
          <button onClick={fetchList} className="bg-white px-4 py-2 rounded shadow hover:bg-gray-50">刷新列表</button>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">暂无待处理任务</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">提交时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">车辆信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {list.map(item => (
                  <tr key={item.proposal_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.proposal_id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{item.plate_number}</div>
                      <div className="text-gray-500 text-xs">{item.brand_model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => fetchDetail(item.proposal_id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        处理 &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnderwritingPage;