import React from 'react';
import Logo from './Logo';

const Header: React.FC = () => {
    return (
        <header className="bg-white border-b border-slate-100 py-4 px-6">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Logo />
                    <div>
                        <h1 className="text-lg font-semibold text-slate-800">SHIE 人寿客户平台</h1>
                        <p className="text-xs text-slate-500">安全管理您的保障</p>
                    </div>
                </div>
                <button className="btn-primary">退出登录</button>
            </div>
        </header>
    );
};

export default Header;
