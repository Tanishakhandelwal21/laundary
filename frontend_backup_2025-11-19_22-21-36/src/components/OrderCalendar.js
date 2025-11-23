import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Package, Repeat, Clock, MapPin, DollarSign, Filter, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, addMonths, subMonths, addDays, addWeeks } from 'date-fns';

const OrderCalendar = ({ orders = [], hidePricing = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showDayOrdersDialog, setShowDayOrdersDialog] = useState(false);
  const [dayOrders, setDayOrders] = useState({ pickup: [], delivery: [] });
  
  // Filter states
  const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // 'all', 'recurring', 'one-time'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'processing', etc.
  const [dateTypeFilter, setDateTypeFilter] = useState('all'); // 'all', 'pickup', 'delivery'

  // Apply filters to orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Order type filter
      if (orderTypeFilter === 'recurring' && !order.is_recurring) return false;
      if (orderTypeFilter === 'one-time' && order.is_recurring) return false;
      
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      
      return true;
    });
  }, [orders, orderTypeFilter, statusFilter]);

  // Get days in current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Helper function to generate future occurrences for recurring orders
  const generateRecurringOccurrences = (order) => {
    // Don't generate future occurrences for cancelled orders
    if (!order.is_recurring || !order.recurrence_pattern || !order.delivery_date || order.status === 'cancelled') {
      return [];
    }

    const occurrences = [];
    const { frequency_type, frequency_value = 1 } = order.recurrence_pattern;
    const startDate = parseISO(order.delivery_date);
    const sixMonthsFromNow = addMonths(new Date(), 6);
    
    let currentDate = startDate;
    let iteration = 0;
    const maxIterations = 200; // Safety limit to prevent infinite loops

    while (currentDate <= sixMonthsFromNow && iteration < maxIterations) {
      if (currentDate > startDate) { // Don't duplicate the original order date
        occurrences.push({
          ...order,
          delivery_date: format(currentDate, "yyyy-MM-dd'T'HH:mm:ss"),
          isRecurringInstance: true, // Mark as generated instance
          originalOrderId: order.id
        });
      }

      // Calculate next occurrence based on frequency
      if (frequency_type === 'daily') {
        currentDate = addDays(currentDate, frequency_value);
      } else if (frequency_type === 'weekly') {
        currentDate = addWeeks(currentDate, frequency_value);
      } else if (frequency_type === 'monthly') {
        currentDate = addMonths(currentDate, frequency_value);
      } else {
        break; // Unknown frequency type
      }

      iteration++;
    }

    return occurrences;
  };

  // Group orders by date
  const ordersByDate = useMemo(() => {
    const grouped = {};
    
    filteredOrders.forEach(order => {
      // Only add delivery date (pickup orders are removed from calendar)
      // Check if delivery_date exists and is not null/empty
      const deliveryDateValue = typeof order.delivery_date === 'string' ? order.delivery_date.trim() : order.delivery_date;
      if (deliveryDateValue && (dateTypeFilter === 'all' || dateTypeFilter === 'delivery')) {
        try {
          const deliveryDate = format(parseISO(String(deliveryDateValue)), 'yyyy-MM-dd');
          if (!grouped[deliveryDate]) grouped[deliveryDate] = { pickup: [], delivery: [] };
          grouped[deliveryDate].delivery.push(order);

          // Generate future occurrences for recurring orders
          if (order.is_recurring && order.recurrence_pattern) {
            const futureOccurrences = generateRecurringOccurrences(order);
            futureOccurrences.forEach(occurrence => {
              try {
                const occurrenceDate = format(parseISO(occurrence.delivery_date), 'yyyy-MM-dd');
                if (!grouped[occurrenceDate]) grouped[occurrenceDate] = { pickup: [], delivery: [] };
                grouped[occurrenceDate].delivery.push(occurrence);
              } catch (error) {
                console.error('Error parsing recurring occurrence date:', error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing delivery date for order:', order.order_number, error);
        }
      }
    });
    
    return grouped;
  }, [filteredOrders, dateTypeFilter]);

  // Get orders for a specific date
  const getOrdersForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return ordersByDate[dateStr] || { pickup: [], delivery: [] };
  };

  // Navigate months
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dayOrders = getOrdersForDate(date);
    if (dayOrders.pickup.length > 0 || dayOrders.delivery.length > 0) {
      // Show dialog with orders for this date
    }
  };

  // Handle order click
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderDialog(true);
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-orange-100 text-orange-800';
      case 'in_progress': return 'bg-amber-100 text-amber-800';
      case 'ready_for_pickup': return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 font-semibold';
      case 'completed': return 'bg-green-100 text-green-800 font-semibold';
      case 'cancelled': return 'bg-red-500 text-white font-bold border-2 border-red-600 animate-pulse';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-teal-600" />
              Order Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="ml-4 font-semibold text-lg">
                {format(currentDate, 'MMMM yyyy')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Calendar Filters</h3>
              {(orderTypeFilter !== 'all' || statusFilter !== 'all' || dateTypeFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOrderTypeFilter('all');
                    setStatusFilter('all');
                    setDateTypeFilter('all');
                  }}
                  className="ml-auto text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Order Type Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Order Type</label>
                <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="recurring">Recurring Only</SelectItem>
                    <SelectItem value="one-time">One-Time Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Order Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Type Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Show Dates</label>
                <Select value={dateTypeFilter} onValueChange={setDateTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Delivery Only</SelectItem>
                    <SelectItem value="delivery">Delivery Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Results Summary */}
            <div className="mt-3 pt-3 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                Showing <span className="font-semibold text-teal-600">{filteredOrders.length}</span> of{' '}
                <span className="font-semibold">{orders.length}</span> orders
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm font-semibold text-red-700">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-emerald-700">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm text-amber-700">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-purple-600" />
              <span className="text-sm">Recurring Order</span>
            </div>
            <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-red-50 rounded border border-red-200">
              <span className="text-xs text-red-700">🔴 Red shadow = Cancelled orders on this date</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded">
                {day}
              </div>
            ))}

            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, index) => (
              <div key={`empty-${index}`} className="p-2 min-h-[120px] bg-gray-50 rounded"></div>
            ))}

            {/* Calendar Days */}
            {daysInMonth.map(date => {
              const dayOrders = getOrdersForDate(date);
              const hasOrders = dayOrders.pickup.length > 0 || dayOrders.delivery.length > 0;
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isTodayDate = isToday(date);
              
              // Check for cancelled orders on this date
              const hasCancelledOrders = [...dayOrders.pickup, ...dayOrders.delivery].some(
                order => order.status === 'cancelled'
              );
              
              // Check for completed orders
              const hasCompletedOrders = [...dayOrders.pickup, ...dayOrders.delivery].some(
                order => ['delivered', 'completed'].includes(order.status)
              );
              
              // Check for in-progress orders
              const hasInProgressOrders = [...dayOrders.pickup, ...dayOrders.delivery].some(
                order => ['in_progress', 'processing', 'out_for_delivery'].includes(order.status)
              );

              return (
                <div
                  key={date.toString()}
                  onClick={() => handleDateClick(date)}
                  className={`
                    p-2 min-h-[120px] border rounded cursor-pointer transition-all relative
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isTodayDate ? 'border-teal-500 border-2 bg-teal-50' : 'border-gray-200'}
                    ${hasOrders ? 'hover:shadow-md' : 'hover:bg-gray-50'}
                    ${hasCancelledOrders ? 'shadow-[inset_0_0_25px_rgba(239,68,68,0.2)] bg-red-50/40' : ''}
                    ${hasCompletedOrders && !hasCancelledOrders ? 'shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] bg-emerald-50/30' : ''}
                  `}
                >
                  <div className={`text-sm font-semibold mb-1 ${isTodayDate ? 'text-teal-600' : 'text-gray-900'}`}>
                    {format(date, 'd')}
                  </div>
                  
                  {/* Order indicators */}
                  <div className="space-y-1">
                    {/* Cancelled orders indicator - show first with high priority */}
                    {hasCancelledOrders && (
                      <div className="text-xs p-1 bg-red-100 text-red-800 rounded border border-red-300">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                          <span className="font-bold">
                            {[...dayOrders.pickup, ...dayOrders.delivery].filter(o => o.status === 'cancelled').length} Cancelled
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Completed orders indicator */}
                    {hasCompletedOrders && (
                      <div className="text-xs p-1 bg-emerald-100 text-emerald-800 rounded">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="font-medium">
                            {[...dayOrders.pickup, ...dayOrders.delivery].filter(o => ['delivered', 'completed'].includes(o.status)).length} Completed
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* In Progress orders indicator */}
                    {hasInProgressOrders && (
                      <div className="text-xs p-1 bg-amber-100 text-amber-800 rounded">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span className="font-medium">
                            {[...dayOrders.pickup, ...dayOrders.delivery].filter(o => ['in_progress', 'processing', 'out_for_delivery'].includes(o.status)).length} In Progress
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Delivery orders */}
                    {dayOrders.delivery.length > 0 && (
                      <div 
                        className="text-xs p-1 bg-green-100 text-green-800 rounded cursor-pointer hover:bg-green-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (dayOrders.delivery.length === 1) {
                            handleOrderClick(dayOrders.delivery[0]);
                          } else {
                            // Show list of all orders for this day
                            setDayOrders(dayOrders);
                            setSelectedDate(date);
                            setShowDayOrdersDialog(true);
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <Package className="w-3 h-3" />
                          <span className="font-medium">{dayOrders.delivery.length} Deliver{dayOrders.delivery.length > 1 ? 'ies' : 'y'}</span>
                        </div>
                        {dayOrders.delivery.slice(0, 2).map((order, idx) => (
                          <div key={idx} className="flex items-center gap-1 mt-0.5">
                            {order.is_recurring && <Repeat className="w-2 h-2" />}
                            {order.isRecurringInstance && <Clock className="w-2 h-2 text-blue-600" title="Future recurring instance" />}
                            <span className="truncate">{order.order_number}</span>
                          </div>
                        ))}
                        {dayOrders.delivery.length > 2 && (
                          <div className="text-xs text-green-600">+{dayOrders.delivery.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedOrder.order_number}</h3>
                  <p className="text-gray-600">Customer: {selectedOrder.customer_name}</p>
                  {selectedOrder.customer_email && (
                    <p className="text-sm text-gray-500">Email: {selectedOrder.customer_email}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Badge className={getStatusBadgeClass(selectedOrder.status)}>
                    {selectedOrder.status?.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {selectedOrder.is_recurring && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Repeat className="w-3 h-3 mr-1" />
                      Recurring
                    </Badge>
                  )}
                  {selectedOrder.isRecurringInstance && (
                    <Badge className="bg-blue-100 text-blue-800" title="Auto-generated recurring instance">
                      <Clock className="w-3 h-3 mr-1" />
                      Future Instance
                    </Badge>
                  )}
                  {selectedOrder.is_locked && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      🔒 Locked
                    </Badge>
                  )}
                </div>
              </div>

              {/* Recurring Instance Info Banner */}
              {selectedOrder.isRecurringInstance && (
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Future Recurring Instance</h4>
                      <p className="text-sm text-blue-800">
                        This is an automatically generated future occurrence of a recurring order. 
                        It will be created based on the original order's schedule when the time comes.
                      </p>
                      {selectedOrder.recurrence_pattern && (
                        <p className="text-sm text-blue-700 mt-2">
                          <span className="font-medium">Frequency:</span>{' '}
                          {selectedOrder.recurrence_pattern.frequency_type === 'daily' && 
                            `Every ${selectedOrder.recurrence_pattern.frequency_value || 1} day(s)`}
                          {selectedOrder.recurrence_pattern.frequency_type === 'weekly' && 
                            `Every ${selectedOrder.recurrence_pattern.frequency_value || 1} week(s)`}
                          {selectedOrder.recurrence_pattern.frequency_type === 'monthly' && 
                            `Every ${selectedOrder.recurrence_pattern.frequency_value || 1} month(s)`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cancelled Recurring Order Info Banner */}
              {selectedOrder.is_recurring && selectedOrder.status === 'cancelled' && !selectedOrder.isRecurringInstance && (
                <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300">
                  <div className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-900 mb-1">Recurring Order Cancelled</h4>
                      <p className="text-sm text-red-800">
                        This recurring order has been cancelled. No future instances will be generated or displayed in the calendar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Driver & Delivery Status Info */}
              {(selectedOrder.driver_name || selectedOrder.delivery_status) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  {selectedOrder.driver_name && (
                    <div>
                      <p className="text-xs text-teal-700 font-medium mb-1">Assigned Driver</p>
                      <p className="text-lg font-semibold text-teal-900">{selectedOrder.driver_name}</p>
                      {selectedOrder.assigned_at && (
                        <p className="text-xs text-teal-600 mt-1">
                          Assigned: {format(parseISO(selectedOrder.assigned_at), 'MMM dd, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedOrder.delivery_status && (
                    <div>
                      <p className="text-xs text-teal-700 font-medium mb-1">Delivery Status</p>
                      <Badge className={`text-sm ${
                        selectedOrder.delivery_status === 'delivered' ? 'bg-green-100 text-green-800' :
                        selectedOrder.delivery_status === 'out_for_delivery' ? 'bg-orange-100 text-orange-800' :
                        selectedOrder.delivery_status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedOrder.delivery_status?.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      {selectedOrder.picked_up_at && (
                        <p className="text-xs text-teal-600 mt-1">
                          Picked up: {format(parseISO(selectedOrder.picked_up_at), 'MMM dd, yyyy h:mm a')}
                        </p>
                      )}
                      {selectedOrder.delivered_at && (
                        <p className="text-xs text-teal-600 mt-1">
                          Delivered: {format(parseISO(selectedOrder.delivered_at), 'MMM dd, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Order Dates & Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedOrder.pickup_date && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">Pickup</span>
                    </div>
                    <p className="text-sm text-blue-900 font-medium">
                      {format(parseISO(selectedOrder.pickup_date), 'MMM dd, yyyy')}
                    </p>
                    <div className="flex items-start gap-2 mt-2">
                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{selectedOrder.pickup_address}</p>
                    </div>
                  </div>
                )}

                <div className={`p-4 bg-green-50 rounded-lg border border-green-200 ${!selectedOrder.pickup_date ? 'md:col-span-2' : ''}`}>
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">Delivery</span>
                  </div>
                  <p className="text-sm text-green-900 font-medium">
                    {selectedOrder.delivery_date && format(parseISO(selectedOrder.delivery_date), 'MMM dd, yyyy')}
                  </p>
                  <div className="flex items-start gap-2 mt-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800">{selectedOrder.delivery_address}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" />
                  Order Items
                </h4>
                <div className="border rounded-lg divide-y">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{item.sku_name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total with GST Breakdown - Hidden for drivers */}
              {!hidePricing && selectedOrder.total_amount && (
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200 space-y-2">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Base Amount:</span>
                    <span className="font-medium">${selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>GST (10%):</span>
                    <span className="font-medium">${(selectedOrder.total_amount * 0.10).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-teal-300">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-teal-600" />
                      <span className="font-semibold text-gray-900">Total Amount (Inc. GST)</span>
                    </div>
                    <span className="text-2xl font-bold text-teal-600">
                      ${(selectedOrder.total_amount * 1.10).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Order Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Order Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedOrder.created_at ? format(parseISO(selectedOrder.created_at), 'MMM dd, yyyy h:mm a') : 'N/A'}
                  </p>
                </div>
                {selectedOrder.updated_at && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Last Updated</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(parseISO(selectedOrder.updated_at), 'MMM dd, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                {selectedOrder.is_recurring && selectedOrder.next_occurrence_date && (
                  <div className="col-span-2">
                    <p className="text-xs text-purple-600 mb-1">Next Occurrence</p>
                    <p className="text-sm font-medium text-purple-900">
                      {format(parseISO(selectedOrder.next_occurrence_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              {selectedOrder.special_instructions && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Special Instructions</h4>
                  <p className="text-sm text-gray-700 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    {selectedOrder.special_instructions}
                  </p>
                </div>
              )}

              {/* Modification Request Info */}
              {selectedOrder.modification_requested && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    Modification Requested
                  </h4>
                  {selectedOrder.modification_details && (
                    <p className="text-sm text-orange-800">{selectedOrder.modification_details}</p>
                  )}
                  <p className="text-xs text-orange-600 mt-2">Status: {selectedOrder.modification_status || 'Pending'}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Day Orders List Dialog - For multiple orders on same day */}
      <Dialog open={showDayOrdersDialog} onOpenChange={setShowDayOrdersDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Orders for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dayOrders.delivery.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Deliveries ({dayOrders.delivery.length})
                </h3>
                <div className="space-y-2">
                  {dayOrders.delivery.map((order, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setShowDayOrdersDialog(false);
                        handleOrderClick(order);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{order.order_number}</span>
                          {order.is_recurring && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              <Repeat className="w-3 h-3 mr-1" />
                              Recurring
                            </Badge>
                          )}
                          {order.isRecurringInstance && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs" title="Auto-generated recurring instance">
                              <Clock className="w-3 h-3 mr-1" />
                              Future
                            </Badge>
                          )}
                        </div>
                        <Badge className={getStatusBadgeClass(order.status)}>
                          {order.status?.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-600">Customer</p>
                          <p className="font-medium text-gray-900">{order.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Time</p>
                          <p className="font-medium text-gray-900">
                            {order.delivery_date && format(parseISO(order.delivery_date), 'h:mm a')}
                          </p>
                        </div>
                        {order.driver_name && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-600">Driver</p>
                            <p className="font-medium text-teal-700">{order.driver_name}</p>
                          </div>
                        )}
                      </div>
                      {!hidePricing && order.total_amount && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm font-semibold text-teal-600">
                            Total: ${order.total_amount?.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderCalendar;
