import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Shield, Plus, Edit2, Trash2, Check, X, Users, AlertCircle } from 'lucide-react';

interface AdminPermissions {
  revenueManagement: boolean;
  doctorManagement: boolean;
  platformAnalytics: boolean;
  balanceSheet: boolean;
  dailyWorkReports: boolean;
  sendNotifications: boolean;
  mediaUploads: boolean;
  workingDiary: boolean;
  [key: string]: boolean; // For custom permissions
}

interface Admin {
  id: string;
  name: string;
  email: string;
  image: string | null;
  permissions: AdminPermissions;
}

interface Role {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
}

const DEFAULT_ROLES: Role[] = [
  {
    id: 'revenueManagement',
    name: 'Revenue Management',
    description: 'Full access to revenue tracking, financial reports, and payment management',
    isCustom: false,
  },
  {
    id: 'doctorManagement',
    name: 'Doctor Management',
    description: 'Manage doctor profiles, approvals, and verification processes',
    isCustom: false,
  },
  {
    id: 'platformAnalytics',
    name: 'Platform Analytics',
    description: 'View and analyze platform-wide statistics and user behavior',
    isCustom: false,
  },
  {
    id: 'balanceSheet',
    name: 'Balance Sheet',
    description: 'Access to financial balance sheets and accounting reports',
    isCustom: false,
  },
  {
    id: 'dailyWorkReports',
    name: 'Daily Work Reports',
    description: 'Generate and review daily operational reports',
    isCustom: false,
  },
  {
    id: 'sendNotifications',
    name: 'Send Notifications',
    description: 'Create and send notifications to doctors and patients',
    isCustom: false,
  },
  {
    id: 'mediaUploads',
    name: 'Media Uploads',
    description: 'Upload and manage videos, templates, and other media content',
    isCustom: false,
  },
  {
    id: 'workingDiary',
    name: 'Working Diary',
    description: 'Maintain and review administrative work logs and diaries',
    isCustom: false,
  },
];

