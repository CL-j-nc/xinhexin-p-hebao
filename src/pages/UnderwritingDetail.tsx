import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import Header from '../components/Header';
import Footer from '../components/Footer';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface Proposal {
    proposal_id: string;
    proposal_status: string;
    created_at: string;
    application_submitted_at?: string;
    plate_number?: string;
    brand_model?: string;
    vehicle_type?: string;
}

interface CoverageItem {
    coverage_id?: string;
    coverage_code: string;
    coverage_name: string;
    sum_insured: number;     // 投保额度 (from proposal)
    base_premium: number;    // 基础保费 (new: editable base for calculation)
    rate: number;            // 费率 adjustment
    premium: number;         // Final Premium = base_premium * rate
    policy_effective_date?: string;
}

interface PersonInfo {
    name: string;
    idType: string;
    idCard: string;
    mobile: string;
    address: string;
    gender: string;
    identityType?: string;
}

interface VehicleInfo {
    plate_number: string;
    vehicle_type: string;
    usage_nature: string;
    brand_model: string;
    vin_chassis_number: string;
    engine_number: string;
    registration_date: string;
    license_issue_date: string;
    curb_weight: number | string;
    approved_load_weight: number | string;
    approved_passenger_count: number | string;
    energy_type: string;
}

interface ProposalDetail {
    proposal: Proposal;
    vehicle: VehicleInfo;
    coverage: any[];
    proposalData: {
        owner?: PersonInfo;
        proposer?: PersonInfo;
        insured?: PersonInfo;
        vehicle?: any;
        coverages?: any[];
    } | null;
    paymentLink?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787/api";

/* ═══════════════════════════════════════════════════════════════
   Micro-animation variants
   ═══════════════════════════════════════════════════════════════ */
const fadeUp: any = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.06, duration: 0.35 }
    })
};

const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

/* ═══════════════════════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════════════════════ */

