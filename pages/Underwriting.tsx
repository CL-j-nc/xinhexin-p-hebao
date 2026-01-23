import React, { useState } from "react";

const API_BASE = "https://xinhexin-api.chinalife-shiexinhexin.workers.dev";

const Underwriting: React.FC = () => {
  const [policyId, setPolicyId] = useState("");
  const [verifyCode, setVerifyCode] = useState<string | null>(null);

  const handleApprove = async () => {
    const res = await fetch(`${API_BASE}/policy/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyId }),
    });

    const data = await res.json();
    setVerifyCode(data.verifyCode);
    alert(`客户验证码：${data.verifyCode}`);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">核保出单</h1>

      <input
        value={policyId}
        onChange={(e) => setPolicyId(e.target.value)}
        placeholder="Policy ID"
        className="border px-3 py-2 rounded w-full"
      />

      <button
        onClick={handleApprove}
        className="btn-primary w-full"
      >
        核保通过并生成验证码
      </button>

      {verifyCode && (
        <div className="text-sm text-green-600">
          当前验证码：{verifyCode}
        </div>
      )}
    </div>
  );
};

export default Underwriting;