import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <div>版权所有© 2023 中国人寿财产保险股份有限公司</div>
                <div>
                    Copyright © 2023 China Life Property &amp; Casualty Insurance Company
                    Limited.All rights reserved.
                </div>
                <div className="site-footer-records">
                    <span>京ICP备12041987号</span>
                    <span className="site-footer-sep" aria-hidden="true" />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        京公网安备 11010202010565号
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
