import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import OrderCalendar from '../components/OrderCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Truck, Package, CheckCircle, Clock, MapPin, Repeat, Calendar as CalendarIcon, AlertCircle, Calendar, ArrowUpDown, Search, Filter, X } from 'lucide-react';

function DriverDashboard() {
  const [activeTab, setActiveTab] = useState('deliveries');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  // Sorting
  const [sortBy, setSortBy] = useState('delivery_date'); // delivery_date | customer_name | is_recurring
  const [sortOrder, setSortOrder] = useState('asc'); // asc | desc
  const [includeDelivered, setIncludeDelivered] = useState(false); // hide delivered unless chosen
  // Filters similar to Admin Orders
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState([]); // ['assigned','picked_up','out_for_delivery','delivered']
  const [driverTypeFilter, setDriverTypeFilter] = useState('all'); // all | regular | recurring
  const [driverDateFilter, setDriverDateFilter] = useState('all'); // all | today | week | month | custom
  const [driverDateFrom, setDriverDateFrom] = useState('');
  const [driverDateTo, setDriverDateTo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchDriverOrders();
  }, []);

  const fetchDriverOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/driver/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId) => {
    if (!statusUpdate) {
      alert('Please select a status');
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/driver/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: statusUpdate,
          notes: notes || undefined
        })
      });

      if (!response.ok) {
        let msg = 'Failed to update status';
        try {
          const err = await response.json();
          if (err && (err.detail || err.message)) msg = err.detail || err.message;
        } catch {}
        throw new Error(msg);
      }

      alert('Status updated successfully');
      setSelectedOrder(null);
      setStatusUpdate('');
      setNotes('');
      fetchDriverOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'assigned': 'bg-blue-500',
      'picked_up': 'bg-yellow-500',
      'out_for_delivery': 'bg-orange-500',
      'delivered': 'bg-green-500'
    };
    
    return (
      <Badge className={statusColors[status] || 'bg-gray-500'}>
        {status?.replace(/_/g, ' ').toUpperCase() || 'ASSIGNED'}
      </Badge>
    );
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'assigned': return <Clock className="h-5 w-5" />;
      case 'picked_up': return <Package className="h-5 w-5" />;
      case 'out_for_delivery': return <Truck className="h-5 w-5" />;
      case 'delivered': return <CheckCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const toggleDriverStatusFilter = (status) => {
    setDriverStatusFilter(prev => prev.includes(status)
      ? prev.filter(s => s !== status)
      : [...prev, status]
    );
  };

  const clearDriverFilters = () => {
    setDriverSearchQuery('');
    setDriverStatusFilter([]);
    setDriverTypeFilter('all');
    setDriverDateFilter('all');
    setDriverDateFrom('');
    setDriverDateTo('');
    setIncludeDelivered(false);
  };

  // Base filter: cancel excluded always; delivered hidden unless chosen OR explicitly filtered
  const getFilteredOrders = () => {
    return orders.filter(order => {
      const isDelivered = order.delivery_status === 'delivered';
      const isCancelled = order.status === 'cancelled';
      if (isCancelled) return false;
      // If user selected any status filters, do not apply includeDelivered; status filter will handle inclusion
      if (driverStatusFilter.length === 0) {
        return includeDelivered ? true : !isDelivered;
      }
      return true;
    });
  };

  // Apply sorting on top of filters
  const getFilteredAndSortedOrders = () => {
    let filtered = getFilteredOrders();
    // Search filter
    if (driverSearchQuery.trim()) {
      const q = driverSearchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        (o.order_number || '').toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.pickup_address || '').toLowerCase().includes(q) ||
        (o.delivery_address || '').toLowerCase().includes(q)
      );
    }
    // We'll apply status filter after optionally adding delivered history entries
    // Type filter
    if (driverTypeFilter !== 'all') {
      filtered = filtered.filter(o => driverTypeFilter === 'recurring' ? !!o.is_recurring : !o.is_recurring);
    }
    // Date filter
    if (driverDateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(o => {
        const d = new Date(o.delivery_date);
        switch (driverDateFilter) {
          case 'today':
            return d.toDateString() === today.toDateString();
          case 'week': {
            // Get start of week (Sunday)
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            // Get end of week (Saturday)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return d >= startOfWeek && d <= endOfWeek;
          }
          case 'month': {
            // Get start of month (1st day)
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startOfMonth.setHours(0, 0, 0, 0);
            // Get end of month (last day)
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            return d >= startOfMonth && d <= endOfMonth;
          }
          case 'custom': {
            if (driverDateFrom || driverDateTo) {
              const from = driverDateFrom ? new Date(driverDateFrom) : null;
              const to = driverDateTo ? new Date(driverDateTo + 'T23:59:59.999') : null;
              if (from && d < from) return false;
              if (to && d > to) return false;
              return true;
            }
            return true;
          }
          default:
            return true;
        }
      });
    }

    // If user wants to see delivered items, append delivered occurrences from history for recurring orders
    const wantsDelivered = (driverStatusFilter.includes('delivered')) || (driverStatusFilter.length === 0 && includeDelivered);
    let deliveredFromHistory = [];
    if (wantsDelivered) {
      // Build history items and apply the same non-status filters (search/type/date) we applied above
      deliveredFromHistory = orders.flatMap((o) => {
        const hist = Array.isArray(o.deliveries_history) ? o.deliveries_history : [];
        return hist.map((h, idx) => {
          const deliveryDate = h.occurrence_delivery_date || h.delivered_at || o.delivery_date;
          return {
            ...o,
            id: `${o.id}#delivered#${idx}`,
            delivery_status: 'delivered',
            delivery_date: deliveryDate,
            is_history: true,
          };
        });
      });

      // Apply search filter
      if (driverSearchQuery.trim()) {
        const q = driverSearchQuery.toLowerCase();
        deliveredFromHistory = deliveredFromHistory.filter(o =>
          (o.order_number || '').toLowerCase().includes(q) ||
          (o.customer_name || '').toLowerCase().includes(q) ||
          (o.pickup_address || '').toLowerCase().includes(q) ||
          (o.delivery_address || '').toLowerCase().includes(q)
        );
      }
      // Type filter
      if (driverTypeFilter !== 'all') {
        deliveredFromHistory = deliveredFromHistory.filter(o => driverTypeFilter === 'recurring' ? !!o.is_recurring : !o.is_recurring);
      }
      // Date filter on occurrence delivery_date
      if (driverDateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        deliveredFromHistory = deliveredFromHistory.filter(o => {
          const d = new Date(o.delivery_date);
          switch (driverDateFilter) {
            case 'today':
              return d.toDateString() === today.toDateString();
            case 'week': {
              // Get start of week (Sunday)
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay());
              startOfWeek.setHours(0, 0, 0, 0);
              // Get end of week (Saturday)
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              endOfWeek.setHours(23, 59, 59, 999);
              return d >= startOfWeek && d <= endOfWeek;
            }
            case 'month': {
              // Get start of month (1st day)
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              startOfMonth.setHours(0, 0, 0, 0);
              // Get end of month (last day)
              const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              endOfMonth.setHours(23, 59, 59, 999);
              return d >= startOfMonth && d <= endOfMonth;
            }
            case 'custom': {
              if (driverDateFrom || driverDateTo) {
                const from = driverDateFrom ? new Date(driverDateFrom) : null;
                const to = driverDateTo ? new Date(driverDateTo + 'T23:59:59.999') : null;
                if (from && d < from) return false;
                if (to && d > to) return false;
                return true;
              }
              return true;
            }
            default:
              return true;
          }
        });
      }
    }

    // Now apply status filter: for active list (filtered) and append delivered history as needed
    if (driverStatusFilter.length > 0) {
      const activeFiltered = filtered.filter(o => driverStatusFilter.includes(o.delivery_status));
      const deliveredOnly = driverStatusFilter.includes('delivered') ? deliveredFromHistory : [];
      filtered = [...activeFiltered, ...deliveredOnly];
    } else {
      // No explicit status filter: include active filtered (already excludes delivered) and optionally include delivered history when includeDelivered
      filtered = wantsDelivered ? [...filtered, ...deliveredFromHistory] : filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'customer_name':
          aVal = a.customer_name || '';
          bVal = b.customer_name || '';
          // case-insensitive alphabetical
          {
            const aStr = aVal.toString().toLowerCase().trim();
            const bStr = bVal.toString().toLowerCase().trim();
            const cmp = aStr.localeCompare(bStr, undefined, { sensitivity: 'base' });
            return sortOrder === 'asc' ? cmp : -cmp;
          }
        case 'status':
          aVal = a.delivery_status || '';
          bVal = b.delivery_status || '';
          {
            const aStr = aVal.toString().toLowerCase().trim();
            const bStr = bVal.toString().toLowerCase().trim();
            const cmp = aStr.localeCompare(bStr, undefined, { sensitivity: 'base' });
            return sortOrder === 'asc' ? cmp : -cmp;
          }
        case 'is_recurring':
          aVal = a.is_recurring ? 1 : 0;
          bVal = b.is_recurring ? 1 : 0;
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        case 'delivery_date':
        default:
          aVal = new Date(a.delivery_date || 0);
          bVal = new Date(b.delivery_date || 0);
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
    return sorted;
  };

  // Pagination helpers
  const getPaginatedOrders = () => {
    const list = getFilteredAndSortedOrders();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return list.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const list = getFilteredAndSortedOrders();
    return Math.ceil(list.length / itemsPerPage);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-teal-600 mb-2">Driver Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage your delivery assignments</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total Assigned</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-teal-600">{orders.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Pending Pickup</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {orders.filter(o => o.delivery_status === 'assigned').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">In Transit</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">
              {orders.filter(o => o.delivery_status === 'picked_up' || o.delivery_status === 'out_for_delivery').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Delivered</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {orders.filter(o => o.delivery_status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex gap-2 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'deliveries'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            My Deliveries
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4 inline mr-2" />
            Calendar View
          </button>
        </div>
      </div>

      {/* Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <Card>
          <CardHeader>
            <CardTitle>My Deliveries</CardTitle>
            <CardDescription>Orders assigned to you for delivery</CardDescription>
          </CardHeader>
          <CardContent>
          {/* Filters - similar to Admin Orders */}
          {orders.length > 0 && (
            <div className="mb-4 flex flex-wrap items-end gap-3">
              {/* Search */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Search:</Label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-2 top-2.5" />
                  <Input
                    value={driverSearchQuery}
                    onChange={(e) => setDriverSearchQuery(e.target.value)}
                    placeholder="Order #, customer, address"
                    className="pl-8 w-[250px]"
                  />
                </div>
              </div>

              {/* Date Quick Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Date:</Label>
                <Select value={driverDateFilter} onValueChange={setDriverDateFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select date range">
                      {driverDateFilter === "all" && "All"}
                      {driverDateFilter === "today" && "Today"}
                      {driverDateFilter === "week" && "This Week"}
                      {driverDateFilter === "month" && "This Month"}
                      {driverDateFilter === "custom" && "Custom"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {driverDateFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Input type="date" value={driverDateFrom} onChange={(e) => setDriverDateFrom(e.target.value)} />
                    <span className="text-sm text-gray-500">to</span>
                    <Input type="date" value={driverDateTo} onChange={(e) => setDriverDateTo(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Type:</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={driverTypeFilter === 'all' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDriverTypeFilter('all')}>All</Button>
                  <Button type="button" size="sm" variant={driverTypeFilter === 'regular' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDriverTypeFilter('regular')}>Regular</Button>
                  <Button type="button" size="sm" variant={driverTypeFilter === 'recurring' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDriverTypeFilter('recurring')}>Recurring</Button>
                </div>
              </div>

              {/* Include Delivered toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-600">Delivered:</span>
                <Button
                  type="button"
                  variant={includeDelivered ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setIncludeDelivered(v => !v)}
                >
                  {includeDelivered ? 'Included' : 'Hidden'}
                </Button>
              </div>

              {/* Sort by Delivery Date */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Sort:</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={sortBy === 'delivery_date' && sortOrder === 'asc' ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => { setSortBy('delivery_date'); setSortOrder('asc'); }}
                  >
                    Oldest first
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={sortBy === 'delivery_date' && sortOrder === 'desc' ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => { setSortBy('delivery_date'); setSortOrder('desc'); }}
                  >
                    Newest first
                  </Button>
                </div>
              </div>
            </div>
          )}
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No deliveries assigned yet</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Pickup Address</TableHead>
                      <TableHead>Delivery Address</TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-teal-600"
                          onClick={() => {
                            if (sortBy !== 'delivery_date') setSortBy('delivery_date');
                            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                          }}
                          title={`Sort by delivery date (${sortOrder === 'asc' ? 'oldest first' : 'newest first'})`}
                        >
                          Delivery Date
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedOrders().map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {order.order_number}
                            {order.is_recurring && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Repeat className="w-3 h-3 mr-1" />
                                Recurring
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm">{order.pickup_address}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm">{order.delivery_address}</span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(order.delivery_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(order.delivery_status)}
                            {order.is_history && (
                              <Badge variant="outline" className="text-xs">Delivered occurrence</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!order.is_history && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setStatusUpdate(order.delivery_status || 'assigned');
                                    setNotes('');
                                  }}
                                >
                                  Update Status
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-[95vw]">
                          <DialogHeader>
                            <DialogTitle>Update Delivery Status</DialogTitle>
                            <DialogDescription>
                              Order #{order.order_number} - {order.customer_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {/* Order Type Badge */}
                            {order.is_recurring && (
                              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <Repeat className="w-5 h-5 text-blue-600" />
                                <div className="flex-1">
                                  <span className="font-semibold text-blue-900">Recurring Order</span>
                                  {order.next_occurrence_date && (
                                    <p className="text-sm text-blue-700 mt-1">
                                      Next Scheduled: {new Date(order.next_occurrence_date).toLocaleDateString()}
                                    </p>
                                  )}
                                  {order.recurrence_pattern && (
                                    <p className="text-sm text-blue-700 mt-1">
                                      Pattern: {order.recurrence_pattern.frequency || 'Custom'} 
                                      {order.recurrence_pattern.interval > 1 && ` (every ${order.recurrence_pattern.interval} ${order.recurrence_pattern.frequency}s)`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <Label>Current Status</Label>
                              <div className="mt-2 flex items-center gap-2">
                                {getStatusIcon(order.delivery_status)}
                                {getStatusBadge(order.delivery_status)}
                              </div>
                            </div>
                            
                            <div>
                              <Label>New Status</Label>
                              <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new status">
                                    {statusUpdate === "assigned" && "Assigned"}
                                    {statusUpdate === "picked_up" && "Picked Up"}
                                    {statusUpdate === "out_for_delivery" && "Out for Delivery"}
                                    {statusUpdate === "delivered" && "Delivered"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="assigned">Assigned</SelectItem>
                                  <SelectItem value="picked_up">Picked Up</SelectItem>
                                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Notes (Optional)</Label>
                              <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes about this delivery..."
                                rows={3}
                              />
                            </div>
                            
                            {/* Order Details Section */}
                            <div className="border-t pt-4 space-y-4">
                              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Order Details
                              </h4>
                              
                              <div className="bg-gray-50 p-4 rounded space-y-3 text-sm">
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <span className="text-gray-600 font-medium">Pickup Address:</span>
                                    <p className="text-gray-900 mt-1">{order.pickup_address}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <span className="text-gray-600 font-medium">Delivery Address:</span>
                                    <p className="text-gray-900 mt-1">{order.delivery_address}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-2">
                                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <span className="text-gray-600 font-medium">Delivery Schedule:</span>
                                    <p className="text-gray-900 mt-1">
                                      {new Date(order.delivery_date).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-2">
                                  <Package className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <span className="text-gray-600 font-medium">Items ({order.items?.length || 0}):</span>
                                    <div className="mt-2 space-y-1">
                                      {order.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between bg-white p-2 rounded border">
                                          <span>{item.sku_name || item.sku_id}</span>
                                          <span className="text-gray-600">Qty: {item.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                {order.special_instructions && (
                                  <div className="flex items-start gap-2 pt-2 border-t">
                                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <span className="text-gray-600 font-medium">Special Instructions:</span>
                                      <p className="text-gray-900 mt-1 italic">{order.special_instructions}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {order.delivery_notes && (
                                  <div className="flex items-start gap-2 pt-2 border-t">
                                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <span className="text-gray-600 font-medium">Previous Delivery Notes:</span>
                                      <p className="text-gray-900 mt-1">{order.delivery_notes}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Button 
                              className="w-full bg-teal-500 hover:bg-teal-600" 
                              onClick={() => handleStatusUpdate(order.id)}
                              disabled={updating}
                            >
                              {updating ? 'Updating...' : 'Update Status'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                          )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {getTotalPages() > 1 && (
              <div className="mt-4 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredOrders().length)} of {getFilteredOrders().length} orders
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {[...Array(getTotalPages())].map((_, idx) => {
                      const pageNum = idx + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === getTotalPages() ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={currentPage === pageNum ? "bg-teal-500 hover:bg-teal-600" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return <span key={pageNum} className="px-2 py-1">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === getTotalPages()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {getPaginatedOrders().map((order) => (
              <Card key={order.id} className="border-l-4" style={{borderLeftColor: order.delivery_status === 'delivered' ? '#10b981' : order.delivery_status === 'out_for_delivery' ? '#f59e0b' : '#3b82f6'}}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-lg">{order.order_number}</div>
                      <div className="text-sm text-gray-600 mt-1">{order.customer_name}</div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.delivery_status)}
                        {order.is_history && (
                          <Badge variant="outline" className="text-[10px]">Delivered occurrence</Badge>
                        )}
                      </div>
                      {order.is_recurring && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          <Repeat className="w-3 h-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                      <MapPin className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-700">Pickup</div>
                        <div className="text-gray-600">{order.pickup_address}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-700">Delivery</div>
                        <div className="text-gray-600">{order.delivery_address}</div>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-center text-sm bg-gray-50 p-2 rounded">
                    <div className="text-center">
                      <div className="text-gray-600">Delivery Date</div>
                      <div className="font-medium text-gray-900">{new Date(order.delivery_date).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!order.is_history && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedOrder(order);
                            setStatusUpdate(order.delivery_status || 'assigned');
                            setNotes('');
                          }}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Update Status
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-[95vw] w-[95vw]">
                      <DialogHeader>
                        <DialogTitle>Update Delivery Status</DialogTitle>
                        <DialogDescription>
                          Order #{order.order_number} - {order.customer_name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        {/* Order Type Badge */}
                        {order.is_recurring && (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Repeat className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-blue-900 block truncate">Recurring Order</span>
                              {order.next_occurrence_date && (
                                <p className="text-sm text-blue-700 mt-1 truncate">
                                  Next Scheduled: {new Date(order.next_occurrence_date).toLocaleDateString()}
                                </p>
                              )}
                              {order.recurrence_pattern && (
                                <p className="text-sm text-blue-700 mt-1 break-words">
                                  Pattern: {order.recurrence_pattern.frequency || 'Custom'} 
                                  {order.recurrence_pattern.interval > 1 && ` (every ${order.recurrence_pattern.interval} ${order.recurrence_pattern.frequency}s)`}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <Label>Current Status</Label>
                          <div className="mt-2 flex items-center gap-2">
                            {getStatusIcon(order.delivery_status)}
                            {getStatusBadge(order.delivery_status)}
                          </div>
                        </div>
                        
                        <div>
                          <Label>New Status</Label>
                          <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select new status">
                                {statusUpdate === "assigned" && "Assigned"}
                                {statusUpdate === "picked_up" && "Picked Up"}
                                {statusUpdate === "out_for_delivery" && "Out for Delivery"}
                                {statusUpdate === "delivered" && "Delivered"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="picked_up">Picked Up</SelectItem>
                              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Notes (Optional)</Label>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this delivery..."
                            rows={3}
                          />
                        </div>
                        
                        {/* Order Details Section */}
                        <div className="border-t pt-4 space-y-4">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Order Details
                          </h4>
                          
                          <div className="bg-gray-50 p-3 sm:p-4 rounded space-y-3 text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-600 font-medium block">Pickup Address:</span>
                                <p className="text-gray-900 mt-1 break-words">{order.pickup_address}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-600 font-medium block">Delivery Address:</span>
                                <p className="text-gray-900 mt-1 break-words">{order.delivery_address}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-600 font-medium block">Delivery Schedule:</span>
                                <p className="text-gray-900 mt-1 break-words">
                                  {new Date(order.delivery_date).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <Package className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-gray-600 font-medium block">Items ({order.items?.length || 0}):</span>
                                <div className="mt-2 space-y-1">
                                  {order.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between bg-white p-2 rounded border">
                                      <span className="break-words">{item.sku_name || item.sku_id}</span>
                                      <span className="text-gray-600">Qty: {item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {order.special_instructions && (
                              <div className="flex items-start gap-2 pt-2 border-t">
                                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-gray-600 font-medium block">Special Instructions:</span>
                                  <p className="text-gray-900 mt-1 italic break-words">{order.special_instructions}</p>
                                </div>
                              </div>
                            )}
                            
                            {order.delivery_notes && (
                              <div className="flex items-start gap-2 pt-2 border-t">
                                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-gray-600 font-medium block">Previous Delivery Notes:</span>
                                  <p className="text-gray-900 mt-1 break-words">{order.delivery_notes}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full bg-teal-500 hover:bg-teal-600" 
                          onClick={() => handleStatusUpdate(order.id)}
                          disabled={updating}
                        >
                          {updating ? 'Updating...' : 'Update Status'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
          )}
        </CardContent>
      </Card>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Calendar</CardTitle>
            <CardDescription>View your assigned deliveries on the calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <OrderCalendar orders={orders} hidePricing={true} />
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

export default DriverDashboard;
