import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, UserCog, Shield, UserCheck, User, Plus, Trash2, Loader2, RefreshCw, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployees } from '@/hooks/useEmployees';

type AppRole = 'admin' | 'hr' | 'employee';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
  linked_employee_id: string | null;
  linked_employee_name: string | null;
}

export function AdminUserAccountsSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roleToAdd, setRoleToAdd] = useState<AppRole | ''>('');
  const [roleToRemove, setRoleToRemove] = useState<{ user: UserWithRoles; role: AppRole } | null>(null);
  
  // Password reset state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserWithRoles | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: employees = [] } = useEmployees();

  // Fetch all users with their roles
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users-with-roles'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch employees to find linked accounts
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, user_id');

      if (empError) throw empError;

      // Build user list with roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => {
        const userRoles = (allRoles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole);

        const linkedEmployee = (employeesData || []).find((e) => e.user_id === profile.id);

        return {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name,
          created_at: profile.created_at,
          roles: userRoles,
          linked_employee_id: linkedEmployee?.id || null,
          linked_employee_name: linkedEmployee?.full_name || null,
        };
      });

      return usersWithRoles.sort((a, b) => {
        // Sort by role priority: admin first, then hr, then employee, then no roles
        const getPriority = (roles: AppRole[]) => {
          if (roles.includes('admin')) return 0;
          if (roles.includes('hr')) return 1;
          if (roles.includes('employee')) return 2;
          return 3;
        };
        return getPriority(a.roles) - getPriority(b.roles);
      });
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-with-roles'] });
      toast.success('Role added successfully');
      setIsRoleDialogOpen(false);
      setRoleToAdd('');
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('User already has this role');
      } else {
        toast.error('Failed to add role: ' + error.message);
      }
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-with-roles'] });
      toast.success('Role removed successfully');
      setRoleToRemove(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to remove role: ' + error.message);
    },
  });

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, newPassword: password }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      setIsPasswordDialogOpen(false);
      setUserToResetPassword(null);
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast.error('Failed to reset password: ' + error.message);
    },
  });

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const lower = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(lower) ||
        u.full_name?.toLowerCase().includes(lower) ||
        u.linked_employee_name?.toLowerCase().includes(lower)
    );
  }, [users, search]);

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3 h-3" />;
      case 'hr':
        return <UserCog className="w-3 h-3" />;
      case 'employee':
        return <UserCheck className="w-3 h-3" />;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'hr':
        return 'secondary';
      case 'employee':
        return 'outline';
    }
  };

  const getAvailableRoles = (currentRoles: AppRole[]): AppRole[] => {
    const allRoles: AppRole[] = ['admin', 'hr', 'employee'];
    return allRoles.filter((r) => !currentRoles.includes(r));
  };

  const handleAddRole = (user: UserWithRoles) => {
    setSelectedUser(user);
    setRoleToAdd('');
    setIsRoleDialogOpen(true);
  };

  const confirmAddRole = () => {
    if (!selectedUser || !roleToAdd) return;
    addRoleMutation.mutate({ userId: selectedUser.id, role: roleToAdd as AppRole });
  };

  const handleRemoveRole = (user: UserWithRoles, role: AppRole) => {
    setRoleToRemove({ user, role });
  };

  const confirmRemoveRole = () => {
    if (!roleToRemove) return;
    removeRoleMutation.mutate({ userId: roleToRemove.user.id, role: roleToRemove.role });
  };

  const handleResetPassword = (user: UserWithRoles) => {
    setUserToResetPassword(user);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordDialogOpen(true);
  };

  const confirmResetPassword = () => {
    if (!userToResetPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    resetPasswordMutation.mutate({ userId: userToResetPassword.id, password: newPassword });
  };

  return (
    <div className="glass-card rounded-3xl border border-border p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            User Account Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage user roles and permissions. Assign admin, HR, or employee roles.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Linked Employee</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  {search ? 'No users found matching your search.' : 'No users found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {user.full_name || 'No name'}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No roles</span>
                      ) : (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={getRoleBadgeVariant(role)}
                            className="flex items-center gap-1 cursor-pointer hover:opacity-80"
                            onClick={() => handleRemoveRole(user, role)}
                            title="Click to remove role"
                          >
                            {getRoleIcon(role)}
                            {role}
                            <Trash2 className="w-3 h-3 ml-1 opacity-60" />
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.linked_employee_name ? (
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-foreground">{user.linked_employee_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not linked</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleResetPassword(user)}
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      {getAvailableRoles(user.roles).length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => handleAddRole(user)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Role
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Add a new role to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={roleToAdd} onValueChange={(v) => setRoleToAdd(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {selectedUser &&
                  getAvailableRoles(selectedUser.roles).map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        <span className="capitalize">{role}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAddRole}
              disabled={!roleToAdd || addRoleMutation.isPending}
            >
              {addRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Role Confirmation */}
      <AlertDialog open={!!roleToRemove} onOpenChange={() => setRoleToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the <strong>{roleToRemove?.role}</strong> role from{' '}
              <strong>{roleToRemove?.user.full_name || roleToRemove?.user.email}</strong>?
              {roleToRemove?.role === 'admin' && (
                <span className="block mt-2 text-destructive">
                  Warning: Removing admin role will revoke all administrative privileges.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveRole}
              className="bg-destructive hover:bg-destructive/90"
              disabled={removeRoleMutation.isPending}
            >
              {removeRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {userToResetPassword?.full_name || userToResetPassword?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmResetPassword}
              disabled={
                !newPassword || 
                newPassword !== confirmPassword || 
                newPassword.length < 6 ||
                resetPasswordMutation.isPending
              }
            >
              {resetPasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
