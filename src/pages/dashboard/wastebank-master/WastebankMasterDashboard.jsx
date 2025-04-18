import React from 'react';
import { Building2, Trash2, Users } from 'lucide-react';
import Sidebar from '../../../components/Sidebar';

const WastebankMasterDashboard = () => {
  const stats = [
    {
      title: 'Total Waste Banks',
      value: '25',
      icon: <Building2 className="w-6 h-6 text-emerald-600" />,
      change: '+8%',
    },
    {
      title: 'Total Waste Collected',
      value: '12.5 tons',
      icon: <Trash2 className="w-6 h-6 text-blue-600" />,
      change: '+15%',
    },
    {
      title: 'Active Collectors',
      value: '48',
      icon: <Users className="w-6 h-6 text-purple-600" />,
      change: '+10%',
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="wastebank_master" />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Waste Bank Master Dashboard</h1>
          <p className="text-gray-600">Monitor and manage all waste banks in your network</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  {stat.icon}
                </div>
                <span className={`text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-2">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
            <p className="text-gray-600">Recent activity will be shown here...</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Overview</h2>
            <p className="text-gray-600">Performance metrics will be shown here...</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WastebankMasterDashboard;