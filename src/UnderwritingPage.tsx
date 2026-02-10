import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';

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
    sum_insured: number;
    rate: number;        // 费率 (e.g. 0.005 = 0.5%)
    premium: number;     // 单项保费 = sum_insured × rate
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
const UnderwritingPage: React.FC = () => {
    const [pendingList, setPendingList] = useState<Proposal[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
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
    const [newCoverage, setNewCoverage] = useState<Partial<CoverageItem>>({ coverage_name: "", sum_insured: 0, rate: 0.005 });
    const [isAddingCoverage, setIsAddingCoverage] = useState(false);

    // Active section tab for mobile
    const [activeSection, setActiveSection] = useState<'info' | 'coverage' | 'decision'>('info');

    /* ── Computed total premium ── */
    const totalPremium = useMemo(() => coverages.reduce((s, c) => s + (c.premium || 0), 0), [coverages]);

    useEffect(() => { fetchPending(); }, []);

    const fetchPending = async () => {
        try {
            const res = await fetch(`${API_BASE}/underwriting/pending`);
            const data = (await res.json()) as Proposal[];
            setPendingList(Array.isArray(data) ? data : []);
        } catch (e) { console.error("Failed to fetch pending", e); }
    };

    const selectProposal = async (id: string) => {
        setLoading(true);
        setSelectedId(id);
        try {
            const res = await fetch(`${API_BASE}/underwriting/detail?id=${id}`);
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
            if (data.coverage && Array.isArray(data.coverage) && data.coverage.length > 0) {
                const merged = data.coverage.map((c: any) => ({
                    coverage_id: c.coverage_id,
                    coverage_code: c.coverage_code || "MISC",
                    coverage_name: c.coverage_name || "未命名险种",
                    sum_insured: c.sum_insured || 0,
                    rate: c.rate || 0.005,
                    premium: (c.sum_insured || 0) * (c.rate || 0.005),
                    policy_effective_date: c.policy_effective_date
                }));
                setCoverages(merged);

                const first = data.coverage[0];
                setEffectiveDate(first?.policy_effective_date || new Date().toISOString().split('T')[0]);
                const eff = new Date(first?.policy_effective_date || Date.now());
                const exp = new Date(eff); exp.setFullYear(exp.getFullYear() + 1);
                setExpiryDate(exp.toISOString().split('T')[0]);
            } else if (pd?.coverages && Array.isArray(pd.coverages)) {
                // Fallback: use coverages from proposalData
                const merged = pd.coverages.filter((c: any) => c.selected !== false).map((c: any) => ({
                    coverage_code: c.type || "MISC",
                    coverage_name: c.name || "未命名险种",
                    sum_insured: c.amount || 0,
                    rate: 0.005,
                    premium: (c.amount || 0) * 0.005,
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
            // Auto-recalc premium
            next[index].premium = (next[index].sum_insured || 0) * (next[index].rate || 0);
            return next;
        });
    }, []);

    const removeCoverage = (index: number) => setCoverages(prev => prev.filter((_, i) => i !== index));

    const handleAddCoverage = () => {
        if (!newCoverage.coverage_name) { alert("请输入险种名称"); return; }
        const si = Number(newCoverage.sum_insured) || 0;
        const r = Number(newCoverage.rate) || 0.005;
        setCoverages(prev => [...prev, {
            coverage_code: "CUSTOM_" + Date.now(),
            coverage_name: newCoverage.coverage_name!,
            sum_insured: si,
            rate: r,
            premium: si * r,
            policy_effective_date: effectiveDate
        }]);
        setNewCoverage({ coverage_name: "", sum_insured: 0, rate: 0.005 });
        setIsAddingCoverage(false);
    };

    /* ── Submit ── */
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
                    finalPremium: totalPremium,
                    policyEffectiveDate: effectiveDate,
                    policyExpiryDate: expiryDate,
                },
                vehicleConfirmed: vehicle,
                paymentLink,
                coverages,
                updatedPersons: { owner, proposer, insured }
            };

            const resDec = await fetch(`${API_BASE}/underwriting/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(decisionPayload)
            });
            const jsonDec = (await resDec.json()) as { success: boolean; error?: string };
            if (!jsonDec.success) throw new Error(jsonDec.error || "Decision failed");

            if (acceptance === 'ACCEPT') {
                await fetch(`${API_BASE}/policy/issue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proposalId: detail.proposal.proposal_id })
                });
            }
            alert("核保完成！保单已签发。");
            setCeremonyOpen(false);
            fetchPending();
            setSelectedId(null);
        } catch (e) {
            alert("提交失败: " + (e instanceof Error ? e.message : "Unknown error"));
        } finally { setProcessing(false); }
    };

    /* ═══════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', Arial, sans-serif" }}>
            <Header />

            <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full">
                {selectedId ? (
                    /* ════════ DETAIL VIEW ════════ */
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">

                        {/* Top bar */}
                        <div className="flex items-center justify-between">
                            <button onClick={() => setSelectedId(null)}
                                className="text-gray-500 hover:text-emerald-700 font-medium flex items-center gap-1 text-sm transition-colors duration-200">
                                <span className="text-lg">←</span> 返回待处理列表
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-mono">#{selectedId}</span>
                                <span className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-md">核保处理中</span>
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
                                                            <th className="text-right px-4 py-3 font-semibold">保额（元）</th>
                                                            <th className="text-right px-4 py-3 font-semibold">费率</th>
                                                            <th className="text-right px-4 py-3 font-semibold">单项保费（元）</th>
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
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <input
                                                                            type="number"
                                                                            step="0.0001"
                                                                            className="bg-transparent border-b border-dashed border-gray-300 w-20 text-right font-mono outline-none focus:border-emerald-500 transition-colors"
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
                                                                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">暂无险种，请点击右上角"新增险种"添加</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    {coverages.length > 0 && (
                                                        <tfoot>
                                                            <tr className="border-t-2 border-emerald-100">
                                                                <td colSpan={3} className="px-4 py-4 text-right text-sm font-semibold text-gray-600">保单总保费合计</td>
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
                                                                    <FieldInput label="保额（元）" value={newCoverage.sum_insured || 0} onChange={v => setNewCoverage(p => ({ ...p, sum_insured: Number(v) }))} type="number" />
                                                                </div>
                                                                <div className="w-28">
                                                                    <FieldInput label="费率" value={newCoverage.rate || 0.005} onChange={v => setNewCoverage(p => ({ ...p, rate: Number(v) }))} type="number" />
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

                                                {/* Payment Link */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-emerald-700 mb-1.5">💳 收款链接</label>
                                                    <input
                                                        type="url"
                                                        placeholder="粘贴收款台链接（如微信/支付宝收款链接）"
                                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                                                        value={paymentLink}
                                                        onChange={e => setPaymentLink(e.target.value)}
                                                    />
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

                                                <button onClick={() => setCeremonyOpen(true)}
                                                    className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-lg text-sm shadow-sm hover:bg-emerald-700 hover:shadow-md active:scale-[0.99] transition-all duration-200">
                                                    进入最终签署仪式
                                                </button>
                                            </div>
                                        </SectionCard>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                ) : (
                    /* ════════ PENDING LIST ════════ */
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">待处理投保申请</h2>
                                <p className="text-sm text-gray-400 mt-0.5">共 {pendingList.length} 件待核保</p>
                            </div>
                            <button onClick={fetchPending}
                                className="text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium border border-emerald-100">
                                ↻ 刷新列表
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-emerald-50/50 border-b border-gray-100">
                                    <tr className="text-xs text-gray-500 uppercase">
                                        <th className="text-left px-6 py-4 font-semibold">投保单号</th>
                                        <th className="text-left px-6 py-4 font-semibold">申请时间</th>
                                        <th className="text-left px-6 py-4 font-semibold">车辆信息</th>
                                        <th className="text-left px-6 py-4 font-semibold">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pendingList.map((item, i) => (
                                        <motion.tr
                                            key={item.proposal_id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04, duration: 0.25 }}
                                            onClick={() => selectProposal(item.proposal_id)}
                                            className="hover:bg-emerald-50/40 transition-colors duration-150 cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-mono text-sm font-medium text-gray-700 group-hover:text-emerald-700 transition-colors">{item.proposal_id}</td>
                                            <td className="px-6 py-4 text-gray-500">{new Date(item.application_submitted_at || item.created_at).toLocaleString('zh-CN')}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-800">{item.plate_number || '未上牌'}</div>
                                                <div className="text-xs text-gray-400">{item.brand_model || item.vehicle_type || '待识别车型'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md text-xs font-semibold group-hover:bg-emerald-100 transition-colors duration-150">
                                                    处理 →
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    {pendingList.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                    <div className="text-3xl opacity-40">☕️</div>
                                                    <p className="text-sm">暂无待处理投保申请</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </main>

            <Footer />

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

export default UnderwritingPage;
