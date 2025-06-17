import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../hooks/useAuth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Download,
  Map,
  BarChart3,
  Filter,
  Calendar,
  Printer,
  FileSpreadsheet,
  RefreshCcw,
  Building2
} from 'lucide-react';

// Fixing Leaflet icon issue
const markerIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Reusable Components
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ variant = "primary", className = "", children, ...props }) => {
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
    ghost: "hover:bg-gray-50 text-gray-700"
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center
        px-4 py-2 rounded-lg
        font-medium text-sm
        transition duration-150 ease-in-out
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// Map Component
const MapView = ({ wasteBanks }) => {
  const defaultCenter = [-6.200000, 106.816666]; // Default to Jakarta

  return (
    <div className="h-[600px] rounded-lg overflow-hidden">
      <MapContainer 
        center={defaultCenter}
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
      >
        {() => (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {wasteBanks.map(bank => 
              bank.coordinates && (
                <Marker
                  key={bank.id}
                  position={[bank.coordinates.latitude, bank.coordinates.longitude]}
                  icon={markerIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-lg mb-1">{bank.name}</h3>
                      <p className="text-gray-600 mb-2">{bank.address}</p>
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <Building2 size={14} />
                        Capacity: {bank.capacity} tons
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
};

// Analytics Component
const AnalyticsView = ({ wasteBanks }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-gray-900">Waste Bank Analytics</h3>
    
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Capacity Distribution</h4>
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Analytics charts will be implemented here</p>
      </div>
    </div>

    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3">Regional Distribution</h4>
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Distribution charts will be implemented here</p>
      </div>
    </div>
  </div>
);

// Main Component
const Reports = () => {
  const { userData } = useAuth();
  const [wasteBanks, setWasteBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('map');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchWasteBanks();
  }, []);

  const fetchWasteBanks = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'wasteBanks'));
      const banks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWasteBanks(banks);
    } catch (error) {
      console.error("Error fetching waste banks:", error);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar 
        role={userData?.role} 
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />
      
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-72'}`}
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Location Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and analyze waste bank distribution
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" className="gap-2">
              <Calendar size={18} />
              Select Date
            </Button>
            <Button className="gap-2">
              <Download size={18} />
              Export Report
            </Button>
          </div>
        </div>

        {/* Control Panel */}
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant={activeView === 'map' ? 'primary' : 'ghost'}
                onClick={() => setActiveView('map')}
                className="gap-2"
              >
                <Map size={18} />
                Map View
              </Button>
              <Button 
                variant={activeView === 'analytics' ? 'primary' : 'ghost'}
                onClick={() => setActiveView('analytics')}
                className="gap-2"
              >
                <BarChart3 size={18} />
                Analytics
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="secondary" className="gap-2">
                <Filter size={18} />
                Filter
              </Button>
              <Button variant="secondary" className="gap-2">
                <Printer size={18} />
                Print
              </Button>
              <Button variant="secondary" className="gap-2">
                <FileSpreadsheet size={18} />
                Export Excel
              </Button>
              <Button variant="secondary" className="gap-2" onClick={fetchWasteBanks}>
                <RefreshCcw size={18} />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Main Content */}
        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            {activeView === 'map' ? (
              <MapView wasteBanks={wasteBanks} />
            ) : (
              <AnalyticsView wasteBanks={wasteBanks} />
            )}
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Locations</h3>
            <div className="text-2xl font-semibold text-gray-900">{wasteBanks.length}</div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Capacity</h3>
            <div className="text-2xl font-semibold text-gray-900">
              {wasteBanks.reduce((acc, bank) => acc + (bank.capacity || 0), 0).toFixed(2)} tons
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Average Capacity</h3>
            <div className="text-2xl font-semibold text-gray-900">
              {(wasteBanks.reduce((acc, bank) => acc + (bank.capacity || 0), 0) / wasteBanks.length || 0).toFixed(2)} tons
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;