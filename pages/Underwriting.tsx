import React, { useEffect, useState } from 'react';

export interface ApplicationItem {
  applicationNo: string;
  status: string;
  applyAt?: string;
  policyNo?: string;
}

const Underwriting: React.FC = () => {
  const [list, setList] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          'https://xinhexin-api.chinalife-shiexinhexin.workers.dev/api/application/list'
        );
        const data = (await res.json()) as ApplicationItem[];
        setList(data);
      } catch (e) {
        console.error(e);
        setError('获取投保单列表失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-xl font-bold text-slate-800 mb-6">核保工作台</h1>

      {loading && <div className="text-slate-500">加载中…</div>}
      {error && <div className="text-rose-600">{error}</div>}

      {!loading && !error && (
        <table className="min-w-full text-sm border border-slate-200 bg-white">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 border">投保单号</th>
              <th className="px-3 py-2 border">状态</th>
              <th className="px-3 py-2 border">提交时间</th>
              <th className="px-3 py-2 border">保单号</th>
            </tr>
          </thead>
          <tbody>
            {list.map(item => (
              <tr key={item.applicationNo}>
                <td className="px-3 py-2 border">{item.applicationNo}</td>
                <td className="px-3 py-2 border">{item.status}</td>
                <td className="px-3 py-2 border">{item.applyAt || '-'}</td>
                <td className="px-3 py-2 border">{item.policyNo || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Underwriting;
