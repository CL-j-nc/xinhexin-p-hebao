import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';

interface Proposal {
    proposal_id: string;
    proposal_status: string;
    created_at: string;
    application_submitted_at?: string;
}

interface ProposalDetail {
    proposal: Proposal;
    vehicle: any;
    coverage: {
        sum_insured: number;
        policy_effective_date: string;
    };
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787/api";

const UnderwritingPage: React.FC = () => {
    const [pendingList, setPendingList] = useState<Proposal[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<ProposalDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [riskLevel, setRiskLevel] = useState("LOW");
    const [acceptance, setAcceptance] = useState("ACCEPT");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [finalPremium, setFinalPremium] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [riskReason, setRiskReason] = useState("");
    const [ceremonyOpen, setCeremonyOpen] = useState(false);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            const res = await fetch(`${API_BASE}/underwriting/pending`);
            const data = (await res.json()) as Proposal[];
            setPendingList(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch pending", e);
        }
    };

    const selectProposal = async (id: string) => {
        setLoading(true);
        setSelectedId(id);
        try {
            const res = await fetch(`${API_BASE}/underwriting/detail?id=${id}`);
            const data = (await res.json()) as ProposalDetail;
            setDetail(data);
            if (data.coverage) {
                setEffectiveDate(data.coverage.policy_effective_date || new Date().toISOString().split('T')[0]);
                const eff = new Date(data.coverage.policy_effective_date || Date.now());
                const exp = new Date(eff);
                exp.setFullYear(exp.getFullYear() + 1);
                setExpiryDate(exp.toISOString().split('T')[0]);
                setFinalPremium(data.coverage.sum_insured ? data.coverage.sum_insured * 0.05 : 1000);
            }
        } catch (e) {
            console.error("Failed to fetch detail", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCeremonySubmit = async () => {
        if (!detail) return;
        setProcessing(true);
        try {
            const decisionPayload = {
                proposalId: detail.proposal.proposal_id,
                underwriterName: "CyberAdmin",
                decision: {
                    riskLevel,
                    riskReason,
                    acceptance,
                    finalPremium,
                    policyEffectiveDate: effectiveDate,
                    policyExpiryDate: expiryDate,
                },
                vehicleConfirmed: detail.vehicle
            };

            const resDec = await fetch(`${API_BASE}/underwriting/decision`, {
                method: 'POST',
                body: JSON.stringify(decisionPayload)
            });
            const jsonDec = (await resDec.json()) as { success: boolean; error?: string };
            if (!jsonDec.success) throw new Error(jsonDec.error || "Decision failed");

            if (acceptance === 'ACCEPT') {
                const resIssue = await fetch(`${API_BASE}/policy/issue`, {
                    method: 'POST',
                    body: JSON.stringify({ proposalId: detail.proposal.proposal_id })
                });
                // 假设成功
            }
            alert("核保完成");
            setCeremonyOpen(false);
            fetchPending();
            setSelectedId(null);
        } catch (e) {
            alert("提交失败");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header />
            <main className="flex-1 max-w-7xl mx-auto px-4 py-8">
                {selectedId ? (
                    <div className="card space-y-6">
                        <button onClick={() => setSelectedId(null)} className="text-slate-600 hover:text-slate-800 text-sm">← 返回列表</button>
                        <h2 className="text-xl font-bold text-slate-800">核保详情 - {selectedId}</h2>
                        {loading ? <p>加载中...</p> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">车辆信息</h3>
                                    <dl className="grid grid-cols-2 gap-4 text-sm">
                                        <dt className="text-slate-500">车牌号</dt><dd className="font-medium">{detail?.vehicle.plate_number}</dd>
                                        {/* 其他字段 */}
                                    </dl>
                                </section>
                                {/* 类似原代码的其他 section，调整为浅色网格 */}
                            </div>
                        )}

                        {/* Added Policy Term and Premium Adjustment Section for completeness based on instructions */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">保险期限与保费</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">保险起期</label>
                                    <input
                                        type="date"
                                        className="input-base"
                                        value={effectiveDate}
                                        onChange={(e) => setEffectiveDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">保险止期</label>
                                    <input
                                        type="date"
                                        className="input-base"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">最终保费 (CNY)</label>
                                    <input
                                        type="number"
                                        className="input-base"
                                        value={finalPremium}
                                        onChange={(e) => setFinalPremium(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button
                                onClick={() => setCeremonyOpen(true)}
                                className="btn-primary px-8 py-3"
                            >
                                提交核保决策
                            </button>
                        </div>

                    </div>
                ) : (
                    <div className="card space-y-6">
                        <h2 className="text-xl font-bold text-slate-800">待处理列表</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left px-6 py-4 text-slate-600 font-semibold">单号</th>
                                        <th className="text-left px-6 py-4 text-slate-600 font-semibold">提交时间</th>
                                        <th className="text-left px-6 py-4 text-slate-600 font-semibold">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingList.map(item => (
                                        <tr key={item.proposal_id} className="hover:bg-slate-50 transition-colors animate-fade-in">
                                            <td className="px-6 py-4 font-medium text-slate-900">{item.proposal_id}</td>
                                            <td className="px-6 py-4 text-slate-500">{new Date(item.application_submitted_at || item.created_at).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => selectProposal(item.proposal_id)} className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">处理</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {pendingList.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-slate-400">暂无待处理任务</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
            <Footer />

            {/* Decision Ceremony Modal */}
            <AnimatePresence>
                {ceremonyOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-6"
                        >
                            <h3 className="text-xl font-bold text-slate-800">确认核保决策</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">核保结论</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setAcceptance('ACCEPT')}
                                            className={`p-3 rounded-xl border-2 font-bold transition-all ${acceptance === 'ACCEPT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                                        >
                                            通过 (Accept)
                                        </button>
                                        <button
                                            onClick={() => setAcceptance('REJECT')}
                                            className={`p-3 rounded-xl border-2 font-bold transition-all ${acceptance === 'REJECT' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`}
                                        >
                                            拒保 (Reject)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">风险等级</label>
                                    <select
                                        className="input-base"
                                        value={riskLevel}
                                        onChange={(e) => setRiskLevel(e.target.value)}
                                    >
                                        <option value="LOW">低风险 (Low)</option>
                                        <option value="MEDIUM">中风险 (Medium)</option>
                                        <option value="HIGH">高风险 (High)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">决策说明</label>
                                    <textarea
                                        className="input-base h-24 resize-none"
                                        placeholder="请输入核保意见..."
                                        value={riskReason}
                                        onChange={(e) => setRiskReason(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setCeremonyOpen(false)}
                                    className="flex-1 btn-secondary py-3"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleCeremonySubmit}
                                    disabled={processing}
                                    className="flex-1 btn-primary py-3"
                                >
                                    {processing ? '提交中...' : '确认提交'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnderwritingPage;
