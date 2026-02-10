import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-white border-b border-slate-100 py-3 px-6">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img
                        src="/logo-a.png"
                        alt="人寿 Logo"
                        className="h-10 w-auto"
                    />
                    <div>
                        <h1 className="text-lg font-bold text-emerald-700 tracking-wide">人寿核保保全工作台</h1>
                        <p className="text-xs text-slate-400">Underwriting & Policy Service Platform</p>
                    </div>
                </div>
                <button className="btn-primary">退出登录</button>
            </div>
        </header>
    );
};

export default Header;
