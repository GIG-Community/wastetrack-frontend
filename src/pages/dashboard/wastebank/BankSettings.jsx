// src/pages/wastebank/BankSettings.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Settings,
  Users,
  MapPin,
  Phone,
  Save,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { collection, doc, updateDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';

// Reusable Components
const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
    text-zinc-700 text-sm transition duration-200 ease-in-out
    placeholder:text-zinc-400
    focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}`}
    {...props}
  />
);

const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg 
    text-zinc-700 text-sm transition duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}`}
    {...props}
  />
);

const Label = ({ className = "", ...props }) => (
  <label
    className={`block text-sm font-medium text-zinc-700 mb-1 ${className}`}
    {...props}
  />
);

const Card = ({ className = "", ...props }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-zinc-200 ${className}`}
    {...props}
  />
);

const Button = ({ 
  variant = "primary", 
  size = "md",
  isLoading = false,
  className = "", 
  children, 
  ...props 
}) => {
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white",
    secondary: "bg-zinc-100 hover:bg-zinc-200 text-zinc-700",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  };

  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3"
  };

  return (
    <button
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {children}
    </button>
  );
};

const BankSettings = () => {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [industryList, setIndustryList] = useState([]);
  const [governmentList, setGovernmentList] = useState([]);

  const [settings, setSettings] = useState({
    name: '',
    adminName: '',
    capacity: 0,
    location: {
      address: '',
      city: '',
      province: '',
      coordinates: null
    },
    phone: '',
    industry: '',
    governmentRelation: ''
  });

  useEffect(() => {
    Promise.all([
      fetchBankSettings(),
      fetchGovernment(),
      fetchIndustry()
    ]).catch(console.error);
  }, []);

  const fetchGovernment = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'government'));
      const snap = await getDocs(q);
      const govs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGovernmentList(govs);
    } catch (err) {
      console.error('Error fetching government users:', err);
    }
  };

  const fetchIndustry = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'industry'));
      const snap = await getDocs(q);
      const inds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIndustryList(inds);
    } catch (err) {
      console.error('Error fetching industry users:', err);
    }
  };

  const fetchBankSettings = async () => {
    try {
      const bankDoc = await getDoc(doc(db, 'wasteBanks', 'YOUR_BANK_ID'));
      if (bankDoc.exists()) {
        setSettings(bankDoc.data());
      }
    } catch (error) {
      setError('Failed to load settings');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'wasteBanks', 'YOUR_BANK_ID'), settings);
      // Show success toast
    } catch (error) {
      setError('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-zinc-50/50">
        <Sidebar 
          role={userData?.role} 
          onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
        />
        <main className={`flex-1 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
        >
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar 
        role={userData?.role} 
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />
      
      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200">
              <Building2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Bank Settings</h1>
              <p className="text-sm text-zinc-500">Manage your waste bank settings and configurations</p>
            </div>
          </div>

          <div className="max-w-4xl space-y-6">
            {/* Basic Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="h-5 w-5 text-zinc-600" />
                <h2 className="text-lg font-semibold text-zinc-800">Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Bank Name</Label>
                  <Input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    placeholder="Enter bank name"
                  />
                </div>

                <div>
                  <Label>Admin Name</Label>
                  <Input
                    type="text"
                    value={settings.adminName}
                    onChange={(e) => setSettings({ ...settings, adminName: e.target.value })}
                    placeholder="Enter admin name"
                  />
                </div>

                <div>
                  <Label>Capacity (tons)</Label>
                  <Input
                    type="number"
                    value={settings.capacity}
                    onChange={(e) => setSettings({ ...settings, capacity: Number(e.target.value) })}
                    placeholder="Enter capacity in tons"
                  />
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </Card>

            {/* Location */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-5 w-5 text-zinc-600" />
                <h2 className="text-lg font-semibold text-zinc-800">Location</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    type="text"
                    value={settings.location.address}
                    onChange={(e) => setSettings({
                      ...settings,
                      location: { ...settings.location, address: e.target.value }
                    })}
                    placeholder="Enter complete address"
                  />
                </div>

                <div>
                  <Label>City</Label>
                  <Input
                    type="text"
                    value={settings.location.city}
                    onChange={(e) => setSettings({
                      ...settings,
                      location: { ...settings.location, city: e.target.value }
                    })}
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <Label>Province</Label>
                  <Input
                    type="text"
                    value={settings.location.province}
                    onChange={(e) => setSettings({
                      ...settings,
                      location: { ...settings.location, province: e.target.value }
                    })}
                    placeholder="Enter province"
                  />
                </div>
              </div>
            </Card>

            {/* Partners */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-5 w-5 text-zinc-600" />
                <h2 className="text-lg font-semibold text-zinc-800">Partners</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Industry Partner</Label>
                  <Select
                    value={settings.industry}
                    onChange={(e) => setSettings({ ...settings, industry: e.target.value })}
                  >
                    <option value="">Select Industry Partner</option>
                    {industryList.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.fullName || ind.email}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Government Relation</Label>
                  <Select
                    value={settings.governmentRelation}
                    onChange={(e) => setSettings({ ...settings, governmentRelation: e.target.value })}
                  >
                    <option value="">Select Government Partner</option>
                    {governmentList.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {gov.fullName || gov.email}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                isLoading={saving}
                className="w-full md:w-auto"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BankSettings;