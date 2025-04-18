// src/pages/dashboard/super_admin/Users.jsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../components/Sidebar';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Phone,
  Building2,
  MapPin,
  Eye,
  EyeOff,
  Search,
  Users as UsersIcon,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Calendar,
  UserCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

// Constants
// Constants
const ROLES = {
  super_admin: "Super Admin",
  customer: "Customer",
  collector: "Collector",
  wastebank_master: "Wastebank Employee",
  wastebank_admin: "Wastebank Admin",
  industry: "Industry",
  government: "Government",
  marketplace: "Marketplace",
  wastebank_master_collector: "Wastebank Master Collector",
};


const ROLE_COLORS = {
  super_admin: "bg-rose-100 text-rose-700",
  customer: "bg-sky-100 text-sky-700",
  collector: "bg-amber-100 text-amber-700",
  wastebank_master: "bg-purple-100 text-purple-700",
  wastebank_admin: "bg-emerald-100 text-emerald-700", 
  industry: "bg-blue-100 text-blue-700",
  government: "bg-indigo-100 text-indigo-700",
  wastebank_master_collector: "bg-teal-100 text-teal-700",
  marketplace: "bg-gray-100 text-gray-700",
};

const ROLE_DESCRIPTIONS = {
  super_admin: "Manage all aspects of the system and oversee all users.",
  customer: "Manage your household waste and earn rewards",
  collector: "Collect and transport waste efficiently from small wastebank",
  wastebank_master: "Bank sampah induk",
  wastebank_admin: "Oversee waste bank operations",
  industry: "Access recycling materials and manage sustainability",
  government: "Monitor and analyze environmental impact",
  marketplace: "Marketplace for buying and selling waste products",
  wastebank_master_collector: "Collector for waste bank induk",
};

// Reusable Components
const Input = ({ icon: Icon, className = "", ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500" size={18} />
    )}
    <input
      className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 bg-white
      text-gray-700 text-sm rounded-lg
      border border-gray-200 
      focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
      placeholder:text-gray-400
      transition duration-150 ease-in-out
      ${className}`}
      {...props}
    />
  </div>
);

const Select = ({ className = "", ...props }) => (
  <select
    className={`w-full px-4 py-2.5 bg-white text-gray-700 text-sm rounded-lg
    border border-gray-200
    focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
    transition duration-150 ease-in-out
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
    primary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm",
    danger: "bg-red-50 hover:bg-red-100 text-red-700",
    ghost: "hover:bg-gray-50 text-gray-700"
  };

  const sizes = {
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-4 py-2.5",
    lg: "px-6 py-3"
  };

  return (
    <button
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition duration-150 ease-in-out
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

const Card = ({ className = "", ...props }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}
    {...props}
  />
);

