import React, { useEffect, useState } from 'react';

interface Application {
  applicationNo: string;
  status: string;
  applyAt: string;
  policyNo: string | null;
}

const UnderwritingPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);

  const fetchApplications = async () => {
    try {
      //
      const response = await fetch('/api/application/list');
      const data = await response.json();
      if (Array.isArray(data)) {
        setApplications(data);
      }
    } catch (error) {
      console.error('获取投保单列表失败:', error);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (applicationNo: string) => {
    try {
      await fetch(`/api/application/${applicationNo}/approve`, { method: 'POST' });
      fetchApplications(); // Refresh the list
    } catch (error) {
      console.error('核保通过操作失败:', error);
    }
  };

  const handleReject = async (applicationNo: string) => {
    try {
      await fetch(`/api/application/${applicationNo}/reject`, { method: 'POST' });
      fetchApplications(); // Refresh the list
    } catch (error) {
      console.error('核保拒绝操作失败:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">核保工作台</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-1/3 text-left py-3 px-4 uppercase font-semibold text-sm">投保单号</th>
              <th className="w-1/3 text-left py-3 px-4 uppercase font-semibold text-sm">状态</th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">操作</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {applications.map((app) => (
              <tr key={app.applicationNo}>
                <td className="text-left py-3 px-4">{app.applicationNo}</td>
                <td className="text-left py-3 px-4">{app.status}</td>
                <td className="text-left py-3 px-4">
                  {app.status === 'APPLIED' && (
                    <>
                      <button
                        onClick={() => handleApprove(app.applicationNo)}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => handleReject(app.applicationNo)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                      >
                        拒绝
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UnderwritingPage;