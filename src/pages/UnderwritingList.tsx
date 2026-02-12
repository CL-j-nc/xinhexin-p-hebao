import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787/api";

interface ProposalItem {
    proposal_id: string;
    proposal_status: string;
    created_at: string;
    application_submitted_at?: string;
    plate_number?: string;
    brand_model?: string;
    vehicle_type?: string;
}

const UnderwritingList: React.FC = () => {
    const { status } = useParams<{ status: string }>();
    const navigate = useNavigate();
    const [list, setList] = useState<ProposalItem[]>([]);
    const [loading, setLoading] = useState(false);

    const titleMap: Record<string, string> = {
        pending: "待处理投保申请",
        history: "核保历史记录",
        rejected: "被驳回/拒保申请"
    };

    useEffect(() => {
        fetchList();
    }, [status]);

    const fetchList = async () => {
        setLoading(true);
        try {
            let url = "";
            if (status === 'pending') {
                url = `${API_BASE}/underwriting/pending`;
            } else {
                // For history/rejected, we might use a unified history endpoint and filter client-side
                // or assume backend supports query params.
                // Using /application/history as per index.ts analysis
                url = `${API_BASE}/application/history`;
            }

            if (status === 'pending') {
                const data = (await res.json()) as any;
                items = Array.isArray(data) ? data : (data.results || []);
            } else {
                // History endpoint returns UnifiedRecord { id, status, timestamp, ... }
                // We must map it to ProposalItem { proposal_id, proposal_status, ... }
                const data = (await res.json()) as any;
                const rawItems = Array.isArray(data) ? data : (data.results || []);

                items = rawItems.map((item: any) => ({
                    proposal_id: item.id || item.proposal_id || item.applicationNo,
                    proposal_status: item.status || item.proposal_status,
                    created_at: new Date(item.timestamp || item.created_at || Date.now()).toISOString(),
                    application_submitted_at: new Date(item.timestamp || item.created_at || Date.now()).toISOString(),
                    plate_number: item.plate || item.plate_number,
                    brand_model: item.brand || item.brand_model,
                    vehicle_type: item.vehicle_type
                }));
            }

            // Client-side filtering if needed
            if (status === 'rejected') {
                items = items.filter(i =>
                    i.proposal_status === 'REJECTED' ||
                    i.proposal_status === 'Underwriting Rejected'
                );
            } else if (status === 'history') {
                items = items.filter(i =>
                    i.proposal_status !== 'SUBMITTED' &&
                    i.proposal_status !== 'REJECTED' &&
                    i.proposal_status !== 'Underwriting Rejected' // Ensure we don't show rejected in history if that's the intent
                );
            }

            setList(items);
        } catch (e) {
            console.error("Failed to fetch list", e);
            setList([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header />
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-emerald-600 mb-2">← 返回工作台</button>
                        <h2 className="text-xl font-bold text-gray-800">{titleMap[status || 'pending'] || "申请列表"}</h2>
                        <p className="text-sm text-gray-400 mt-0.5">共 {list.length} 条记录</p>
                    </div>
                    <button onClick={fetchList} disabled={loading}
                        className="text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium border border-emerald-100">
                        {loading ? "加载中..." : "↻ 刷新列表"}
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-emerald-50/50 border-b border-gray-100">
                            <tr className="text-xs text-gray-500 uppercase">
                                <th className="text-left px-6 py-4 font-semibold">投保单号</th>
                                <th className="text-left px-6 py-4 font-semibold">提交时间</th>
                                <th className="text-left px-6 py-4 font-semibold">车辆信息</th>
                                <th className="text-left px-6 py-4 font-semibold">当前状态</th>
                                <th className="text-left px-6 py-4 font-semibold">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {list.map((item, i) => (
                                <motion.tr
                                    key={item.proposal_id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04, duration: 0.25 }}
                                    onClick={() => navigate(`/detail/${item.proposal_id}`)}
                                    className="hover:bg-emerald-50/40 transition-colors duration-150 cursor-pointer group"
                                >
                                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-700 group-hover:text-emerald-700 transition-colors">{item.proposal_id}</td>
                                    <td className="px-6 py-4 text-gray-500">{new Date(item.application_submitted_at || item.created_at).toLocaleString('zh-CN')}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-800">{item.plate_number || '未上牌'}</div>
                                        <div className="text-xs text-gray-400">{item.brand_model || item.vehicle_type || '—'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium 
                                            ${item.proposal_status === 'SUBMITTED' ? 'bg-blue-50 text-blue-600' :
                                                item.proposal_status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                                    'bg-emerald-50 text-emerald-600'}`}>
                                            {item.proposal_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-emerald-600 font-medium text-xs hover:underline">查看详情 →</span>
                                    </td>
                                </motion.tr>
                            ))}
                            {list.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                        暂无记录
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default UnderwritingList;
