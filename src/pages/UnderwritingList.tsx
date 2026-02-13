import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787/api";

interface ProposalItem {
    proposal_id: string;
    proposal_status: string;
    created_at: string;
    application_submitted_at?: string;
    underwriting_confirmed_at?: string;
    plate_number?: string;
    brand_model?: string;
    vehicle_type?: string;
    acceptance?: string;
    auth_code?: string;
    qr_url?: string;
}

const UnderwritingList: React.FC = () => {
    const { status } = useParams<{ status: string }>();
    const navigate = useNavigate();
    const [list, setList] = useState<ProposalItem[]>([]);
    const [loading, setLoading] = useState(false);

    // QR Modal state
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authModalData, setAuthModalData] = useState<{ qr: string; code: string } | null>(null);

    const titleMap: Record<string, string> = {
        pending: "待处理投保申请",
        'awaiting-payment': "待支付确认",
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
                // 使用新的 /underwriting/history 端点（包含 auth_code, qr_url）
                url = `${API_BASE}/underwriting/history`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let items: ProposalItem[] = [];

            if (status === 'pending') {
                const data = (await res.json()) as any;
                items = Array.isArray(data) ? data : (data.results || []);
            } else {
                // history 端点返回带有 auth_code, qr_url, acceptance 的数据
                const data = (await res.json()) as any;
                const rawItems = Array.isArray(data) ? data : (data.results || []);

                items = rawItems.map((item: any) => ({
                    proposal_id: item.proposal_id || item.id,
                    proposal_status: item.proposal_status || item.status,
                    created_at: item.underwriting_confirmed_at || item.created_at || new Date().toISOString(),
                    application_submitted_at: item.underwriting_confirmed_at || item.created_at,
                    underwriting_confirmed_at: item.underwriting_confirmed_at,
                    plate_number: item.plate_number,
                    brand_model: item.brand_model,
                    acceptance: item.acceptance,
                    auth_code: item.auth_code,
                    qr_url: item.qr_url
                }));
            }

            // 客户端过滤
            if (status === 'rejected') {
                items = items.filter(i => i.acceptance === 'REJECT');
            } else if (status === 'awaiting-payment') {
                items = items.filter(i =>
                    i.acceptance === 'ACCEPT' &&
                    (i.proposal_status === 'UNDERWRITING_CONFIRMED' || i.proposal_status === 'WAITING_PAYMENT')
                );
            } else if (status === 'history') {
                // 显示所有已决策的记录（包括 ACCEPT 且已完成支付的）
                items = items.filter(i =>
                    i.proposal_status === 'COMPLETED' ||
                    i.proposal_status === 'PAID' ||
                    i.proposal_status === 'POLICY_ISSUED' ||
                    (i.acceptance === 'ACCEPT' && i.proposal_status === 'UNDERWRITING_CONFIRMED')
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

    // 显示二维码和验证码 Modal
    const showAuthModal = async (item: ProposalItem) => {
        if (item.qr_url) {
            try {
                const QRCode = await import('qrcode');
                const dataUrl = await QRCode.toDataURL(item.qr_url);
                setAuthModalData({ qr: dataUrl, code: item.auth_code || '' });
                setAuthModalOpen(true);
            } catch (e) {
                console.error('QR generation failed:', e);
                // 降级：只显示验证码
                if (item.auth_code) {
                    setAuthModalData({ qr: '', code: item.auth_code });
                    setAuthModalOpen(true);
                }
            }
        } else if (item.auth_code) {
            setAuthModalData({ qr: '', code: item.auth_code });
            setAuthModalOpen(true);
        }
    };

    const getStatusDisplay = (item: ProposalItem) => {
        if (item.acceptance === 'ACCEPT') return { text: '核保通过', color: 'bg-emerald-50 text-emerald-600' };
        if (item.acceptance === 'REJECT') return { text: '已拒保', color: 'bg-red-50 text-red-600' };
        if (item.acceptance === 'MODIFY') return { text: '已打回', color: 'bg-amber-50 text-amber-600' };
        if (item.proposal_status === 'SUBMITTED') return { text: '待核保', color: 'bg-blue-50 text-blue-600' };
        if (item.proposal_status === 'COMPLETED') return { text: '已完成', color: 'bg-gray-50 text-gray-600' };
        if (item.proposal_status === 'PAID') return { text: '已支付', color: 'bg-purple-50 text-purple-600' };
        return { text: item.proposal_status, color: 'bg-gray-50 text-gray-600' };
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
                                <th className="text-left px-6 py-4 font-semibold">核保时间</th>
                                <th className="text-left px-6 py-4 font-semibold">车辆信息</th>
                                <th className="text-left px-6 py-4 font-semibold">状态</th>
                                <th className="text-left px-6 py-4 font-semibold">认证信息</th>
                                <th className="text-left px-6 py-4 font-semibold">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {list.map((item, i) => {
                                const statusDisplay = getStatusDisplay(item);
                                return (
                                    <motion.tr
                                        key={item.proposal_id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.25 }}
                                        className="hover:bg-emerald-50/40 transition-colors duration-150 group"
                                    >
                                        <td className="px-6 py-4 font-mono text-sm font-medium text-gray-700">{item.proposal_id}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {item.underwriting_confirmed_at
                                                ? new Date(item.underwriting_confirmed_at).toLocaleString('zh-CN')
                                                : new Date(item.application_submitted_at || item.created_at).toLocaleString('zh-CN')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{item.plate_number || '未上牌'}</div>
                                            <div className="text-xs text-gray-400">{item.brand_model || item.vehicle_type || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusDisplay.color}`}>
                                                {statusDisplay.text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.auth_code ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); showAuthModal(item); }}
                                                    className="text-emerald-600 hover:text-emerald-700 hover:underline text-sm font-medium"
                                                >
                                                    查看二维码
                                                </button>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/detail/${item.proposal_id}`)}
                                                className="text-emerald-600 font-medium text-xs hover:underline"
                                            >
                                                查看详情 →
                                            </button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                            {list.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                                        暂无记录
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
            <Footer />

            {/* Auth Modal - 显示二维码和验证码 */}
            <AnimatePresence>
                {authModalOpen && authModalData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setAuthModalOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 max-w-sm shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">客户认证信息</h3>
                            <p className="text-sm text-gray-500 mb-4 text-center">请向客户出示此二维码或验证码</p>

                            <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                                {authModalData.qr && (
                                    <div className="flex justify-center mb-4">
                                        <img src={authModalData.qr} alt="Auth QR" className="w-48 h-48 rounded-lg shadow-sm border border-gray-200" />
                                    </div>
                                )}
                                <div className="text-center">
                                    <div className="text-sm text-gray-400 mb-1">验证码</div>
                                    <div className="text-2xl font-mono font-bold text-emerald-600 tracking-wider select-all cursor-text">
                                        {authModalData.code}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setAuthModalOpen(false)}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                            >
                                关闭
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnderwritingList;