const Badge = ({ variant = "default", children, className = "", ...props }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700"
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

const Label = ({ className = "", children, ...props }) => (
  <label
    className={`block text-sm font-medium text-gray-700 mb-1.5 ${className}`}
    {...props}
  >
    {children}
  </label>
);

const FormGroup = ({ className = "", children, ...props }) => (
  <div className={`space-y-1.5 ${className}`} {...props}>
    {children}
  </div>
);

// Main Component
const Users = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'customer',
    institution: '',
    address: '',
    city: '',
    province: ''
  });

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setUsers(usersList);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch users.',
        background: '#fff5f5',
        iconColor: '#d33'
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  // Create user with improved validation
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (newUser.password.length < 6) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Password',
        text: 'Password must be at least 6 characters long',
        background: '#fff5f5',
        iconColor: '#d33'
      });
      setLoading(false);
      return;
    }

    try {
      const { user } = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      
      const userData = {
        email: newUser.email,
        fullName: newUser.fullName,
        phone: newUser.phone,
        role: newUser.role,
        institution: newUser.institution,
        address: newUser.address,
        city: newUser.city,
        province: newUser.province,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User created successfully',
        background: '#f0fff4',
        iconColor: '#059669',
        timer: 1500,
        showConfirmButton: false
      });

      setNewUser({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: 'customer',
        institution: '',
        address: '',
        city: '',
        province: ''
      });
      setShowCreateForm(false);
      fetchUsers();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        background: '#fff5f5',
        iconColor: '#d33'
      });
    }
    setLoading(false);
  };

  const handleUpdateUser = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        institution: user.institution,
        address: user.address,
        city: user.city,
        province: user.province
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User updated successfully',
        background: '#f0fff4',
        iconColor: '#059669',
        timer: 1500,
        showConfirmButton: false
      });

      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        background: '#fff5f5',
        iconColor: '#d33'
      });
    }
  };

  const handleDeleteUser = async (userId) => {
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
        await deleteDoc(doc(db, 'users', userId));
        
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'User has been deleted.',
          background: '#f0fff4',
          iconColor: '#059669',
          timer: 1500,
          showConfirmButton: false
        });
        
        fetchUsers();
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message,
          background: '#fff5f5',
          iconColor: '#d33'
        });
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ROLES[user.role]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        role={userData?.role} 
        onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
      />

      <main className={`flex-1 transition-all duration-300 ease-in-out
        ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="p-8">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <UsersIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage and monitor user accounts
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="shadow-sm"
            >
              <UserPlus size={18} className="mr-2" />
              {showCreateForm ? 'Cancel' : 'Add New User'}
            </Button>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {users.length}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Customers</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {users.filter(u => u.role === 'customer').length}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <UserCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Collectors</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {users.filter(u => u.role === 'collector').length}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Building2 className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Industries</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {users.filter(u => u.role === 'industry').length}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg 
                  focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
                  text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Create User Form */}
          {showCreateForm && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New User</h2>
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormGroup>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      name="email"
                      required
                      value={newUser.email}
                      onChange={handleNewUserChange}
                      placeholder="Enter email address"
                      icon={Mail}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        value={newUser.password}
                        onChange={handleNewUserChange}
                        placeholder="Enter password"
                        icon={Lock}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 
                          hover:text-gray-500 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </FormGroup>

                  <FormGroup>
                    <Label>Full Name</Label>
                    <Input
                      type="text"
                      name="fullName"
                      required
                      value={newUser.fullName}
                      onChange={handleNewUserChange}
                      placeholder="Enter full name"
                      icon={User}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      name="phone"
                      value={newUser.phone}
                      onChange={handleNewUserChange}
                      placeholder="Enter phone number"
                      icon={Phone}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>User Role</Label>
                    <Select
                      name="role"
                      value={newUser.role}
                      onChange={handleNewUserChange}
                    >
                      {Object.entries(ROLES).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </Select>
                    <p className="mt-1.5 text-sm text-gray-500">{ROLE_DESCRIPTIONS[newUser.role]}</p>
                  </FormGroup>

                  <FormGroup>
                    <Label>Institution/Company</Label>
                    <Input
                      type="text"
                      name="institution"
                      value={newUser.institution}
                      onChange={handleNewUserChange}
                      placeholder="Enter institution or company name"
                      icon={Building2}
                    />
                  </FormGroup>

                  <FormGroup className="md:col-span-2">
                    <Label>Address</Label>
                    <Input
                      type="text"
                      name="address"
                      value={newUser.address}
                      onChange={handleNewUserChange}
                      placeholder="Enter complete address"
                      icon={MapPin}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>City</Label>
                    <Input
                      type="text"
                      name="city"
                      value={newUser.city}
                      onChange={handleNewUserChange}
                      placeholder="Enter city"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Province</Label>
                    <Input
                      type="text"
                      name="province"
                      value={newUser.province}
                      onChange={handleNewUserChange}
                      placeholder="Enter province"
                    />
                  </FormGroup>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={loading}
                  >
                    Create User
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Users Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role & Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact & Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center text-gray-500 space-x-3">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Loading users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          {editingUser?.id === user.id ? (
                            <Input
                              type="text"
                              value={editingUser.fullName}
                              onChange={(e) => setEditingUser({...editingUser, fullName: e.target.value})}
                              placeholder="Enter full name"
                            />
                          ) : (
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                  <span className="text-emerald-600 font-medium">
                                    {user.fullName?.charAt(0) || user.email?.charAt(0) || '?'}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUser?.id === user.id ? (
                            <Select
                              value={editingUser.role}
                              onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                            >
                              {Object.entries(ROLES).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                              ))}
                            </Select>
                          ) : (
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                                {ROLES[user.role]}
                              </span>
                              {user.institution && (
                                <div className="text-sm text-gray-500 mt-1">{user.institution}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUser?.id === user.id ? (
                            <div className="space-y-2">
                              <Input
                                type="tel"
                                value={editingUser.phone || ''}
                                onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                                placeholder="Phone number"
                                icon={Phone}
                              />
                              <Input
                                type="text"
                                value={editingUser.address || ''}
                                onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                                placeholder="Address"
                                icon={MapPin}
                              />
                            </div>
                          ) : (
                            <div>
                              {user.phone && (
                                <div className="flex items-center text-sm text-gray-500 mb-1">
                                  <Phone size={14} className="mr-1" />
                                  {user.phone}
                                </div>
                              )}
                              {user.address && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <MapPin size={14} className="mr-1" />
                                  {user.address}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar size={14} className="mr-1.5" />
                            {user.createdAt?.toLocaleDateString() || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="transition-all flex justify-end space-x-2">
                            {editingUser?.id === user.id ? (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleUpdateUser(editingUser)}
                                >
                                  <Save size={14} className="mr-1" />
                                  Save
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setEditingUser(null)}
                                >
                                  <X size={14} className="mr-1" />
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <Edit2 size={14} className="mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 size={14} className="mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Users;