/** 带标签的输入字段 — 国寿绿风格 */
const FieldInput: React.FC<{
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    type?: string;
    readOnly?: boolean;
    placeholder?: string;
}> = ({ label, value, onChange, type = "text", readOnly, placeholder }) => (
    <div className="group">
        <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">{label}</label>
        <input
            type={type}
            value={value ?? ""}
            placeholder={placeholder}
            readOnly={readOnly}
            onChange={e => onChange(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all duration-200
                ${readOnly
                    ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-default'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                } outline-none`}
        />
    </div>
);

/** 区块卡片 */
const SectionCard: React.FC<{
    title: string;
    icon: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    index?: number;
}> = ({ title, icon, children, actions, index = 0 }) => (
    <motion.section
        custom={index}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
    >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <span className="tracking-wide">{title}</span>
            </h3>
            {actions}
        </div>
        <div className="p-6">
            {children}
        </div>
    </motion.section>
);

/** 人员信息编辑区 */
const PersonEditor: React.FC<{
    title: string;
    icon: string;
    person: PersonInfo;
    onChange: (p: PersonInfo) => void;
    index?: number;
}> = ({ title, icon, person, onChange, index = 0 }) => {
    const update = (key: keyof PersonInfo, val: string) => onChange({ ...person, [key]: val });
    return (
        <SectionCard title={title} icon={icon} index={index}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FieldInput label="姓名 / 名称" value={person.name || ""} onChange={v => update("name", v)} />
                <FieldInput label="证件类型" value={person.idType || "身份证"} onChange={v => update("idType", v)} />
                <FieldInput label="证件号码" value={person.idCard || ""} onChange={v => update("idCard", v)} />
                <FieldInput label="联系电话" value={person.mobile || ""} onChange={v => update("mobile", v)} />
                <FieldInput label="性别" value={person.gender || ""} onChange={v => update("gender", v)} />
                <FieldInput label="身份类型" value={person.identityType || "个人"} onChange={v => update("identityType", v)} />
                <div className="col-span-2 md:col-span-3">
                    <FieldInput label="联系地址" value={person.address || ""} onChange={v => update("address", v)} />
                </div>
            </div>
        </SectionCard>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
const UnderwritingDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    // const [pendingList, setPendingList] = useState<Proposal[]>([]); // Removed
    // const [selectedId, setSelectedId] = useState<string | null>(null); // Use id param
    const [detail, setDetail] = useState<ProposalDetail | null>(null);
    const [loading, setLoading] = useState(false);

    // Vehicle editable state
    const [vehicle, setVehicle] = useState<VehicleInfo>({
        plate_number: "", vehicle_type: "", usage_nature: "", brand_model: "",
        vin_chassis_number: "", engine_number: "", registration_date: "", license_issue_date: "",
        curb_weight: "", approved_load_weight: "", approved_passenger_count: "", energy_type: "FUEL"
    });

    // Person editable states
    const [owner, setOwner] = useState<PersonInfo>({ name: "", idType: "身份证", idCard: "", mobile: "", address: "", gender: "" });
    const [proposer, setProposer] = useState<PersonInfo>({ name: "", idType: "身份证", idCard: "", mobile: "", address: "", gender: "" });
    const [insured, setInsured] = useState<PersonInfo>({ name: "", idType: "身份证", idCard: "", mobile: "", address: "", gender: "" });

    // Decision State
    const [riskLevel, setRiskLevel] = useState("LOW");
    const [acceptance, setAcceptance] = useState("ACCEPT");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [processing, setProcessing] = useState(false);
    const [riskReason, setRiskReason] = useState("");
    const [ceremonyOpen, setCeremonyOpen] = useState(false);

    // Coverage with premium
    const [coverages, setCoverages] = useState<CoverageItem[]>([]);
    const [paymentLink, setPaymentLink] = useState("");
    const [newCoverage, setNewCoverage] = useState<Partial<CoverageItem>>({ coverage_name: "", sum_insured: 0, base_premium: 0, rate: 1.0 });
    const [isAddingCoverage, setIsAddingCoverage] = useState(false);

    // Active section tab for mobile
    const [activeSection, setActiveSection] = useState<'info' | 'coverage' | 'decision'>('info');

    /* ── Computed total premium ── */
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successData, setSuccessData] = useState<{ qr: string, code: string }>({ qr: '', code: '' });

    /* ── Computed total premium ── */
    const totalPremium = useMemo(() => coverages.reduce((s, c) => s + (c.premium || 0), 0), [coverages]);

    useEffect(() => {
        if (id) selectProposal(id);
    }, [id]);

    const fetchPending = () => { }; // No-op

    const selectProposal = async (targetId: string) => {
        setLoading(true);
        // setSelectedId(targetId); // Removed
        try {
            const res = await fetch(`${API_BASE}/underwriting/detail?id=${targetId}`);
            const data = (await res.json()) as ProposalDetail;
            setDetail(data);

            // Vehicle
            if (data.vehicle) setVehicle(data.vehicle);

            // Persons from proposalData
            const pd = data.proposalData;
            if (pd?.owner) setOwner(prev => ({ ...prev, ...pd.owner }));
            if (pd?.proposer) setProposer(prev => ({ ...prev, ...pd.proposer }));
            if (pd?.insured) setInsured(prev => ({ ...prev, ...pd.insured }));

            // Payment link
            setPaymentLink(data.paymentLink || "");

            // Coverages — merge from DB coverage and proposalData coverages
            if (data.coverage && data.coverage.length > 0) {
                const merged = data.coverage.map((c: any) => ({
                    coverage_id: c.coverage_id,
                    coverage_code: c.coverage_code || "MISC",
                    coverage_name: c.coverage_name || "未命名险种",
                    sum_insured: c.sum_insured || 0,
                    base_premium: c.base_premium || 0, // Decoupled from Sum Insured, default 0
                    rate: c.rate || 1.0,
                    premium: (c.base_premium || 0) * (c.rate || 1.0),
                    policy_effective_date: c.policy_effective_date
                }));
                setCoverages(merged);

                const first = data.coverage[0];
                setEffectiveDate(first?.policy_effective_date || new Date().toISOString().split('T')[0]);
                const eff = new Date(first?.policy_effective_date || Date.now());
                const exp = new Date(eff); exp.setFullYear(exp.getFullYear() + 1);
                setExpiryDate(exp.toISOString().split('T')[0]);
            } else if (pd?.coverages) {
                // Fallback: use coverages from proposalData (Handle both array and object formats if needed, assuming Array based on previous code)
                const list = Array.isArray(pd.coverages) ? pd.coverages : [];
                const merged = list.filter((c: any) => c.selected !== false).map((c: any) => ({
                    coverage_code: c.type || "MISC",
                    coverage_name: c.name || "未命名险种",
                    sum_insured: Number(c.amount) || Number(c.sum_insured) || 0,
                    base_premium: 0, // Default 0, Underwriter must set
                    rate: 1.0,
                    premium: 0,
                    policy_effective_date: c.policy_effective_date
                }));
                setCoverages(merged);
                setEffectiveDate(new Date().toISOString().split('T')[0]);
                const exp = new Date(); exp.setFullYear(exp.getFullYear() + 1);
                setExpiryDate(exp.toISOString().split('T')[0]);
            } else {
                setCoverages([]);
            }
        } catch (e) { console.error("Failed to fetch detail", e); }
        finally { setLoading(false); }
    };

    /* ── Coverage CRUD ── */
    const updateCoverage = useCallback((index: number, field: keyof CoverageItem, value: any) => {
        setCoverages(prev => {
            const next = [...prev];
            (next[index] as any)[field] = value;
            // Auto-recalc premium: Base * Rate
            const base = Number(next[index].base_premium) || 0;
            const rate = Number(next[index].rate) || 0;
            next[index].premium = base * rate;
            return next;
        });
    }, []);

    const removeCoverage = (index: number) => setCoverages(prev => prev.filter((_, i) => i !== index));

    const handleAddCoverage = () => {
        if (!newCoverage.coverage_name) { alert("请输入险种名称"); return; }
        const si = Number(newCoverage.sum_insured) || 0;
        const base = Number(newCoverage.base_premium) || 0;
        const r = Number(newCoverage.rate) || 1.0;
        setCoverages(prev => [...prev, {
            coverage_code: "CUSTOM_" + Date.now(),
            coverage_name: newCoverage.coverage_name!,
            sum_insured: si,
            base_premium: base,
            rate: r,
            premium: base * r,
            policy_effective_date: effectiveDate
        }]);
        setNewCoverage({ coverage_name: "", sum_insured: 0, base_premium: 0, rate: 1.0 });
        setIsAddingCoverage(false);
    };

    /* ── Submit ── */
    const handleCeremonySubmit = async () => {
        if (!detail) return;
        setProcessing(true);
        try {
            // Validate required fields
            if (totalPremium <= 0 && acceptance === 'ACCEPT') {
                if (!confirm("当前总保费为 0，确定要承保吗？")) { setProcessing(false); return; }
            }

            const decisionPayload = {
                proposalId: detail.proposal.proposal_id,
                underwriterName: "CyberAdmin",
                decision: {
                    riskLevel,
                    riskReason,
                    acceptance,
                    finalPremium: totalPremium,
                    policyEffectiveDate: effectiveDate,
                    policyExpiryDate: expiryDate,
                    paymentLink: paymentLink || "", // 核保员必须手动粘贴真实支付链接
                },
                vehicleConfirmed: vehicle,
                paymentLink: paymentLink || "",
                coverages,
                updatedPersons: { owner, proposer, insured }
            };

            const resDec = await fetch(`${API_BASE}/underwriting/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(decisionPayload)
            });
            const jsonDec = (await resDec.json()) as { success: boolean; error?: string; authCode?: string; qrUrl?: string };
            if (!jsonDec.success) throw new Error(jsonDec.error || "Decision failed");

            if (acceptance === 'ACCEPT') {
                await fetch(`${API_BASE}/policy/issue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proposalId: detail.proposal.proposal_id })
                });

                // Generate QR Code for display
                if (jsonDec.qrUrl) {
                    try {
                        const url = await QRCode.toDataURL(jsonDec.qrUrl);
                        setSuccessData({ qr: url, code: jsonDec.authCode || '' });
                        setSuccessModalOpen(true);
                    } catch (e) {
                        console.error('QR Gen Error:', e);
                        alert(`核保通过！验证码：${jsonDec.authCode} (QR生成失败)`);
                    }
                } else if (jsonDec.authCode) {
                    alert(`核保通过！客户认证验证码：${jsonDec.authCode}`);
                } else {
                    alert("核保完成！保单已签发。");
                }
            } else {
                alert("核保决策已提交。");
                navigate('/list/pending');
            }
            setCeremonyOpen(false);
            if (acceptance === 'ACCEPT') {
                // Stay on page but refresh
                selectProposal(detail.proposal.proposal_id);
            }
        } catch (e) {
            alert("提交失败: " + (e instanceof Error ? e.message : "Unknown error"));
        } finally { setProcessing(false); }
    };

    /* ── Lifecycle Actions ── */
    const handleLifecycleUpdate = async (status: 'PAID' | 'COMPLETED') => {
        if (!id) return;
        if (!confirm(`确定将此投保单标记为 ${status === 'PAID' ? '已支付' : '已完成'} 吗？`)) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/proposal/lifecycle/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proposalId: id, status })
            });
            const data = await res.json() as any;
            if (data.success) {
                alert("状态更新成功");
                selectProposal(id); // Refresh
            } else {
                alert("更新失败: " + (data.error || "Unknown"));
            }
        } catch (e) {
            console.error(e);
            alert("网络错误");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'SUBMITTED': return <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-md">待核保</span>;
            case 'UNDERWRITING_CONFIRMED': return <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-md">核保通过 · 待支付</span>;
            case 'PAID': return <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-md">已支付 · 待出单</span>;
            case 'POLICY_ISSUED': return <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-md">已出单</span>;
            case 'COMPLETED': return <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-md">已归档</span>;
            case 'REJECTED': return <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-3 py-1 rounded-md">已拒保</span>;
            default: return <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-md">{status || "未知状态"}</span>;
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', Arial, sans-serif" }}>
            <Header />

            <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full">
                {id ? (
                    /* ════════ DETAIL VIEW ════════ */
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">

                        {/* Top bar */}
                        <div className="flex items-center justify-between">
                            <button onClick={() => navigate('/list/pending')}
                                className="text-gray-500 hover:text-emerald-700 font-medium flex items-center gap-1 text-sm transition-colors duration-200">
                                <span className="text-lg">←</span> 返回列表
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-mono">#{id}</span>
                                {getStatusBadge(detail?.proposal?.proposal_status)}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-32">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm text-gray-400">正在获取投保详情…</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* ── Section Tabs (navigation) ── */}
                                <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-100 shadow-sm w-fit">
                                    {([
                                        { key: 'info', label: '投保信息', icon: '📋' },
                                        { key: 'coverage', label: '承保方案', icon: '🛡️' },
                                        { key: 'decision', label: '核保决策', icon: '⚖️' },
                                    ] as const).map(tab => (
                                        <button key={tab.key} onClick={() => setActiveSection(tab.key)}
                                            className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                                                ${activeSection === tab.key
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'
                                                }`}>
                                            <span className="text-sm">{tab.icon}</span> {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* ═══ TAB: 投保信息 ═══ */}
                                {activeSection === 'info' && (
                                    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
                                        {/* Vehicle Info */}
                                        <SectionCard title="车辆信息" icon="🚗" index={0}>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <FieldInput label="车牌号" value={vehicle.plate_number} onChange={v => setVehicle(p => ({ ...p, plate_number: v }))} />
                                                <FieldInput label="车辆类型" value={vehicle.vehicle_type} onChange={v => setVehicle(p => ({ ...p, vehicle_type: v }))} />
                                                <FieldInput label="使用性质" value={vehicle.usage_nature} onChange={v => setVehicle(p => ({ ...p, usage_nature: v }))} />
                                                <FieldInput label="厂牌型号" value={vehicle.brand_model} onChange={v => setVehicle(p => ({ ...p, brand_model: v }))} />
                                                <FieldInput label="车架号 (VIN)" value={vehicle.vin_chassis_number} onChange={v => setVehicle(p => ({ ...p, vin_chassis_number: v }))} />
                                                <FieldInput label="发动机号" value={vehicle.engine_number} onChange={v => setVehicle(p => ({ ...p, engine_number: v }))} />
                                                <FieldInput label="注册日期" value={vehicle.registration_date} onChange={v => setVehicle(p => ({ ...p, registration_date: v }))} type="date" />
                                                <FieldInput label="发证日期" value={vehicle.license_issue_date} onChange={v => setVehicle(p => ({ ...p, license_issue_date: v }))} type="date" />
                                                <FieldInput label="整备质量 (KG)" value={vehicle.curb_weight} onChange={v => setVehicle(p => ({ ...p, curb_weight: v }))} type="number" />
                                                <FieldInput label="核定载质量 (KG)" value={vehicle.approved_load_weight} onChange={v => setVehicle(p => ({ ...p, approved_load_weight: v }))} type="number" />
                                                <FieldInput label="核定载客人数" value={vehicle.approved_passenger_count} onChange={v => setVehicle(p => ({ ...p, approved_passenger_count: v }))} type="number" />
                                                <FieldInput label="能源类型" value={vehicle.energy_type} onChange={v => setVehicle(p => ({ ...p, energy_type: v }))} />
                                            </div>
                                        </SectionCard>

                                        {/* Person Editors */}
                                        <PersonEditor title="车主信息" icon="👤" person={owner} onChange={setOwner} index={1} />
                                        <PersonEditor title="投保人信息" icon="🧑‍💼" person={proposer} onChange={setProposer} index={2} />
                                        <PersonEditor title="被保险人信息" icon="🛡️" person={insured} onChange={setInsured} index={3} />
                                    </motion.div>
                                )}

                                {/* ═══ TAB: 承保方案 ═══ */}
                                {activeSection === 'coverage' && (
                                    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
                                        <SectionCard
                                            title="承保险种方案"
                                            icon="📊"
                                            index={0}
                                            actions={
                                                <button onClick={() => setIsAddingCoverage(true)}
                                                    className="text-emerald-700 text-xs font-semibold border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors duration-200">
                                                    + 新增险种
                                                </button>
                                            }
                                        >
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm border-collapse">
                                                    <thead>
                                                        <tr className="bg-emerald-50/60 text-gray-600 text-xs uppercase">
                                                            <th className="text-left px-4 py-3 font-semibold rounded-l-lg">险种名称</th>
                                                            <th className="text-right px-4 py-3 font-semibold">投保额度（元）</th>
                                                            <th className="text-right px-4 py-3 font-semibold">基础保费（元）</th>
                                                            <th className="text-right px-4 py-3 font-semibold">调整系数</th>
                                                            <th className="text-right px-4 py-3 font-semibold">最终保费（元）</th>
                                                            <th className="text-center px-4 py-3 font-semibold rounded-r-lg">操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {coverages.map((cov, idx) => (
                                                            <motion.tr
                                                                key={idx}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: idx * 0.04 }}
                                                                className="group hover:bg-emerald-50/30 transition-colors duration-150"
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <input
                                                                        className="bg-transparent border-none outline-none text-gray-800 font-medium w-full focus:bg-white focus:ring-1 focus:ring-emerald-200 rounded px-1 transition-all"
                                                                        value={cov.coverage_name}
                                                                        onChange={e => updateCoverage(idx, 'coverage_name', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <input
                                                                        type="number"
                                                                        className="bg-transparent border-b border-dashed border-gray-300 w-28 text-right font-mono outline-none focus:border-emerald-500 transition-colors"
                                                                        value={cov.sum_insured}
                                                                        onChange={e => updateCoverage(idx, 'sum_insured', Number(e.target.value))}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <input
                                                                        type="number"
                                                                        className="bg-transparent border-b border-dashed border-gray-300 w-24 text-right font-mono outline-none focus:border-emerald-500 transition-colors font-semibold text-emerald-600"
                                                                        value={cov.base_premium}
                                                                        onChange={e => updateCoverage(idx, 'base_premium', Number(e.target.value))}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <span className="text-gray-400 text-xs">x</span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="bg-transparent border-b border-dashed border-gray-300 w-16 text-right font-mono outline-none focus:border-emerald-500 transition-colors"
                                                                            value={cov.rate}
                                                                            onChange={e => updateCoverage(idx, 'rate', Number(e.target.value))}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <span className="font-semibold text-emerald-700 font-mono">
                                                                        ¥{cov.premium.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button onClick={() => removeCoverage(idx)}
                                                                        className="text-gray-400 hover:text-red-500 text-xs font-medium transition-colors duration-150">移除</button>
                                                                </td>
                                                            </motion.tr>
                                                        ))}
                                                        {coverages.length === 0 && (
                                                            <tr>
                                                                <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">暂无险种，请点击右上角"新增险种"添加</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    {coverages.length > 0 && (
                                                        <tfoot>
                                                            <tr className="border-t-2 border-emerald-100">
                                                                <td colSpan={4} className="px-4 py-4 text-right text-sm font-semibold text-gray-600">保单总保费合计</td>
                                                                <td className="px-4 py-4 text-right">
                                                                    <span className="text-lg font-bold text-emerald-700 font-mono">
                                                                        ¥{totalPremium.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </td>
                                                                <td />
                                                            </tr>
                                                        </tfoot>
                                                    )}
                                                </table>
                                            </div>

                                            {/* Add Coverage Form */}
                                            <AnimatePresence>
                                                {isAddingCoverage && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-5 overflow-hidden"
                                                    >
                                                        <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                            <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">新增险种</h4>
                                                            <div className="flex flex-wrap gap-3 items-end">
                                                                <div className="flex-1 min-w-[160px]">
                                                                    <FieldInput label="险种名称" value={newCoverage.coverage_name || ""} onChange={v => setNewCoverage(p => ({ ...p, coverage_name: v }))} placeholder="如: 玻璃破碎险" />
                                                                </div>
                                                                <div className="w-32">
                                                                    <FieldInput label="投保额度" value={newCoverage.sum_insured || 0} onChange={v => setNewCoverage(p => ({ ...p, sum_insured: Number(v) }))} type="number" />
                                                                </div>
                                                                <div className="w-32">
                                                                    <FieldInput label="基础保费" value={newCoverage.base_premium || 0} onChange={v => setNewCoverage(p => ({ ...p, base_premium: Number(v) }))} type="number" />
                                                                </div>
                                                                <div className="w-24">
                                                                    <FieldInput label="调整系数" value={newCoverage.rate || 1.0} onChange={v => setNewCoverage(p => ({ ...p, rate: Number(v) }))} type="number" />
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button onClick={handleAddCoverage} className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors duration-200 shadow-sm">确认添加</button>
                                                                    <button onClick={() => setIsAddingCoverage(false)} className="px-3 py-2.5 text-gray-400 hover:text-gray-600 text-xs transition-colors">取消</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </SectionCard>
                                    </motion.div>
                                )}

                                {/* ═══ TAB: 核保决策 ═══ */}
                                {activeSection === 'decision' && (
                                    <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        {/* Left: Date & Payment */}
                                        <SectionCard title="保险期间与收款" icon="📅" index={0}>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FieldInput label="保险起期" value={effectiveDate} onChange={setEffectiveDate} type="date" />
                                                    <FieldInput label="保险止期" value={expiryDate} onChange={setExpiryDate} type="date" />
                                                </div>

                                                {/* Total Premium Summary */}
                                                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-600 font-medium">保单总保费</span>
                                                        <span className="text-2xl font-bold text-emerald-700 font-mono">
                                                            ¥{totalPremium.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">= 各险种保费逐项合计（承保方案页可调整）</p>
                                                </div>

                                                <div className="h-px bg-gray-100" />

                                                {/* Payment Link - Updated with Account Info & Generation */}
                                                <div>
                                                    <div className="flex justify-between items-end mb-2">
                                                        <label className="block text-xs font-semibold text-emerald-700">💳 收款链接</label>
                                                        <span className="text-xs text-gray-500 font-mono">收款账号: H15348806977</span>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <input
                                                            type="url"
                                                            placeholder="点击右侧按钮生成或手动粘贴..."
                                                            className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                                                            value={paymentLink}
                                                            onChange={e => setPaymentLink(e.target.value)}
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                if (totalPremium <= 0) { alert("请先确认保费金额大于0"); return; }

                                                                // ── 根据能源类型判断车辆类别 ──
                                                                const energyType = (vehicle?.energy_type || "").toLowerCase();
                                                                const isNewEnergy = energyType.includes("电") || energyType.includes("混合") || energyType.includes("纯电") || energyType.includes("插电") || energyType.includes("new") || energyType.includes("ev") || energyType.includes("新能源");
                                                                const vehicleCategory = isNewEnergy ? "新能源汽车" : "机动车";
                                                                const composedName = `中国人寿财险${vehicleCategory}商业保险`;

                                                                if (!confirm(`商品名称: ${composedName}\n金额: ¥${totalPremium.toFixed(2)}\n收款账号: H15348806977\n\n确认生成收款链接?`)) return;

                                                                try {
                                                                    const res = await fetch(`${API_BASE}/payment/generate`, {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({
                                                                            productName: composedName,
                                                                            amount: totalPremium
                                                                        })
                                                                    });
                                                                    const json = await res.json() as any;
                                                                    if (json.success && (json.paymentLink || json.payment_link)) {
                                                                        const link = json.paymentLink || json.payment_link;
                                                                        setPaymentLink(link);
                                                                        alert(`✅ 收款链接已自动填入!\n\n${link}`);
                                                                    } else {
                                                                        alert("生成失败: " + (json.error || "未知错误") + "\n\n请手动从汇来通后台复制链接粘贴");
                                                                    }
                                                                } catch (e) {
                                                                    alert("网络错误，请手动粘贴链接");
                                                                    console.error(e);
                                                                }
                                                            }}
                                                            className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
                                                        >
                                                            ⚡️ 生成链接
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <a
                                                            href="https://user.huilaitongpay.com/main"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                                                        >
                                                            🔗 打开核心收银台后台
                                                        </a>
                                                        <span className="text-xs text-gray-400">账号: H15348806977 → 商户管理 → 复制收款链接粘贴到上方</span>
                                                    </div>

                                                    <p className="text-xs text-gray-400 mt-1.5">
                                                        客户在 <span className="font-mono text-emerald-600">chinalife-shie-xinhexin.pages.dev</span> 可看到"前往支付"按钮跳转到此链接
                                                    </p>
                                                </div>
                                            </div>
                                        </SectionCard>

                                        {/* Right: Actions */}
                                        <SectionCard title="核保裁决" icon="⚖️" index={1}>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">风险评级</label>
                                                    <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                                                        value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
                                                        <option value="LOW">🟢 低风险</option>
                                                        <option value="MEDIUM">🟡 中风险</option>
                                                        <option value="HIGH">🔴 高风险</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">核保意见</label>
                                                    <textarea
                                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all resize-none h-24"
                                                        placeholder="请输入本次核保决策依据与意见…"
                                                        value={riskReason}
                                                        onChange={e => setRiskReason(e.target.value)}
                                                    />
                                                </div>

                                                <div className="h-px bg-gray-100" />

                                                {/* Action Buttons based on Status */}
                                                {!['COMPLETED', 'REJECTED'].includes(detail?.proposal?.proposal_status || '') && (
                                                    <div className="space-y-3">
                                                        {/* Default: Underwriting Decision */}
                                                        {(!detail?.proposal?.proposal_status || detail.proposal.proposal_status === 'SUBMITTED') && (
                                                            <button onClick={() => setCeremonyOpen(true)}
                                                                className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-lg text-sm shadow-sm hover:bg-emerald-700 hover:shadow-md active:scale-[0.99] transition-all duration-200">
                                                                进入最终签署仪式
                                                            </button>
                                                        )}

                                                        {/* Mark Paid (if Confirmed) */}
                                                        {detail?.proposal?.proposal_status === 'UNDERWRITING_CONFIRMED' && (
                                                            <div className="space-y-2">
                                                                <div className="p-3 bg-emerald-50 rounded-lg text-xs text-emerald-700 border border-emerald-100">
                                                                    ✅ 核保已通过，等待客户支付。如客户线下支付，可手动标记。
                                                                </div>
                                                                <button onClick={() => handleLifecycleUpdate('PAID')}
                                                                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg text-sm shadow-sm hover:bg-indigo-700 transition-all">
                                                                    标记为已支付
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Mark Completed (if Paid) */}
                                                        {(detail?.proposal?.proposal_status === 'PAID' || detail?.proposal?.proposal_status === 'POLICY_ISSUED') && (
                                                            <div className="space-y-2">
                                                                <div className="p-3 bg-purple-50 rounded-lg text-xs text-purple-700 border border-purple-100">
                                                                    🎉 保费已到账。请确认保单归档。
                                                                </div>
                                                                <button onClick={() => handleLifecycleUpdate('COMPLETED')}
                                                                    className="w-full py-3 bg-gray-800 text-white font-semibold rounded-lg text-sm shadow-sm hover:bg-gray-900 transition-all">
                                                                    归档 (流程结束)
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </SectionCard>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                ) : (
                    <div className="flex items-center justify-center py-32 text-gray-400">请选择一个申请查看详情</div>
                )}
            </main>

            <Footer />

            {/* ════════ Success / QR Modal ════════ */}
            <AnimatePresence>
                {successModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden text-center p-8"
                        >
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                                🎉
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">核保通过</h3>
                            <p className="text-sm text-gray-500 mb-6">请向客户出示此二维码或验证码</p>

                            <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
                                {successData.qr && (
                                    <div className="flex justify-center mb-4">
                                        <img src={successData.qr} alt="Auth QR" className="w-48 h-48 rounded-lg shadow-sm border border-gray-200" />
                                    </div>
                                )}
                                <div className="text-sm text-gray-400 mb-1">客户验证码</div>
                                <div className="text-2xl font-mono font-bold text-emerald-600 tracking-wider select-all cursor-text">
                                    {successData.code}
                                </div>
                            </div>

                            <button
                                onClick={() => setSuccessModalOpen(false)}
                                className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-black transition-colors"
                            >
                                完成
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ════════ Decision Ceremony Modal ════════ */}
            <AnimatePresence>
                {ceremonyOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    ⚖️ 最终核保裁决
                                </h3>
                                <button onClick={() => setCeremonyOpen(false)} className="text-white/80 hover:text-white text-xl transition-colors">×</button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Accept / Reject Toggle */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setAcceptance('ACCEPT')}
                                        className={`py-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 ${acceptance === 'ACCEPT'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                                        ✓ 予以承保
                                    </button>
                                    <button onClick={() => setAcceptance('REJECT')}
                                        className={`py-3 rounded-lg font-semibold text-sm transition-all duration-200 border-2 ${acceptance === 'REJECT'
                                            ? 'border-red-400 bg-red-50 text-red-600'
                                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                                        ✕ 拒绝承保
                                    </button>
                                </div>

                                {/* Summary */}
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500">总保费</span><span className="font-bold text-emerald-700">¥{totalPremium.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">保险期间</span><span className="text-gray-700">{effectiveDate} ~ {expiryDate}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">风险评级</span><span className="text-gray-700">{riskLevel === 'LOW' ? '🟢 低风险' : riskLevel === 'MEDIUM' ? '🟡 中风险' : '🔴 高风险'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">收款链接</span><span className="text-gray-700 truncate max-w-[180px]">{paymentLink || '未设置'}</span></div>
                                </div>

                                {riskReason && (
                                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                                        <span className="font-medium text-gray-600">核保意见：</span>{riskReason}
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-100">
                                <button onClick={() => setCeremonyOpen(false)}
                                    className="flex-1 py-2.5 text-gray-500 font-medium text-sm hover:bg-gray-200 rounded-lg transition-colors duration-200">取消</button>
                                <button onClick={handleCeremonySubmit} disabled={processing}
                                    className="flex-1 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-400 transition-all duration-200 shadow-sm">
                                    {processing ? '签署中…' : '确认并签署'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UnderwritingDetail;
