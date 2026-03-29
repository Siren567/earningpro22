import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../components/LanguageContext';
import { Users, BarChart3, CreditCard, Sparkles, Ban, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import AdminStats from '../components/app/AdminStats';

export default function Admin() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showAddStock, setShowAddStock] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [stockForm, setStockForm] = useState({ symbol: '', company_name: '', exchange: 'NASDAQ', ai_score: 75, risk_level: 'low', ai_recommended: false, last_price: 0 });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminGetUsers', { searchTerm });
      return res.data || [];
    },
    enabled: currentUser?.role === 'admin',
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ['adminStocks'],
    queryFn: () => base44.entities.Stock.list('-ai_score', 100),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['adminPlans'],
    queryFn: () => base44.entities.SubscriptionPlan.list(),
  });

  const toggleSuspend = useMutation({
    mutationFn: async ({ userEmail, is_suspended }) => {
      await base44.functions.invoke('adminUpdateUser', { userEmail, updates: { is_suspended } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User status updated');
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userEmail) => {
      await base44.functions.invoke('adminDeleteUser', { userEmail });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User deleted');
    },
  });

  const changeSubscription = useMutation({
    mutationFn: async ({ userEmail, plan }) => {
      await base44.functions.invoke('adminUpdateUser', { userEmail, updates: { subscription_plan: plan } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('Subscription updated');
    },
  });

  const inviteUser = useMutation({
    mutationFn: async (email) => {
      await base44.users.inviteUser(email, 'user');
    },
    onSuccess: () => {
      setShowAddUser(false);
      setNewUserEmail('');
      toast.success('User invited');
    },
  });

  const toggleAiRecommended = useMutation({
    mutationFn: ({ id, ai_recommended }) => base44.entities.Stock.update(id, { ai_recommended }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminStocks'] }),
  });

  const deleteStock = useMutation({
    mutationFn: (id) => base44.entities.Stock.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminStocks'] }); toast.success('Stock removed'); },
  });

  const createStock = useMutation({
    mutationFn: (data) => base44.entities.Stock.create({ ...data, last_price: parseFloat(data.last_price), ai_score: parseInt(data.ai_score) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStocks'] });
      setShowAddStock(false);
      setStockForm({ symbol: '', company_name: '', exchange: 'NASDAQ', ai_score: 75, risk_level: 'low', ai_recommended: false, last_price: 0 });
      toast.success('Stock added');
    },
  });

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Ban className="w-12 h-12 text-red-400 mb-3" />
        <p className="text-lg font-semibold dark:text-white text-gray-900">Access Denied</p>
        <p className="text-sm dark:text-gray-500 text-gray-500 mt-1">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <h1 className="text-2xl font-bold dark:text-white text-gray-900">{t('admin_title')}</h1>

      <AdminStats users={users} />

      <Tabs defaultValue="users">
        <TabsList className="dark:bg-white/5 bg-gray-100 rounded-xl p-1">
          <TabsTrigger value="users" className="rounded-lg gap-1.5 data-[state=active]:dark:bg-white/10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="w-4 h-4" /> {t('admin_users')}
          </TabsTrigger>
          <TabsTrigger value="stocks" className="rounded-lg gap-1.5 data-[state=active]:dark:bg-white/10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BarChart3 className="w-4 h-4" /> {t('admin_stocks')}
          </TabsTrigger>
          <TabsTrigger value="plans" className="rounded-lg gap-1.5 data-[state=active]:dark:bg-white/10 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CreditCard className="w-4 h-4" /> {t('admin_subscriptions')}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6 w-full">
          <div className="flex gap-3 mb-4 w-full">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name or email..."
              className="dark:bg-white/5 dark:border-white/10 dark:text-white flex-1"
            />
            <Button onClick={() => setShowAddUser(true)} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              <Plus className="w-4 h-4" /> {t('admin_add_user')}
            </Button>
          </div>
          <div className="w-full p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="dark:text-gray-500 text-gray-500 border-b dark:border-white/5 border-gray-200">
                    <th className="text-left pb-3 font-medium">{t('name')}</th>
                    <th className="text-left pb-3 font-medium">Role</th>
                    <th className="text-left pb-3 font-medium">Plan</th>
                    <th className="text-left pb-3 font-medium">Status</th>
                    <th className="text-right pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm dark:text-gray-500 text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b dark:border-white/5 border-gray-100">
                        <td className="py-3">
                          <p className="font-medium dark:text-white text-gray-900">{user.full_name || user.profile?.first_name + ' ' + user.profile?.last_name || 'User'}</p>
                          <p className="text-xs dark:text-gray-500 text-gray-500">{user.email}</p>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-500/10 dark:text-gray-400 text-gray-600'}`}>
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="py-3">
                          <Select
                            value={user.subscription_plan || 'free'}
                            onValueChange={(plan) => changeSubscription.mutate({ userEmail: user.email, plan })}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs dark:bg-white/5 dark:border-white/10 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-[#1a1a2e] dark:border-white/10">
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${user.is_suspended ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-500'}`}>
                            {user.is_suspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => toggleSuspend.mutate({ userEmail: user.email, is_suspended: !user.is_suspended })}
                              className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-400 text-gray-600"
                              title={user.is_suspended ? 'Activate' : 'Suspend'}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirm(`Delete ${user.email}?`) && deleteUser.mutate(user.email)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"
                              title={t('admin_delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Stocks Tab */}
        <TabsContent value="stocks" className="mt-6 w-full">
          <div className="flex justify-end mb-4 w-full">
            <Button onClick={() => setShowAddStock(true)} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              <Plus className="w-4 h-4" /> Add Stock
            </Button>
          </div>
          <div className="w-full p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="dark:text-gray-500 text-gray-500 border-b dark:border-white/5 border-gray-200">
                    <th className="text-left pb-3 font-medium">Symbol</th>
                    <th className="text-left pb-3 font-medium">{t('name')}</th>
                    <th className="text-right pb-3 font-medium">AI {t('score')}</th>
                    <th className="text-center pb-3 font-medium">AI Pick</th>
                    <th className="text-right pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map(stock => (
                    <tr key={stock.id} className="border-b dark:border-white/5 border-gray-100">
                      <td className="py-3 font-semibold dark:text-white text-gray-900">{stock.symbol}</td>
                      <td className="py-3 dark:text-gray-400 text-gray-600">{stock.company_name}</td>
                      <td className="py-3 text-right font-medium dark:text-white text-gray-900">{stock.ai_score}</td>
                      <td className="py-3 text-center">
                        <Switch
                          checked={stock.ai_recommended}
                          onCheckedChange={(checked) => toggleAiRecommended.mutate({ id: stock.id, ai_recommended: checked })}
                        />
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => deleteStock.mutate(stock.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-6 w-full">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {['free', 'basic', 'pro', 'enterprise'].map(plan => (
              <div key={plan} className="p-5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200">
                <h3 className="text-lg font-bold dark:text-white text-gray-900 capitalize">{plan}</h3>
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-1">
                  {users.filter(u => (u.subscription_plan || 'free') === plan).length} subscribers
                </p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add User Modal */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="dark:bg-[#1a1a2e] dark:border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Email address"
              className="dark:bg-white/5 dark:border-white/10 dark:text-white"
            />
            <Button
              onClick={() => inviteUser.mutate(newUserEmail)}
              disabled={!newUserEmail.trim() || inviteUser.isPending}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {inviteUser.isPending ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Stock Modal */}
      <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
        <DialogContent className="dark:bg-[#1a1a2e] dark:border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Add Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={stockForm.symbol} onChange={(e) => setStockForm({ ...stockForm, symbol: e.target.value.toUpperCase() })} placeholder="Symbol" className="dark:bg-white/5 dark:border-white/10 dark:text-white" />
            <Input value={stockForm.company_name} onChange={(e) => setStockForm({ ...stockForm, company_name: e.target.value })} placeholder="Company Name" className="dark:bg-white/5 dark:border-white/10 dark:text-white" />
            <Input type="number" value={stockForm.last_price} onChange={(e) => setStockForm({ ...stockForm, last_price: e.target.value })} placeholder="Price" className="dark:bg-white/5 dark:border-white/10 dark:text-white" />
            <Input type="number" value={stockForm.ai_score} onChange={(e) => setStockForm({ ...stockForm, ai_score: e.target.value })} placeholder="AI Score" className="dark:bg-white/5 dark:border-white/10 dark:text-white" />
            <Select value={stockForm.risk_level} onValueChange={(v) => setStockForm({ ...stockForm, risk_level: v })}>
              <SelectTrigger className="dark:bg-white/5 dark:border-white/10 dark:text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="dark:bg-[#1a1a2e] dark:border-white/10">
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="very_high">Very High Risk</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between">
              <span className="text-sm dark:text-gray-400 text-gray-600">AI Recommended</span>
              <Switch checked={stockForm.ai_recommended} onCheckedChange={(v) => setStockForm({ ...stockForm, ai_recommended: v })} />
            </div>
            <Button onClick={() => createStock.mutate(stockForm)} disabled={!stockForm.symbol.trim()} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              Add Stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}