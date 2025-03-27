// src/pages/dashboard/wastebank_admin/WastebankAdmin.jsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  GeoPoint,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import {
  Building2,
  Trash2,
  Edit2,
  Save,
  X,
  Search,
  PlusCircle,
  MapPin,
  Loader2
} from 'lucide-react';
import Swal from 'sweetalert2';

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
    success: "bg-emerald-500 hover:bg-emerald-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    ghost: "bg-red-500 text-zinc-700"
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

const Table = ({ children, className = "", ...props }) => (
  <div className="overflow-x-auto">
    <table className={`w-full ${className}`} {...props}>
      {children}
    </table>
  </div>
);

const TableHeader = ({ children, className = "", ...props }) => (
  <th
    className={`px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider ${className}`}
    {...props}
  >
    {children}
  </th>
);

const TableCell = ({ children, className = "", ...props }) => (
  <td
    className={`px-6 py-4 text-sm text-zinc-700 ${className}`}
    {...props}
  >
    {children}
  </td>
);

const Badge = ({ variant = "default", children, className = "", ...props }) => {
  const variants = {
    default: "bg-zinc-100 text-zinc-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-emerald-100 text-emerald-700"
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

export default function WastebankAdmin() {
  const { userData } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [wastebanks, setWastebanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBank, setEditingBank] = useState(null);
  const [industryList, setIndustryList] = useState([]);
  const [governmentList, setGovernmentList] = useState([]);

  const [newBank, setNewBank] = useState({
    name: '',
    adminName: '',
    address: '',
    city: '',
    province: '',
    latitude: '',
    longitude: '',
    capacity: '',
    industry: '',
    governmentRelation: ''
  });

  useEffect(() => {
    Promise.all([
      fetchGovernment(),
      fetchIndustry(),
      fetchWastebanks()
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

  const fetchWastebanks = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'wasteBanks'));
      const banks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWastebanks(banks);
    } catch (err) {
      setError('Failed to fetch wastebanks: ' + err.message);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch wastebanks: ' + err.message,
        background: '#fff5f5',
        iconColor: '#d33'
      });
    }
    setLoading(false);
  };

  const handleNewBankChange = (e) => {
    const { name, value } = e.target;
    setNewBank(prev => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewBank(prev => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }));
        },
        (err) => {
          setError('Failed to get current location: ' + err.message);
          Swal.fire({
            icon: 'error',
            title: 'Location Error',
            text: 'Failed to get current location: ' + err.message,
            background: '#fff5f5',
            iconColor: '#d33'
          });
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await addDoc(collection(db, 'wasteBanks'), {
        name: newBank.name,
        adminName: newBank.adminName,
        address: newBank.address,
        city: newBank.city,
        province: newBank.province,
        coordinates: (newBank.latitude && newBank.longitude)
          ? new GeoPoint(parseFloat(newBank.latitude), parseFloat(newBank.longitude))
          : null,
        capacity: newBank.capacity ? parseFloat(newBank.capacity) : 0,
        industry: newBank.industry,
        governmentRelation: newBank.governmentRelation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSuccess('Wastebank created successfully');
      fetchWastebanks();
      setNewBank({
        name: '',
        adminName: '',
        address: '',
        city: '',
        province: '',
        latitude: '',
        longitude: '',
        capacity: '',
        industry: '',
        governmentRelation: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create wastebank: ' + err.message);
      Swal.fire({
        icon: 'error',
        title: 'Create Error',
        text: 'Failed to create wastebank: ' + err.message,
        background: '#fff5f5',
        iconColor: '#d33'
      });
    }
    setLoading(false);
  };

  const handleUpdateBank = async (bank) => {
    setError('');
    setSuccess('');
    try {
      await updateDoc(doc(db, 'wasteBanks', bank.id), {
        name: bank.name,
        adminName: bank.adminName,
        address: bank.address,
        city: bank.city,
        province: bank.province,
        coordinates: (bank.latitude && bank.longitude)
          ? new GeoPoint(parseFloat(bank.latitude), parseFloat(bank.longitude))
          : null,
        capacity: bank.capacity ? parseFloat(bank.capacity) : 0,
        industry: bank.industry,
        governmentRelation: bank.governmentRelation,
        updatedAt: serverTimestamp()
      });
      setSuccess('Wastebank updated successfully');
      setEditingBank(null);
      fetchWastebanks();
    } catch (err) {
      setError('Failed to update wastebank: ' + err.message);
      Swal.fire({
        icon: 'error',
        title: 'Update Error',
        text: 'Failed to update wastebank: ' + err.message,
        background: '#fff5f5',
        iconColor: '#d33'
      });
    }
  };

  const handleDeleteBank = async (bankId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'wasteBanks', bankId));
        setSuccess('Wastebank deleted successfully');
        fetchWastebanks();
      } catch (err) {
        setError('Failed to delete wastebank: ' + err.message);
        Swal.fire({
          icon: 'error',
          title: 'Delete Error',
          text: 'Failed to delete wastebank: ' + err.message,
          background: '#fff5f5',
          iconColor: '#d33'
        });
      }
    }
  };

  const startEditing = (bank) => {
    setEditingBank({
      ...bank,
      latitude: bank.coordinates ? bank.coordinates.latitude : '',
      longitude: bank.coordinates ? bank.coordinates.longitude : ''
    });
  };

  const cancelEditing = () => {
    setEditingBank(null);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingBank(prev => ({ ...prev, [name]: value }));
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingBank) return;
    await handleUpdateBank(editingBank);
  };

  const filteredBanks = wastebanks.filter(bank =>
    bank.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.province?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-zinc-50/40">
      <Sidebar
        role={userData?.role}
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} p-8`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200">
              <Building2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-800">Wastebank Management</h1>
              <p className="text-sm text-zinc-500 mt-1">Manage and monitor waste bank operations</p>
            </div>
          </div>
          
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant="primary"
            className="shadow-sm"
          >
            <PlusCircle size={18} className="mr-2" />
            {showCreateForm ? 'Cancel' : 'Add New Wastebank'}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <Input
              type="text"
              placeholder="Search wastebanks by name, address, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
            <p className="text-sm text-emerald-600">{success}</p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold text-zinc-800 mb-6">Create New Wastebank</h2>
            <form onSubmit={handleCreateBank} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Wastebank Name</Label>
                <Input
                  type="text"
                  name="name"
                  required
                  value={newBank.name}
                  onChange={handleNewBankChange}
                  placeholder="Enter wastebank name"
                />
              </div>

              <div>
                <Label>Admin Name</Label>
                <Input
                  type="text"
                  name="adminName"
                  required
                  value={newBank.adminName}
                  onChange={handleNewBankChange}
                  placeholder="Enter admin name"
                />
              </div>

              <div>
                <Label>Address</Label>
                <Input
                  type="text"
                  name="address"
                  required
                  value={newBank.address}
                  onChange={handleNewBankChange}
                  placeholder="Enter complete address"
                />
              </div>

              <div>
                <Label>City</Label>
                <Input
                  type="text"
                  name="city"
                  required
                  value={newBank.city}
                  onChange={handleNewBankChange}
                  placeholder="Enter city name"
                />
              </div>

              <div>
                <Label>Province</Label>
                <Input
                  type="text"
                  name="province"
                  required
                  value={newBank.province}
                  onChange={handleNewBankChange}
                  placeholder="Enter province name"
                />
              </div>

              <div>
                <Label>Capacity (tons)</Label>
                <Input
                  type="number"
                  step="any"
                  name="capacity"
                  required
                  value={newBank.capacity}
                  onChange={handleNewBankChange}
                  placeholder="Enter capacity in tons"
                />
              </div>

              <div>
                <Label>Industry Relation</Label>
                <Select
                  name="industry"
                  value={newBank.industry}
                  onChange={handleNewBankChange}
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
                  name="governmentRelation"
                  value={newBank.governmentRelation}
                  onChange={handleNewBankChange}
                >
                  <option value="">Select Government Partner</option>
                  {governmentList.map((gov) => (
                    <option key={gov.id} value={gov.id}>
                      {gov.fullName || gov.email}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    name="latitude"
                    required
                    value={newBank.latitude}
                    onChange={handleNewBankChange}
                    placeholder="e.g., -6.200000"
                  />
                </div>

                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    name="longitude"
                    required
                    value={newBank.longitude}
                    onChange={handleNewBankChange}
                    placeholder="e.g., 106.816666"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleGetLocation}
                  className="w-full"
                >
                  <MapPin size={18} className="mr-2" />
                  Get Current Location
                </Button>

                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full"
                >
                  {loading ? 'Creating...' : 'Create Wastebank'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Wastebanks Table */}
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-200">
                <TableHeader>Name</TableHeader>
                <TableHeader>Admin</TableHeader>
                <TableHeader>Address</TableHeader>
                <TableHeader>City</TableHeader>
                <TableHeader>Province</TableHeader>
                <TableHeader>Capacity</TableHeader>
                <TableHeader>Industry</TableHeader>
                <TableHeader>Government</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <TableCell colSpan="10" className="text-center">
                    <div className="flex items-center justify-center py-8 text-zinc-500">
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Loading wastebanks...
                    </div>
                  </TableCell>
                </tr>
              ) : filteredBanks.length === 0 ? (
                <tr>
                  <TableCell colSpan="10" className="text-center py-8 text-zinc-500">
                    No wastebanks found
                  </TableCell>
                </tr>
              ) : (
                filteredBanks.map((bank) => (
                  <tr key={bank.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <Input
                          type="text"
                          name="name"
                          value={editingBank.name || ''}
                          onChange={handleEditInputChange}
                          className="py-1"
                        />
                      ) : (
                        <span className="font-medium">{bank.name}</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <Input
                          type="text"
                          name="adminName"
                          value={editingBank.adminName || ''}
                          onChange={handleEditInputChange}
                          className="py-1"
                        />
                      ) : (
                        <Badge>{bank.adminName}</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <Input
                          type="text"
                          name="address"
                          value={editingBank.address || ''}
                          onChange={handleEditInputChange}
                          className="py-1"
                        />
                      ) : (
                        bank.address
                      )}
                    </TableCell>

                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <Input
                          type="text"
                          name="city"
                          value={editingBank.city || ''}
                          onChange={handleEditInputChange}
                          className="py-1"
                        />
                      ) : (
                        bank.city
                      )}
                    </TableCell>

                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <Input
                          type="text"
                          name="province"
                          value={editingBank.province || ''}
                          onChange={handleEditInputChange}
                          className="py-1"
                        />
                      ) : (
                        bank.province
                      )}
                    </TableCell>

                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <Input
                          type="number"
                          step="any"
                          name="capacity"
                          value={editingBank.capacity || 0}
                          onChange={handleEditInputChange}
                          className="py-1"
                        />
                      ) : (
                        <Badge variant="info">{bank.capacity} tons</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <Select
                          name="industry"
                          value={editingBank.industry || ''}
                          onChange={handleEditInputChange}
                          className="py-1"
                        >
                          <option value="">Select Industry</option>
                          {industryList.map((ind) => (
                            <option key={ind.id} value={ind.id}>
                              {ind.fullName || ind.email}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge variant="success">
                          {industryList.find(i => i.id === bank.industry)?.fullName ||
                           industryList.find(i => i.id === bank.industry)?.email ||
                           'Not assigned'}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <Select
                          name="governmentRelation"
                          value={editingBank.governmentRelation || ''}
                          onChange={handleEditInputChange}
                          className="py-1"
                        >
                          <option value="">Select Government</option>
                          {governmentList.map((gov) => (
                            <option key={gov.id} value={gov.id}>
                              {gov.fullName || gov.email}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge variant="warning">
                          {governmentList.find(g => g.id === bank.governmentRelation)?.fullName ||
                           governmentList.find(g => g.id === bank.governmentRelation)?.email ||
                           'Not assigned'}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingBank?.id === bank.id ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="any"
                            name="latitude"
                            value={editingBank.latitude || ''}
                            onChange={handleEditInputChange}
                            placeholder="Lat"
                            className="py-1"
                          />
                          <Input
                            type="number"
                            step="any"
                            name="longitude"
                            value={editingBank.longitude || ''}
                            onChange={handleEditInputChange}
                            placeholder="Lng"
                            className="py-1"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <MapPin size={14} className="text-zinc-400" />
                          <span className="text-sm">
                            {bank.coordinates
                              ? `${bank.coordinates.latitude.toFixed(4)}, ${bank.coordinates.longitude.toFixed(4)}`
                              : 'N/A'}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="transition-all">
                        {editingBank?.id === bank.id ? (
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={submitEdit}
                            >
                              <Save size={14} className="mr-1" />
                              Save
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              <X size={14} className="mr-1" />
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => startEditing(bank)}
                            >
                              <Edit2 size={14} className="mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteBank(bank.id)}
                            >
                              <Trash2 size={14} className="mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            Showing {filteredBanks.length} wastebanks
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={true}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={true}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Optional Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Total Capacity</h3>
            <div className="text-2xl font-semibold text-zinc-800">
              {wastebanks.reduce((acc, bank) => acc + (bank.capacity || 0), 0).toFixed(2)} tons
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Total Wastebanks</h3>
            <div className="text-2xl font-semibold text-zinc-800">
              {wastebanks.length}
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Connected Industries</h3>
            <div className="text-2xl font-semibold text-zinc-800">
              {new Set(wastebanks.map(bank => bank.industry).filter(Boolean)).size}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}