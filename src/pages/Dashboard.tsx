import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    const MenuCard: React.FC<{ title: string; desc: string; icon: string; path: string; color: string }> = ({ title, desc, icon, path, color }) => (
        <div
            onClick={() => navigate(path)}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
            <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header />
            <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">核保工作台</h1>
                <p className="text-slate-500 mb-8">欢迎回来，请选择您的工作内容</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MenuCard
                        title="开始核保工作"
                        desc="处理所有待审核的投保申请"
                        icon="⚡️"
                        path="/list/pending"
                        color="bg-emerald-100 text-emerald-600"
                    />
                    <MenuCard
                        title="待核保申请"
                        desc="查看并管理排队中的申请"
                        icon="📋"
                        path="/list/pending"
                        color="bg-blue-100 text-blue-600"
                    />
                    <MenuCard
                        title="核保历史记录"
                        desc="查阅已完成的核保案件"
                        icon="🗂️"
                        path="/list/history"
                        color="bg-purple-100 text-purple-600"
                    />
                    <MenuCard
                        title="打回 / 拒保"
                        desc="查看被驳回的投保申请"
                        icon="🚫"
                        path="/list/rejected"
                        color="bg-rose-100 text-rose-600"
                    />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Dashboard;
