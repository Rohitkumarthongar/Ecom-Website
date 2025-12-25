import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { UserPlus, Edit, Trash2, Shield, Users, Store } from 'lucide-react';

export default function AdminTeam() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Create form state
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/admin/team');
            setUsers(response.data.users);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/admin/team', newUser);
            toast.success(`Admin created! Temporary password: ${response.data.temporary_password}`);
            setShowCreateModal(false);
            setNewUser({ name: '', email: '', phone: '' });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create admin');
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await api.put(`/admin/team/${userId}`, { role: newRole });
            toast.success('User role updated successfully');
            fetchUsers();
            setShowEditModal(false);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update role');
        }
    };

    const handleRemoveAdmin = async (userId) => {
        if (!window.confirm('Are you sure you want to remove admin access from this user?')) {
            return;
        }

        try {
            await api.delete(`/admin/team/${userId}`);
            toast.success('Admin access removed');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to remove admin access');
        }
    };

    const getRoleBadge = (role, isWholesale) => {
        if (role === 'admin') {
            return <Badge className="bg-purple-600"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
        }
        if (isWholesale) {
            return <Badge className="bg-blue-600"><Store className="w-3 h-3 mr-1" />Supplier</Badge>;
        }
        return <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />Customer</Badge>;
    };

    const filteredUsers = users.filter(user => {
        if (filter === 'all') return true;
        if (filter === 'admin') return user.role === 'admin';
        if (filter === 'supplier') return user.is_wholesale;
        if (filter === 'customer') return user.role === 'customer' && !user.is_wholesale;
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Team Management</h1>
                    <p className="text-muted-foreground mt-1">Manage admin users and team members</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Admin
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilter('all')}
                >
                    All ({users.length})
                </Button>
                <Button
                    variant={filter === 'admin' ? 'default' : 'outline'}
                    onClick={() => setFilter('admin')}
                >
                    Admins ({users.filter(u => u.role === 'admin').length})
                </Button>
                <Button
                    variant={filter === 'supplier' ? 'default' : 'outline'}
                    onClick={() => setFilter('supplier')}
                >
                    Suppliers ({users.filter(u => u.is_wholesale).length})
                </Button>
                <Button
                    variant={filter === 'customer' ? 'default' : 'outline'}
                    onClick={() => setFilter('customer')}
                >
                    Customers ({users.filter(u => u.role === 'customer' && !u.is_wholesale).length})
                </Button>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-lg border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-4">Name</th>
                            <th className="text-left p-4">Contact</th>
                            <th className="text-left p-4">Role</th>
                            <th className="text-left p-4">Joined</th>
                            <th className="text-right p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="border-t hover:bg-muted/30">
                                <td className="p-4">
                                    <div className="font-medium">{user.name}</div>
                                </td>
                                <td className="p-4">
                                    <div className="text-sm">{user.phone}</div>
                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                </td>
                                <td className="p-4">
                                    {getRoleBadge(user.role, user.is_wholesale)}
                                </td>
                                <td className="p-4 text-sm text-muted-foreground">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setShowEditModal(true);
                                            }}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        {user.role === 'admin' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-destructive"
                                                onClick={() => handleRemoveAdmin(user.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Admin Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Admin</DialogTitle>
                        <DialogDescription>
                            Create a new admin user. They will receive a temporary password via email.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAdmin}>
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Phone</label>
                                <Input
                                    value={newUser.phone}
                                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="btn-primary">
                                Create Admin
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Role Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User Role</DialogTitle>
                        <DialogDescription>
                            Change the role for {selectedUser?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium">Role</label>
                        <Select
                            defaultValue={selectedUser?.role}
                            onValueChange={(value) => handleUpdateRole(selectedUser?.id, value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="customer">Customer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
