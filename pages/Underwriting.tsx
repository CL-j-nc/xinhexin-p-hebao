// Underwriting.tsx
import React, { useState } from 'react';
import { InsuranceData } from '../utils/codec';

// 为 API 返回结果定义类型（避免 unknown / any 报错）
interface UnderwritingResult {
  status: 'SUBMITTED' | 'PAID' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  underwritingInfo?: {
    contractToken?: string;
    // 可根据实际后端补充其他字段
  };
}

const Underwriting: React.FC = () => {
  const [policyIdInput, setPolicyIdInput] = useState('');
  const [policy, setPolicy] = useState<(InsuranceData & { status: string; underwritingInfo?: UnderwritingResult['underwritingInfo'] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPolicy = async () => {
    const trimmedId = policyIdInput.trim();
    if (!trimmedId) {
      setErrorMsg('请输入有效的投保单号');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`/api/policies/${trimmedId}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? '单号不存在' : `服务器错误 (${response.status})`);
      }

      const data = await response.json() as InsuranceData & { status: string; underwritingInfo?: any };
      setPolicy(data);
    } catch (err: any) {
      setErrorMsg(err.message || '调阅失败，请检查网络或单号');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!policy) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/underwriting/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: policyIdInput.trim() }),
      });

      if (!response.ok) throw new Error('核保通过失败');
      const result: UnderwritingResult = await response.json();

      setPolicy(prev => prev ? { ...prev, status: result.status, underwritingInfo: result.underwritingInfo } : null);
      alert('核保通过，合同二维码已生成');
    } catch (err: any) {
      setErrorMsg(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!policy) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/underwriting/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: policyIdInput.trim() }),
      });

      if (!response.ok) throw new Error('退回失败');
      const result: UnderwritingResult = await response.json();

      setPolicy(prev => prev ? { ...prev, status: result.status } : null);
      alert('已退回业务员');
    } catch (err: any) {
      setErrorMsg(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!policy) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/underwriting/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: policyIdInput.trim() }),
      });

      if (!response.ok) throw new Error('确认失败');
      const result: UnderwritingResult = await response.json();

      setPolicy(prev => prev ? { ...prev, status: result.status } : null);
      alert('投保流程已完成，合同生效');
    } catch (err: any) {
      setErrorMsg(err.message || '确认失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

        {/* Header 与 Salesman 完全一致 */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-8 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 relative">
              <svg viewBox="0 0 28 28" className="w-full h-full">
                <path d="M14 3 L25 9 L25 19 L14 25 L3 19 L3 9 Z" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="14" cy="14" r="5" fill="#10b981" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">上海保交所 - 国寿财险核心承保系统</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">中国人寿车险 - 核保与出单</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            <input
              type="text"
              placeholder="输入投保单号"
              value={policyIdInput}
              onChange={e => setPolicyIdInput(e.target.value)}
              className={`
                w-64 input-base
                ${loading ? 'input-disabled' : ''}
                ${!loading ? 'focus:input-focus' : ''}
              `}
              disabled={loading}
            />
            <button
              onClick={fetchPolicy}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors"
            >
              {loading ? '调阅中...' : '调阅单据'}
            </button>
          </div>
        </header>

        {/* 主内容区 */}
        {policy ? (
          <div className="space-y-8 animate-fadeIn">
            {/* 事实资料核对 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">事实资料核对（只读）</h2>
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${policy.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-700' :
                  policy.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                  {policy.status === 'SUBMITTED' ? '待核保' :
                    policy.status === 'PAID' ? '已支付待确认' :
                      policy.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                <DataField label="投保人" value={policy.proposer.name || '--'} />
                <DataField label="被保险人" value={policy.insured.name || '--'} />
                <DataField label="号牌号码" value={policy.vehicle.plate || '--'} />
                <DataField label="车辆所有人" value={policy.vehicle.owner || '--'} />
                <DataField label="品牌型号" value={policy.vehicle.brand || '--'} />
                <DataField label="车架号 (VIN)码" value={policy.vehicle.vin || '--'} />
                <DataField label="发动机号" value={policy.vehicle.engineNo || '--'} />
                <DataField label="初次登记日期" value={policy.vehicle.registerDate || '--'} />
                <DataField label="整备质量 (kg)" value={policy.vehicle.curbWeight || '--'} />
                <DataField label="核定载质量 (kg)" value={policy.vehicle.approvedLoad || '--'} />
                <DataField label="核定载客人数 (人)" value={policy.vehicle.approvedPassengers || '--'} />
                <DataField label="使用性质" value={policy.vehicle.useNature || '--'} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">投保人证件</p>
                  {policy.proposer.idImage ? (
                    <img src={policy.proposer.idImage} alt="投保人证件" className="h-40 w-full object-contain rounded-xl border border-slate-200 bg-slate-50" />
                  ) : (
                    <div className="h-40 flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">无图片</div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">行驶证 / 车辆出厂合格证 / 购车发票</p>
                  {policy.vehicle.licenseImage ? (
                    <img src={policy.vehicle.licenseImage} alt="车辆资料" className="h-40 w-full object-contain rounded-xl border border-slate-200 bg-slate-50" />
                  ) : (
                    <div className="h-40 flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">无图片</div>
                  )}
                </div>
              </div>
            </div>

            {/* 决策区 */}
            {policy.status === 'SUBMITTED' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-4">核保决策</h2>
                <p className="text-sm text-slate-500 mb-6">确认资料无误后可通过生成支付二维码，或退回补充材料。</p>
                <div className="flex gap-4">
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    className="flex-1 px-6 py-3.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                    退回补充
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className={`
                      flex-1 px-6 py-3.5 btn-primary
                      ${loading ? 'btn-loading' : ''}
                    `}
                  >
                    {loading ? '处理中…' : '通过并生成二维码'}
                  </button>
                </div>
              </div>
            )}

            {policy.status === 'PAID' && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-8 text-center">
                <h2 className="text-xl font-bold text-emerald-800 mb-3">客户已完成支付</h2>
                <p className="text-sm text-emerald-700 mb-6">请核对后确认投保完成</p>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="px-12 py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                >
                  确认投保完成
                </button>
              </div>
            )}

            {/* 二维码区 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">合同二维码状态</h3>
              {policy.underwritingInfo?.contractToken ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-48 h-48 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-3 shadow-inner">
                    {policy.status === 'COMPLETED' ? (
                      <p className="text-xs text-rose-500 font-medium text-center leading-relaxed">
                        二维码已失效<br />（投保已完成）
                      </p>
                    ) : (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(policy.underwritingInfo.contractToken)}&size=180x180`}
                        alt="支付二维码"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  {policy.status !== 'COMPLETED' && (
                    <a
                      href={`/#/client?token=${policy.underwritingInfo.contractToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:text-emerald-700 underline"
                    >
                      模拟客户扫码支付
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-10">待核保通过后生成二维码</p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-80 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <p className="text-lg font-medium mb-2">
              {loading ? '正在调阅单据...' : '请输入投保单号进行调阅'}
            </p>
            <p className="text-sm opacity-70">
              单号为内部系统生成，仅用于核保查询
            </p>
          </div>
        )}

        {/* Footer 错误提示 */}
        {(errorMsg || loading) && (
          <div className="mt-6 flex justify-end">
            {errorMsg && <p className="text-rose-600 text-sm font-medium">{errorMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const DataField = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-medium text-slate-700 break-all">{value}</p>
  </div>
);

export default Underwriting;