export default function AdminRolesManager() {
  // Mock admins data - In real app, this would come from props or context
  const [admins, setAdmins] = useState<Admin[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      image: null,
      permissions: {
        revenueManagement: true,
        doctorManagement: true,
        platformAnalytics: false,
        balanceSheet: true,
        dailyWorkReports: false,
        sendNotifications: true,
        mediaUploads: false,
        workingDiary: false,
      },
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      image: null,
      permissions: {
        revenueManagement: false,
        doctorManagement: false,
        platformAnalytics: true,
        balanceSheet: false,
        dailyWorkReports: true,
        sendNotifications: false,
        mediaUploads: true,
        workingDiary: true,
      },
    },
  ]);

  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handlePermissionToggle = (adminId: string, roleId: string) => {
    setAdmins(prevAdmins =>
      prevAdmins.map(admin =>
        admin.id === adminId
          ? {
              ...admin,
              permissions: {
                ...admin.permissions,
                [roleId]: !admin.permissions[roleId],
              },
            }
          : admin
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      alert('Please enter a role name');
      return;
    }

    const roleId = newRoleName.toLowerCase().replace(/\s+/g, '_');

    // Check if role already exists
    if (roles.some(r => r.id === roleId)) {
      alert('A role with this name already exists');
      return;
    }

    const newRole: Role = {
      id: roleId,
      name: newRoleName,
      description: newRoleDescription,
      isCustom: true,
    };

    setRoles([...roles, newRole]);

    // Add the new permission to all admins (set to false by default)
    setAdmins(prevAdmins =>
      prevAdmins.map(admin => ({
        ...admin,
        permissions: {
          ...admin.permissions,
          [roleId]: false,
        },
      }))
    );

    setNewRoleName('');
    setNewRoleDescription('');
    setIsAddingRole(false);
    setHasUnsavedChanges(true);
  };

  const handleEditRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role && role.isCustom) {
      setEditingRoleId(roleId);
      setNewRoleName(role.name);
      setNewRoleDescription(role.description);
    }
  };

  const handleUpdateRole = () => {
    if (!newRoleName.trim()) {
      alert('Please enter a role name');
      return;
    }

    setRoles(prevRoles =>
      prevRoles.map(role =>
        role.id === editingRoleId
          ? { ...role, name: newRoleName, description: newRoleDescription }
          : role
      )
    );

    setEditingRoleId(null);
    setNewRoleName('');
    setNewRoleDescription('');
    setHasUnsavedChanges(true);
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role?.isCustom) {
      alert('Cannot delete default roles');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"? This will remove it from all admins.`)) {
      return;
    }

    setRoles(prevRoles => prevRoles.filter(r => r.id !== roleId));

    // Remove the permission from all admins
    setAdmins(prevAdmins =>
      prevAdmins.map(admin => {
        const newPermissions = { ...admin.permissions };
        delete newPermissions[roleId];
        return {
          ...admin,
          permissions: newPermissions as AdminPermissions,
        };
      })
    );

    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    // In real app, this would save to backend
    setHasUnsavedChanges(false);
    alert('✅ Roles & Responsibilities saved successfully!');
  };

  const getAdminPermissionCount = (admin: Admin) => {
    return Object.values(admin.permissions).filter(Boolean).length;
  };

  const getRoleDistribution = (roleId: string) => {
    return admins.filter(admin => admin.permissions[roleId]).length;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl text-white mb-2 flex items-center gap-3">
                <Shield className="w-8 h-8 text-emerald-500" />
                Roles & Responsibilities Manager
              </h1>
              <p className="text-gray-400">
                Centralized control panel for managing admin permissions and creating custom roles
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>

          {hasUnsavedChanges && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <p className="text-sm text-yellow-400">
                You have unsaved changes. Click "Save Changes" to apply them.
              </p>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 mb-1">Total Roles</p>
                  <p className="text-3xl text-white">{roles.length}</p>
                </div>
                <Shield className="w-12 h-12 text-emerald-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400 mb-1">Active Admins</p>
                  <p className="text-3xl text-white">{admins.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400 mb-1">Custom Roles</p>
                  <p className="text-3xl text-white">{roles.filter(r => r.isCustom).length}</p>
                </div>
                <Edit2 className="w-12 h-12 text-purple-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Management Section */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  Permission Distribution Matrix
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Manage which admins have access to specific areas
                </p>
              </div>
              {!isAddingRole && (
                <Button
                  onClick={() => setIsAddingRole(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Role
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Add New Role Form */}
            {isAddingRole && (
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <h3 className="text-white mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  Create New Role
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Role Name *</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 w-full text-white"
                      placeholder="e.g., Customer Support Management"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 w-full text-white resize-none"
                      rows={2}
                      placeholder="Brief description of this role's responsibilities"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddRole}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Create Role
                    </Button>
                    <Button
                      onClick={() => {
                        setIsAddingRole(false);
                        setNewRoleName('');
                        setNewRoleDescription('');
                      }}
                      variant="outline"
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Role Form */}
            {editingRoleId && (
              <div className="mb-6 p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg">
                <h3 className="text-white mb-4 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-purple-400" />
                  Edit Role
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Role Name *</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 w-full text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 w-full text-white resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleUpdateRole}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Update Role
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingRoleId(null);
                        setNewRoleName('');
                        setNewRoleDescription('');
                      }}
                      variant="outline"
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Permission Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-4 px-4 text-white">Role / Responsibility</th>
                    {admins.map((admin) => (
                      <th key={admin.id} className="text-center py-4 px-4">
                        <div className="flex flex-col items-center gap-2">
                          {admin.image ? (
                            <img
                              src={admin.image}
                              alt={admin.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <span className="text-white">{admin.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="text-white text-sm">{admin.name}</div>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                            {getAdminPermissionCount(admin)} roles
                          </Badge>
                        </div>
                      </th>
                    ))}
                    <th className="text-center py-4 px-4 text-gray-400">Distribution</th>
                    <th className="text-center py-4 px-4 text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white">{role.name}</span>
                            {role.isCustom && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{role.description}</p>
                        </div>
                      </td>
                      {admins.map((admin) => (
                        <td key={admin.id} className="text-center py-4 px-4">
                          <label className="flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={admin.permissions[role.id] || false}
                              onChange={() => handlePermissionToggle(admin.id, role.id)}
                              className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                            />
                          </label>
                        </td>
                      ))}
                      <td className="text-center py-4 px-4">
                        <Badge
                          className={
                            getRoleDistribution(role.id) === 0
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : getRoleDistribution(role.id) === admins.length
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }
                        >
                          {getRoleDistribution(role.id)}/{admins.length}
                        </Badge>
                      </td>
                      <td className="text-center py-4 px-4">
                        {role.isCustom && (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => handleEditRole(role.id)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-700 hover:bg-zinc-800 h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3 h-3 text-gray-400" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteRole(role.id)}
                              size="sm"
                              variant="outline"
                              className="border-red-700 hover:bg-red-900/20 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Admin Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {admins.map((admin) => (
            <Card key={admin.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center gap-4">
                  {admin.image ? (
                    <img
                      src={admin.image}
                      alt={admin.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl">
                      {admin.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-white mb-1">{admin.name}</h3>
                    <p className="text-sm text-gray-400">{admin.email}</p>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mt-2">
                      {getAdminPermissionCount(admin)} Active Permissions
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-3">Assigned Responsibilities:</p>
                  <div className="flex flex-wrap gap-2">
                    {roles
                      .filter((role) => admin.permissions[role.id])
                      .map((role) => (
                        <Badge
                          key={role.id}
                          className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"
                        >
                          {role.name}
                        </Badge>
                      ))}
                    {getAdminPermissionCount(admin) === 0 && (
                      <span className="text-xs text-gray-500 italic">No permissions assigned</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <Card className="bg-blue-900/20 border-blue-700/30 mt-6">
          <CardContent className="p-6">
            <h3 className="text-blue-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              How to Use Roles & Responsibilities Manager
            </h3>
            <div className="space-y-2 text-sm text-blue-300">
              <p>✅ <strong>Read:</strong> View all roles and their distribution across admins in the matrix above</p>
              <p>✅ <strong>Add:</strong> Click "Add New Role" to create custom responsibilities for your team</p>
              <p>✅ <strong>Edit:</strong> Toggle checkboxes to assign/remove permissions, or edit custom role details</p>
              <p>✅ <strong>Interchange:</strong> Easily redistribute roles between Admin 1 and Admin 2</p>
              <p>✅ <strong>Delete:</strong> Remove custom roles that are no longer needed</p>
              <p>⚠️ <strong>Remember:</strong> Click "Save Changes" button to apply all modifications</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

