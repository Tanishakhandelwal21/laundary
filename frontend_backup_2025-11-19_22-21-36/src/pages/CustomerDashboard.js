import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import DashboardLayout from "../components/DashboardLayout";
import OrderCalendar from "../components/OrderCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Package,
  AlertCircle,
  Plus,
  MapPin,
  Calendar,
  Lock,
  Unlock,
  Repeat,
  Edit,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  X,
  CheckCircle2,
  XCircle,
  DollarSign,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

function CustomerDashboard() {
  const { API, user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [cases, setCases] = useState([]);
  const [skus, setSkus] = useState([]);
  const [frequencyTemplates, setFrequencyTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] =
    useState(null);
  const [approvingModificationId, setApprovingModificationId] = useState(null);
  const [rejectingModificationId, setRejectingModificationId] = useState(null);

  // Get pricing values - use stored values from backend
  const getPricing = (order) => {
    return {
      basePrice: order.total_amount || 0,
      gst: order.gst_amount || (order.total_amount * 0.1),
      total: order.total_with_gst || (order.total_amount * 1.1)
    };
  };

  const generateInvoice = (order) => {
    const invoiceDate = new Date(order.delivery_date).toLocaleDateString(
      "en-AU"
    );
    const { basePrice, gst, total } = getPricing(order);

    let invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - Order ${order.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ##a0d5c1; padding-bottom: 20px; }
          .company-name { font-size: 28px; font-weight: bold; color: #a0d5c1; margin-bottom: 10px; }
          .abn { font-size: 14px; color: #666; margin-top: 5px; }
          .customer-section { margin: 30px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
          .customer-section h3 { margin-top: 0; color: #a0d5c1; font-size: 16px; }
          .customer-info { line-height: 1.8; }
          .order-details { margin: 30px 0; }
          .order-details h3 { color: #a0d5c1; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #a0d5c1; color: white; padding: 12px; text-align: left; font-weight: 600; }
          td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .totals { margin-top: 30px; text-align: right; }
          .total-row { display: flex; justify-content: flex-end; padding: 8px 0; font-size: 16px; }
          .total-row.grand-total { font-size: 20px; font-weight: bold; color: #a0d5c1; border-top: 2px solid #a0d5c1; padding-top: 15px; margin-top: 10px; }
          .total-label { width: 150px; text-align: right; padding-right: 20px; }
          .total-value { width: 120px; text-align: right; font-weight: 600; }
          .notice { margin-top: 40px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; }
          .notice strong { color: #d97706; }
          .hire-section { margin-top: 30px; padding: 20px; background-color: #e5faf3; border-radius: 5px; text-align: center; font-size: 18px; font-weight: bold; color: #a0d5c1; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/assets/logo.png" alt="Infinite Laundry Solutions" style="width: 120px; margin-bottom: 15px;">
          <div class="company-name">INFINITE LAUNDRY SOLUTIONS</div>
          <div class="abn">ABN: 20 671 606 901</div>
          <div class="abn">Address: 3/76 Mica Street, Carole Park, QLD, 4300</div>
        </div>
        <div class="customer-section">
          <h3>Customer Information</h3>
          <div class="customer-info">
            <strong>Customer Name:</strong> ${user?.full_name || 'Customer'}<br>
            <strong>Delivery Address:</strong> ${order.delivery_address}<br>
            <strong>Date of Delivery:</strong> ${invoiceDate}
          </div>
        </div>
        <div class="order-details">
          <h3>Order Details - ${order.order_number}</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>`;

    order.items.forEach((item) => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      invoiceHTML += `
              <tr>
                <td>${item.sku_name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">$${item.price.toFixed(2)}</td>
                <td style="text-align: right;">$${itemTotal}</td>
              </tr>`;
    });

    invoiceHTML += `
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">
              <div class="total-label">Subtotal (Ex GST):</div>
              <div class="total-value">$${basePrice.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">GST (10%):</div>
              <div class="total-value">$${gst.toFixed(2)}</div>
            </div>
            <div class="total-row grand-total">
              <div class="total-label">TOTAL (Inc GST):</div>
              <div class="total-value">$${total.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div class="notice">
          <strong>IMPORTANT:</strong> Any discrepancies must be notified within 24 hours of delivery.
        </div>
        <div class="hire-section">HIRE</div>
        <div class="footer">
          Thank you for your business!<br>
          Infinite Laundry Solutions
        </div>
      </body>
      </html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.print();
    };
  };

  // Filter & Sort
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderSortBy, setOrderSortBy] = useState("created_at");
  const [orderSortOrder, setOrderSortOrder] = useState("desc");
  const [orderStatusFilter, setOrderStatusFilter] = useState([]);
  const [orderDateFilter, setOrderDateFilter] = useState("all");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [orderDateField, setOrderDateField] = useState("delivery_date"); // 'created_at' | 'delivery_date'
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");

  // Case Filters
  const [caseSearchQuery, setCaseSearchQuery] = useState("");
  const [caseSortBy, setCaseSortBy] = useState("created_at");
  const [caseSortOrder, setCaseSortOrder] = useState("desc");
  const [caseStatusFilter, setCaseStatusFilter] = useState([]);
  const [casePriorityFilter, setCasePriorityFilter] = useState([]);
  const [caseTypeFilter, setCaseTypeFilter] = useState("all");

  // Delivery Tracking Filters
  const [deliveryDateFrom, setDeliveryDateFrom] = useState("");
  const [deliveryDateTo, setDeliveryDateTo] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState([]);

  // Addresses
  const [businessPickupAddress, setBusinessPickupAddress] = useState("");
  const [customerDeliveryAddress, setCustomerDeliveryAddress] = useState("");

  // Order form
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState({
    items: [],
    pickup_date: "",
    delivery_date: "",
    pickup_address: "",
    delivery_address: "",
    special_instructions: "",
    is_recurring: false,
    frequency_template_id: "",
  });
  const [orderItems, setOrderItems] = useState([
    { sku_id: "", sku_name: "", quantity: 1, price: 0 },
  ]);

  // Case form
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [caseForm, setCaseForm] = useState({
    type: "inquiry",
    subject: "",
    description: "",
    order_id: "",
    priority: "medium",
  });

  useEffect(() => {
    fetchData();
    fetchAddresses();
  }, [activeTab]);

  const fetchAddresses = async () => {
    try {
      const res = await axios.get(`${API}/config/addresses`);
      setBusinessPickupAddress(res.data.business_pickup_address);
      setCustomerDeliveryAddress(
        res.data.customer_delivery_address || user.address || ""
      );
    } catch (error) {
      console.error("Failed to fetch addresses", error);
      // Fallback to user address from context
      setCustomerDeliveryAddress(user.address || "");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "orders") {
        const [ordersRes, skusRes, templatesRes] = await Promise.all([
          axios.get(`${API}/orders`),
          axios.get(`${API}/skus-with-pricing/${user.id}`),
          axios.get(`${API}/frequency-templates`),
        ]);
        setOrders(ordersRes.data);
        // Filter to show only SKUs with custom pricing (starred items)
        const skusWithCustomPricing = skusRes.data.filter(
          (sku) => sku.has_custom_pricing
        );
        setSkus(skusWithCustomPricing);
        setFrequencyTemplates(templatesRes.data);
      } else if (activeTab === "cases") {
        const casesRes = await axios.get(`${API}/cases`);
        setCases(casesRes.data);
      } else if (activeTab === "delivery-tracking") {
        const ordersRes = await axios.get(`${API}/orders`);
        // Filter orders that have drivers assigned
        const ordersWithDrivers = ordersRes.data.filter(
          (order) => order.driver_id
        );
        setOrders(ordersWithDrivers);
      } else if (activeTab === "calendar") {
        // Fetch orders for calendar view
        const ordersRes = await axios.get(`${API}/orders`);
        setOrders(ordersRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get display name for order status
  const getStatusDisplayName = (status) => {
    const statusMap = {
      pending: "Pending",
      scheduled: "Scheduled",
      processing: "Processing",
      ready_for_pickup: "Order Ready for Pickup",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status;
  };

  const getFilteredAndSortedOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.order_number?.toLowerCase().includes(query) ||
          order.status?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (orderStatusFilter.length > 0) {
      filtered = filtered.filter((order) =>
        orderStatusFilter.includes(order.status)
      );
    }

    // Type filter
    if (orderTypeFilter !== "all") {
      filtered = filtered.filter((order) =>
        orderTypeFilter === "recurring"
          ? order.is_recurring
          : !order.is_recurring
      );
    }

    // Date filter
    if (orderDateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((order) => {
        const dateRaw =
          orderDateField === "delivery_date"
            ? order.delivery_date
            : order.created_at;
        const deliveryDate = dateRaw ? new Date(dateRaw) : null;
        if (!deliveryDate) return false;

        switch (orderDateFilter) {
          case "today":
            return deliveryDate.toDateString() === today.toDateString();
          case "week":
            // Get start of week (Sunday)
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            // Get end of week (Saturday)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return deliveryDate >= startOfWeek && deliveryDate <= endOfWeek;
          case "month":
            // Get start of month (1st day)
            const startOfMonth = new Date(
              today.getFullYear(),
              today.getMonth(),
              1
            );
            startOfMonth.setHours(0, 0, 0, 0);
            // Get end of month (last day)
            const endOfMonth = new Date(
              today.getFullYear(),
              today.getMonth() + 1,
              0
            );
            endOfMonth.setHours(23, 59, 59, 999);
            return deliveryDate >= startOfMonth && deliveryDate <= endOfMonth;
          case "custom":
            if (orderDateFrom && orderDateTo) {
              const fromDate = new Date(orderDateFrom);
              const toDate = new Date(orderDateTo);
              toDate.setHours(23, 59, 59, 999);
              return deliveryDate >= fromDate && deliveryDate <= toDate;
            } else if (orderDateFrom) {
              const fromDate = new Date(orderDateFrom);
              return deliveryDate >= fromDate;
            } else if (orderDateTo) {
              const toDate = new Date(orderDateTo);
              toDate.setHours(23, 59, 59, 999);
              return deliveryDate <= toDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (orderSortBy) {
        case "order_number":
          aVal = a.order_number || "";
          bVal = b.order_number || "";
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        case "total_amount":
          aVal = a.total_amount || 0;
          bVal = b.total_amount || 0;
          break;
        case "delivery_date":
          aVal = new Date(a.delivery_date || 0);
          bVal = new Date(b.delivery_date || 0);
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          break;
      }

      if (
        orderSortBy === "total_amount" ||
        orderSortBy === "delivery_date" ||
        orderSortBy === "created_at"
      ) {
        return orderSortOrder === "asc" ? aVal - bVal : bVal - aVal;
      } else {
        const comparison = aVal.toString().localeCompare(bVal.toString());
        return orderSortOrder === "asc" ? comparison : -comparison;
      }
    });

    return filtered;
  };

  const toggleStatusFilter = (status) => {
    setOrderStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const clearAllOrderFilters = () => {
    setOrderSearchQuery("");
    setOrderStatusFilter([]);
    setOrderDateFilter("all");
    setOrderDateFrom("");
    setOrderDateTo("");
    setOrderDateField("delivery_date");
    setOrderTypeFilter("all");
    setOrderSortBy("created_at");
    setOrderSortOrder("desc");
  };

  // Case Filter Functions
  const getFilteredAndSortedCases = () => {
    let filtered = [...cases];

    // Search filter
    if (caseSearchQuery.trim()) {
      const query = caseSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (caseItem) =>
          caseItem.case_number?.toLowerCase().includes(query) ||
          caseItem.subject?.toLowerCase().includes(query) ||
          caseItem.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (caseStatusFilter.length > 0) {
      filtered = filtered.filter((caseItem) =>
        caseStatusFilter.includes(caseItem.status)
      );
    }

    // Priority filter
    if (casePriorityFilter.length > 0) {
      filtered = filtered.filter((caseItem) =>
        casePriorityFilter.includes(caseItem.priority)
      );
    }

    // Type filter
    if (caseTypeFilter !== "all") {
      filtered = filtered.filter(
        (caseItem) => caseItem.type === caseTypeFilter
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (caseSortBy) {
        case "case_number":
          aVal = a.case_number || "";
          bVal = b.case_number || "";
          break;
        case "subject":
          aVal = a.subject || "";
          bVal = b.subject || "";
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        case "priority":
          aVal = a.priority || "";
          bVal = b.priority || "";
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          break;
      }

      if (caseSortBy === "created_at") {
        return caseSortOrder === "asc" ? aVal - bVal : bVal - aVal;
      } else {
        const comparison = aVal.toString().localeCompare(bVal.toString());
        return caseSortOrder === "asc" ? comparison : -comparison;
      }
    });

    return filtered;
  };

  const toggleCaseStatusFilter = (status) => {
    setCaseStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleCasePriorityFilter = (priority) => {
    setCasePriorityFilter((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const clearAllCaseFilters = () => {
    setCaseSearchQuery("");
    setCaseStatusFilter([]);
    setCasePriorityFilter([]);
    setCaseTypeFilter("all");
    setCaseSortBy("created_at");
    setCaseSortOrder("desc");
  };

  // Delivery Tracking Filter Function
  const getFilteredDeliveryOrders = () => {
    let filtered = [...orders].filter((order) => order.driver_id); // Only orders with drivers

    // Date range filter
    if (deliveryDateFrom) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.delivery_date);
        return orderDate >= new Date(deliveryDateFrom);
      });
    }
    if (deliveryDateTo) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.delivery_date);
        return orderDate <= new Date(deliveryDateTo);
      });
    }

    // Delivery status filter
    if (deliveryStatusFilter.length > 0) {
      filtered = filtered.filter((order) =>
        deliveryStatusFilter.includes(order.delivery_status || "assigned")
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  };

  const toggleDeliveryStatusFilter = (status) => {
    setDeliveryStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const clearDeliveryFilters = () => {
    setDeliveryDateFrom("");
    setDeliveryDateTo("");
    setDeliveryStatusFilter([]);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate submissions

    setSubmitting(true);
    try {
      const formData = {
        delivery_date: orderForm.delivery_date,
        pickup_address: orderForm.pickup_address,
        delivery_address: orderForm.delivery_address,
        special_instructions: orderForm.special_instructions,
        is_recurring: orderForm.is_recurring,
        items: orderItems.map((item) => {
          const sku = skus.find((s) => s.id === item.sku_id);
          if (!sku) {
            console.error("SKU not found for item:", item);
            throw new Error(`SKU not found for item: ${item.sku_id}`);
          }
          if (!sku.customer_price) {
            console.error("Customer price not set for SKU:", sku);
            throw new Error(`Customer price not available for ${sku.name}`);
          }
          return {
            sku_id: item.sku_id,
            sku_name: sku.name,
            quantity: parseInt(item.quantity),
            price: sku.customer_price, // All SKUs shown have custom pricing
          };
        }),
      };

      // Include recurring data only if is_recurring is true
      if (formData.is_recurring && orderForm.frequency_template_id) {
        const template = frequencyTemplates.find(
          (t) => t.id === orderForm.frequency_template_id
        );
        formData.recurrence_pattern = {
          frequency_type: template.frequency_type,
          frequency_value: template.frequency_value,
        };
      }

      await axios.post(`${API}/orders/customer`, formData);
      setShowOrderDialog(false);
      setOrderForm({
        items: [],
        pickup_date: "",
        delivery_date: "",
        pickup_address: "",
        delivery_address: "",
        special_instructions: "",
        is_recurring: false,
        frequency_template_id: "",
      });
      setOrderItems([{ sku_id: "", sku_name: "", quantity: 1, price: 0 }]);
      toast.success("Order created successfully!");
      fetchData();
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error(
        error.response?.data?.detail ||
          "Failed to create order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Ensure date shows in the input when editing existing orders
  const formatForDatetimeLocal = (isoString) => {
    try {
      if (!isoString) return "";
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    } catch (e) {
      console.error("Failed to format date for input:", isoString, e);
      return "";
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrderId(order.id);

    // For recurring orders, find the matching frequency template
    let templateId = order.frequency_template_id || "";
    if (order.is_recurring && order.recurrence_pattern && !templateId) {
      // Try to find matching template based on recurrence_pattern
      const matchingTemplate = frequencyTemplates.find(
        (t) =>
          t.frequency_type === order.recurrence_pattern.frequency_type &&
          t.frequency_value === order.recurrence_pattern.frequency_value
      );
      if (matchingTemplate) {
        templateId = matchingTemplate.id;
      }
    }

    setOrderForm({
      delivery_date: formatForDatetimeLocal(order.delivery_date),
      pickup_address: order.pickup_address,
      delivery_address: order.delivery_address,
      special_instructions: order.special_instructions || "",
      is_recurring: order.is_recurring || false,
      frequency_template_id: templateId,
    });
    setOrderItems(
      order.items.map((item) => ({
        sku_id: item.sku_id,
        sku_name: item.sku_name,
        quantity: item.quantity,
        price: item.price,
      }))
    );
    setShowOrderDialog(true);
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate submissions

    setSubmitting(true);
    try {
      // Find the order being edited
      const existingOrder = orders.find((o) => o.id === editingOrderId);

      const formData = {
        delivery_date: orderForm.delivery_date,
        pickup_address: orderForm.pickup_address,
        delivery_address: orderForm.delivery_address,
        special_instructions: orderForm.special_instructions,
        is_recurring: orderForm.is_recurring,
        items: orderItems.map((item) => {
          const sku = skus.find((s) => s.id === item.sku_id);
          if (!sku) {
            console.error("SKU not found for item:", item);
            throw new Error(`SKU not found for item: ${item.sku_id}`);
          }
          if (!sku.customer_price) {
            console.error("Customer price not set for SKU:", sku);
            throw new Error(`Customer price not available for ${sku.name}`);
          }
          return {
            sku_id: item.sku_id,
            sku_name: sku.name,
            quantity: parseInt(item.quantity),
            price: sku.customer_price,
          };
        }),
      };

      // Include recurring data if enabled
      if (formData.is_recurring && orderForm.frequency_template_id) {
        const template = frequencyTemplates.find(
          (t) => t.id === orderForm.frequency_template_id
        );
        if (template) {
          formData.frequency_template_id = template.id;
          formData.recurrence_pattern = {
            frequency_type: template.frequency_type,
            frequency_value: template.frequency_value,
          };
        }
      }

      // Check if there are any actual changes
      let hasChanges = false;

      // Check delivery_date (compare date portion only)
      const existingDate = formatForDatetimeLocal(existingOrder.delivery_date);
      if (formData.delivery_date !== existingDate) {
        hasChanges = true;
      }

      // Check delivery_address
      if (formData.delivery_address !== existingOrder.delivery_address) {
        hasChanges = true;
      }

      // Check special_instructions
      if (
        (formData.special_instructions || "") !==
        (existingOrder.special_instructions || "")
      ) {
        hasChanges = true;
      }

      // Check is_recurring
      if (formData.is_recurring !== existingOrder.is_recurring) {
        hasChanges = true;
      }

      // Check recurrence_pattern if recurring
      if (formData.is_recurring) {
        const existingPattern = existingOrder.recurrence_pattern;
        const newPattern = formData.recurrence_pattern;
        if (!existingPattern && newPattern) {
          hasChanges = true;
        } else if (existingPattern && !newPattern) {
          hasChanges = true;
        } else if (existingPattern && newPattern) {
          if (
            existingPattern.frequency_type !== newPattern.frequency_type ||
            existingPattern.frequency_value !== newPattern.frequency_value
          ) {
            hasChanges = true;
          }
        }
      }

      // Check items
      if (formData.items.length !== existingOrder.items.length) {
        hasChanges = true;
      } else {
        for (let i = 0; i < formData.items.length; i++) {
          const newItem = formData.items[i];
          const existingItem = existingOrder.items.find(
            (item) => item.sku_id === newItem.sku_id
          );
          if (!existingItem || existingItem.quantity !== newItem.quantity) {
            hasChanges = true;
            break;
          }
        }
      }

      // If no changes, just close the dialog
      if (!hasChanges) {
        toast.info("No changes detected. Order remains unchanged.");
        setShowOrderDialog(false);
        setEditingOrderId(null);
        setOrderForm({
          items: [],
          pickup_date: "",
          delivery_date: "",
          pickup_address: "",
          delivery_address: "",
          special_instructions: "",
          is_recurring: false,
          frequency_template_id: "",
        });
        setOrderItems([{ sku_id: "", sku_name: "", quantity: 1, price: 0 }]);
        setSubmitting(false);
        return;
      }

      // Customer edits require owner approval
      // Check if edit is allowed (must be before 11:59 PM the day before delivery)
      const deliveryDate = new Date(formData.delivery_date);
      const cutoffTime = new Date(deliveryDate);
      cutoffTime.setDate(cutoffTime.getDate() - 1);
      cutoffTime.setHours(23, 59, 59, 999);
      const now = new Date();

      if (now > cutoffTime) {
        toast.error(`Cannot edit order - deadline was ${cutoffTime.toLocaleString()}. Please contact support for urgent changes.`);
        setSubmitting(false);
        return;
      }

      await axios.put(`${API}/orders/${editingOrderId}/propose-modification`, formData);
      toast.success("Edit request submitted to owner for approval!");

      setShowOrderDialog(false);
      setEditingOrderId(null);
      setOrderForm({
        items: [],
        pickup_date: "",
        delivery_date: "",
        pickup_address: "",
        delivery_address: "",
        special_instructions: "",
        is_recurring: false,
        frequency_template_id: "",
      });
      setOrderItems([{ sku_id: "", sku_name: "", quantity: 1, price: 0 }]);
      fetchData();
    } catch (error) {
      console.error("Failed to update order:", error);
      toast.error(
        error.response?.data?.detail ||
          "Failed to update order. This order may be locked."
      );
    } finally {
      setSubmitting(false); // Reset submitting state
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate submissions

    setSubmitting(true);
    try {
      const caseData = {
        ...caseForm,
        customer_id: user.id,
        customer_name: user.full_name,
        customer_email: user.email,
      };
      await axios.post(`${API}/cases`, caseData);
      setShowCaseDialog(false);
      setCaseForm({
        type: "inquiry",
        subject: "",
        description: "",
        order_id: "",
        priority: "medium",
      });
      toast.success("Case submitted successfully!");
      fetchData();
    } catch (error) {
      console.error("Failed to create case:", error);
      toast.error(
        error.response?.data?.detail ||
          "Failed to create case. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      { sku_id: "", sku_name: "", quantity: 1, price: 0 },
    ]);
  };

  const removeOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    if (cancellingOrderId) return; // Prevent duplicate submissions

    setCancellingOrderId(orderId);
    try {
      await axios.delete(`${API}/orders/${orderId}`);
      toast.success("Order cancelled successfully!");
      fetchData();
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast.error(error.response?.data?.detail || "Failed to cancel order");
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleApproveModification = async (orderId) => {
    if (approvingModificationId) return; // Prevent duplicate submissions

    setApprovingModificationId(orderId);
    try {
      await axios.put(`${API}/orders/${orderId}/approve-modification`);
      toast.success("Modifications approved successfully!");
      // Add a small delay to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchData();
    } catch (error) {
      console.error("Failed to approve modification:", error);
      toast.error(
        error.response?.data?.detail || "Failed to approve modification"
      );
    } finally {
      setApprovingModificationId(null);
    }
  };

  const handleRejectModification = async (orderId) => {
    if (
      !window.confirm(
        "Are you sure you want to reject these modifications? The order will continue as originally scheduled."
      )
    )
      return;
    if (rejectingModificationId) return; // Prevent duplicate submissions

    setRejectingModificationId(orderId);
    try {
      await axios.put(`${API}/orders/${orderId}/reject-modification`);
      toast.success("Modifications rejected successfully!");
      // Add a small delay to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchData();
    } catch (error) {
      console.error("Failed to reject modification:", error);
      toast.error(
        error.response?.data?.detail || "Failed to reject modification"
      );
    } finally {
      setRejectingModificationId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "badge-pending";
      case "scheduled":
        return "badge-scheduled";
      case "processing":
        return "badge-processing";
      case "ready_for_pickup":
        return "badge-completed";
      case "out_for_delivery":
        return "badge-out-for-delivery";
      case "delivered":
        return "badge-completed";
      case "cancelled":
        return "badge-cancelled";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canModifyOrder = (deliveryDate, isLocked) => {
    // If order is already locked by backend, respect that
    if (isLocked) return false;

    if (!deliveryDate) return true; // No delivery date, allow modification

    try {
      // Parse delivery date (should be in YYYY-MM-DD format now)
      let deliveryDateObj;
      if (deliveryDate.includes("T")) {
        // Handle old datetime format
        deliveryDateObj = new Date(deliveryDate);
      } else {
        // Handle date-only format (YYYY-MM-DD)
        deliveryDateObj = new Date(deliveryDate + "T00:00:00");
      }

      // Check if date is valid
      if (isNaN(deliveryDateObj.getTime())) {
        console.error("Invalid delivery_date:", deliveryDate);
        return true; // Allow modification if date is invalid
      }

      // Calculate lock time: 8 hours before midnight (00:00) of delivery day
      // This means 4:00 PM (16:00) the day before
      const deliveryMidnight = new Date(deliveryDateObj);
      deliveryMidnight.setHours(0, 0, 0, 0);
      const lockTime = new Date(
        deliveryMidnight.getTime() - 8 * 60 * 60 * 1000
      );

      const now = new Date();
      const canEdit = now < lockTime;

      console.log(
        "Delivery date:",
        deliveryDateObj,
        "Lock time:",
        lockTime,
        "Can edit:",
        canEdit
      );

      // Allow modification if current time is before the lock time
      return canEdit;
    } catch (error) {
      console.error("Error checking order modification eligibility:", error);
      return true; // Allow modification if there's an error
    }
  };

  const formatFrequency = (template) => {
    const { frequency_type, frequency_value } = template;

    // Handle common cases with friendly names
    if (frequency_value === 1) {
      if (frequency_type === "daily") return "Daily";
      if (frequency_type === "weekly") return "Weekly";
      if (frequency_type === "monthly") return "Monthly";
    }

    if (frequency_value === 2 && frequency_type === "weekly")
      return "Bi-weekly";
    if (frequency_value === 2 && frequency_type === "monthly")
      return "Bi-monthly";

    // Default format for other cases
    const typeLabel =
      frequency_type === "daily"
        ? "day(s)"
        : frequency_type === "weekly"
        ? "week(s)"
        : "month(s)";
    return `Every ${frequency_value} ${typeLabel}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="spinner"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <div className="text-right">
            <p className="text-sm text-gray-600">Welcome back,</p>
            <p className="text-lg font-semibold text-gray-900">
              {user?.full_name}
            </p>
          </div>
        </div>

        {/* No Pricing Warning */}
        {skus.length === 0 && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    No Pricing Configured
                  </h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    You don't have any custom pricing set up yet. Please contact
                    your administrator to configure pricing for your account
                    before placing orders.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Orders
              </CardTitle>
              <Package className="w-5 h-5 text-teal-500" />
            </CardHeader>
            <CardContent>
              <div
                className="text-3xl font-bold text-gray-900"
                data-testid="customer-total-orders"
              >
                {orders.length}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Orders
              </CardTitle>
              <Package className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div
                className="text-3xl font-bold text-gray-900"
                data-testid="customer-active-orders"
              >
                {
                  orders.filter((o) =>
                    ["pending", "processing"].includes(o.status)
                  ).length
                }
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Open Cases
              </CardTitle>
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div
                className="text-3xl font-bold text-gray-900"
                data-testid="customer-open-cases"
              >
                {
                  cases.filter((c) =>
                    ["open", "in_progress"].includes(c.status)
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "orders"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="customer-orders-tab"
          >
            My Orders
          </button>
          <button
            onClick={() => setActiveTab("cases")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "cases"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="customer-cases-tab"
          >
            My Cases
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "calendar"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="customer-calendar-tab"
          >
            📅 Recurring Schedule
          </button>
          <button
            onClick={() => setActiveTab("delivery-tracking")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "delivery-tracking"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="customer-delivery-tracking-tab"
          >
            Delivery Tracking
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
              <Dialog
                open={showOrderDialog}
                onOpenChange={(open) => {
                  setShowOrderDialog(open);
                  if (!open) {
                    setEditingOrderId(null);
                    setOrderForm({
                      items: [],
                      pickup_date: "",
                      delivery_date: "",
                      pickup_address: "",
                      delivery_address: "",
                      special_instructions: "",
                      is_recurring: false,
                      frequency_template_id: "",
                    });
                    setOrderItems([
                      { sku_id: "", sku_name: "", quantity: 1, price: 0 },
                    ]);
                  } else if (!editingOrderId) {
                    // Auto-populate addresses when creating a new order
                    setOrderForm((prev) => ({
                      ...prev,
                      pickup_address: businessPickupAddress,
                      delivery_address: customerDeliveryAddress,
                    }));
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-teal-500 hover:bg-teal-600"
                    data-testid="customer-create-order-btn"
                    onClick={() => setEditingOrderId(null)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingOrderId ? "Edit Order" : "Create New Order"}
                    </DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={
                      editingOrderId ? handleUpdateOrder : handleCreateOrder
                    }
                    className="space-y-4"
                  >
                    <div>
                      <Label>Order Items</Label>
                      {orderItems.map((item, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Select
                            value={item.sku_id}
                            onValueChange={(value) =>
                              updateOrderItem(index, "sku_id", value)
                            }
                            required
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {skus.map((sku) => {
                                const gst = sku.customer_price * 0.1;
                                const total = sku.customer_price + gst;
                                return (
                                  <SelectItem key={sku.id} value={sku.id}>
                                    {sku.name} - $
                                    {sku.customer_price.toFixed(2)} + GST $
                                    {gst.toFixed(2)} = ${total.toFixed(2)} per
                                    unit
                                  </SelectItem>
                                );
                              })}
                              {skus.length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No items available. Contact admin to set up
                                  pricing.
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateOrderItem(index, "quantity", e.target.value)
                            }
                            className="w-20"
                            placeholder="Qty"
                            required
                          />
                          {orderItems.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => removeOrderItem(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addOrderItem}
                        className="mt-2"
                      >
                        Add Item
                      </Button>
                    </div>

                    <div>
                      <Label>Delivery Date</Label>
                      <Input
                        type="date"
                        value={orderForm.delivery_date}
                        onChange={(e) =>
                          setOrderForm({
                            ...orderForm,
                            delivery_date: e.target.value,
                          })
                        }
                        required
                        data-testid="customer-delivery-date"
                      />
                    </div>

                    <div>
                      <Label>Delivery Address</Label>
                      <Input
                        value={orderForm.delivery_address}
                        onChange={(e) =>
                          setOrderForm({
                            ...orderForm,
                            delivery_address: e.target.value,
                          })
                        }
                        required
                        data-testid="customer-delivery-address"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        🏠 Your saved delivery address (auto-filled, can be
                        changed)
                      </p>
                    </div>

                    <div>
                      <Label>Special Instructions</Label>
                      <Textarea
                        value={orderForm.special_instructions}
                        onChange={(e) =>
                          setOrderForm({
                            ...orderForm,
                            special_instructions: e.target.value,
                          })
                        }
                        data-testid="customer-instructions"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={orderForm.is_recurring}
                          onCheckedChange={(checked) =>
                            setOrderForm({
                              ...orderForm,
                              is_recurring: checked,
                            })
                          }
                          data-testid="customer-recurring-switch"
                          disabled={
                            editingOrderId &&
                            !canModifyOrder(
                              orders.find((o) => o.id === editingOrderId)
                                ?.delivery_date,
                              orders.find((o) => o.id === editingOrderId)
                                ?.is_locked
                            )
                          }
                        />
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <Repeat className="w-4 h-4 text-teal-600" />
                          Make this a recurring order
                        </Label>
                      </div>

                      {orderForm.is_recurring && (
                        <div>
                          <Label>Select Frequency Template</Label>
                          <Select
                            value={orderForm.frequency_template_id}
                            onValueChange={(value) =>
                              setOrderForm({
                                ...orderForm,
                                frequency_template_id: value,
                              })
                            }
                            disabled={
                              editingOrderId &&
                              !canModifyOrder(
                                orders.find((o) => o.id === editingOrderId)
                                  ?.delivery_date,
                                orders.find((o) => o.id === editingOrderId)
                                  ?.is_locked
                              )
                            }
                          >
                            <SelectTrigger data-testid="customer-frequency-template-select">
                              <SelectValue placeholder="Choose recurring frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencyTemplates.map((template) => (
                                <SelectItem
                                  key={template.id}
                                  value={template.id}
                                >
                                  {template.name} - {formatFrequency(template)}
                                </SelectItem>
                              ))}
                              {frequencyTemplates.length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No frequency templates available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-2">
                            This order will automatically repeat based on the
                            selected frequency
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Always show download receipt button when editing an order */}
                    {editingOrderId &&
                      orders.find((o) => o.id === editingOrderId) && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full mb-3"
                          onClick={() =>
                            generateInvoice(
                              orders.find((o) => o.id === editingOrderId)
                            )
                          }
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Download Delivery Receipt
                        </Button>
                      )}

                    <Button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600"
                      disabled={submitting}
                      data-testid="customer-order-submit-btn"
                    >
                      {submitting
                        ? "Processing..."
                        : editingOrderId
                        ? "Update Order"
                        : "Create Order"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filter & Sort Controls */}
            <Card className="mb-6">
              <CardContent className="pt-6 space-y-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by order number or status..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {(orderSearchQuery ||
                    orderStatusFilter.length > 0 ||
                    orderDateFilter !== "all" ||
                    orderDateFrom ||
                    orderDateTo ||
                    orderTypeFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllOrderFilters}
                      className="whitespace-nowrap"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Sort By */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">
                      Sort by:
                    </Label>
                    <Select value={orderSortBy} onValueChange={setOrderSortBy}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Sort by">
                          {orderSortBy === "created_at" && "Order Date"}
                          {orderSortBy === "delivery_date" && "Delivery Date"}
                          {orderSortBy === "status" && "Status"}
                          {orderSortBy === "total_amount" && "Amount"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Order Date</SelectItem>
                        <SelectItem value="delivery_date">
                          Delivery Date
                        </SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="total_amount">Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setOrderSortOrder(
                          orderSortOrder === "asc" ? "desc" : "asc"
                        )
                      }
                      title={
                        orderSortOrder === "asc" ? "Ascending" : "Descending"
                      }
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      {orderSortOrder === "asc" ? "↑" : "↓"}
                    </Button>
                  </div>

                  {/* Date Field */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">
                      Date field:
                    </Label>
                    <Select
                      value={orderDateField}
                      onValueChange={setOrderDateField}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select field">
                          {orderDateField === "created_at" && "Order Date"}
                          {orderDateField === "delivery_date" && "Delivery Date"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Order Date</SelectItem>
                        <SelectItem value="delivery_date">
                          Delivery Date
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Filter */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <Select
                      value={orderDateFilter}
                      onValueChange={setOrderDateFilter}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Select date">
                          {orderDateFilter === "all" && "All Dates"}
                          {orderDateFilter === "today" && "Today"}
                          {orderDateFilter === "week" && "This Week"}
                          {orderDateFilter === "month" && "This Month"}
                          {orderDateFilter === "custom" && "Custom Range"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dates</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range */}
                  {orderDateFilter === "custom" && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">From:</Label>
                      <Input
                        type="date"
                        value={orderDateFrom}
                        onChange={(e) => setOrderDateFrom(e.target.value)}
                        className="w-[150px]"
                      />
                      <Label className="text-sm whitespace-nowrap">To:</Label>
                      <Input
                        type="date"
                        value={orderDateTo}
                        onChange={(e) => setOrderDateTo(e.target.value)}
                        className="w-[150px]"
                      />
                    </div>
                  )}

                  {/* Type Filter */}
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-gray-500" />
                    <Select
                      value={orderTypeFilter}
                      onValueChange={setOrderTypeFilter}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Select type">
                          {orderTypeFilter === "all" && "All Types"}
                          {orderTypeFilter === "regular" && "Regular"}
                          {orderTypeFilter === "recurring" && "Recurring"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Label className="text-sm font-medium">Status:</Label>
                  {[
                    "pending",
                    "scheduled",
                    "processing",
                    "ready_for_pickup",
                    "out_for_delivery",
                    "delivered",
                    "cancelled",
                  ].map((status) => (
                    <button
                      key={status}
                      onClick={() => toggleStatusFilter(status)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        orderStatusFilter.includes(status)
                          ? "bg-teal-500 text-white border-teal-500"
                          : "bg-white text-gray-700 border-gray-300 hover:border-teal-500"
                      }`}
                    >
                      {getStatusDisplayName(status)}
                    </button>
                  ))}
                </div>

                {/* Results Count */}
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">
                    {getFilteredAndSortedOrders().length}
                  </span>{" "}
                  of <span className="font-semibold">{orders.length}</span>{" "}
                  orders
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Order Details
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Items & Total
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Dates & Address
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Instructions
                      </th>
                      <th className="text-center p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAndSortedOrders().length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center">
                          <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600 text-lg font-medium">
                            {orderSearchQuery ||
                            orderStatusFilter.length > 0 ||
                            orderDateFilter !== "all" ||
                            orderTypeFilter !== "all"
                              ? "No orders match your filters"
                              : "No orders yet"}
                          </p>
                          <p className="text-gray-500 text-sm mt-2">
                            {!(
                              orderSearchQuery ||
                              orderStatusFilter.length > 0 ||
                              orderDateFilter !== "all" ||
                              orderTypeFilter !== "all"
                            ) && "Create your first order to get started"}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      getFilteredAndSortedOrders().map((order) => (
                        <React.Fragment key={order.id}>
                          {/* Owner changes now apply directly - no customer approval needed */}
                          
                          {/* Order Data Row */}
                          <tr
                            className="border-b hover:bg-gray-50 transition-colors"
                            data-testid="customer-order-row"
                          >
                            {/* Order Details Column */}
                            <td className="p-4">
                              <div className="space-y-2">
                                <div className="font-semibold text-gray-900">
                                  {order.order_number}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span
                                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                                      order.status
                                    )}`}
                                  >
                                    {getStatusDisplayName(order.status)}
                                  </span>
                                  {order.is_recurring && (
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                                      <Repeat className="w-3 h-3" />
                                      Recurring
                                    </span>
                                  )}
                                  {order.modification_status ===
                                    "pending_owner_approval" && (
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Pending Owner Approval
                                    </span>
                                  )}
                                  {order.modification_status === "approved" && (
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                                      ✓ Edit Approved
                                    </span>
                                  )}
                                  {order.modification_status === "rejected" && (
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                                      ✗ Edit Rejected
                                    </span>
                                  )}
                                  {order.is_locked ? (
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
                                      Locked
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                                      <Unlock className="w-3 h-3" />
                                      Editable
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Created:{" "}
                                  {new Date(
                                    order.created_at
                                  ).toLocaleDateString()}
                                </div>
                                {order.is_recurring &&
                                  order.next_occurrence_date && (
                                    <div className="text-xs text-purple-600 font-medium">
                                      Next:{" "}
                                      {new Date(
                                        order.next_occurrence_date
                                      ).toLocaleDateString()}
                                    </div>
                                  )}
                              </div>
                            </td>

                            {/* Items & Total Column */}
                            <td className="p-4">
                              <div className="space-y-2">
                                <div className="text-sm">
                                  {order.items.slice(0, 2).map((item, idx) => (
                                    <div key={idx} className="text-gray-600">
                                      {item.sku_name} x{item.quantity} - $
                                      {(item.price * item.quantity).toFixed(2)}
                                    </div>
                                  ))}
                                  {order.items.length > 2 && (
                                    <div className="text-xs text-gray-500 italic">
                                      +{order.items.length - 2} more item
                                      {order.items.length - 2 > 1 ? "s" : ""}
                                    </div>
                                  )}
                                </div>
                                <div className="pt-2 border-t space-y-1">
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Base Amount:</span>
                                    <span>
                                      $
                                      {order.total_amount?.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>GST (10%):</span>
                                    <span>
                                      $
                                      {(order.gst_amount || order.total_amount * 0.1).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-baseline gap-2 pt-1 border-t">
                                    <DollarSign className="w-4 h-4 text-teal-600" />
                                    <span className="text-xl font-bold text-teal-600">
                                      ${(order.total_with_gst || order.total_amount * 1.1).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 text-center mt-1">
                                    Inc. GST
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Dates & Address Column */}
                            <td className="p-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <Calendar className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-medium text-gray-700">
                                      Delivery
                                    </div>
                                    <div className="text-gray-600">
                                      {new Date(
                                        order.delivery_date
                                      ).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500 line-clamp-2">
                                      {order.delivery_address}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status Column */}
                            <td className="p-4">
                              <div className="space-y-2">
                                {order.special_instructions && (
                                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    <div className="font-medium mb-1">
                                      Instructions:
                                    </div>
                                    <div className="line-clamp-2">
                                      {order.special_instructions}
                                    </div>
                                  </div>
                                )}
                                {!canModifyOrder(
                                  order.delivery_date,
                                  order.is_locked
                                ) &&
                                  order.status !== "ready_for_pickup" &&
                                  order.status !== "delivered" &&
                                  order.status !== "cancelled" && (
                                    <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded flex items-start gap-1">
                                      <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                      <span>Locked (8hrs before delivery)</span>
                                    </div>
                                  )}
                              </div>
                            </td>

                            {/* Actions Column */}
                            <td className="p-4">
                              <div className="flex flex-col gap-2">
                                {/* Always show download receipt button */}
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => generateInvoice(order)}
                                  className="w-full"
                                  title="Download delivery receipt"
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  Receipt
                                </Button>
                                
                                {/* Show edit/cancel only if order can be modified */}
                                {order.status !== "ready_for_pickup" &&
                                order.status !== "delivered" &&
                                order.status !== "cancelled" &&
                                canModifyOrder(
                                  order.delivery_date,
                                  order.is_locked
                                ) && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditOrder(order)}
                                      data-testid={`edit-order-${order.id}`}
                                      className="w-full"
                                      disabled={
                                        order.modification_status ===
                                        "pending_owner_approval"
                                      }
                                      title={
                                        order.modification_status ===
                                        "pending_owner_approval"
                                          ? "Edit request pending owner approval"
                                          : "Edit order"
                                      }
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      {order.modification_status ===
                                      "pending_owner_approval"
                                        ? "Pending"
                                        : "Edit"}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleCancelOrder(order.id)}
                                      disabled={cancellingOrderId === order.id}
                                      data-testid={`cancel-order-${order.id}`}
                                      className="w-full"
                                    >
                                      {cancellingOrderId === order.id ? (
                                        <>
                                          <Clock className="w-4 h-4 mr-1 animate-spin" />
                                          Cancelling...
                                        </>
                                      ) : (
                                        "Cancel"
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Cases Tab */}
        {activeTab === "cases" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Cases</h2>
              <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-teal-500 hover:bg-teal-600"
                    data-testid="create-case-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Raise a Case
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Raise a New Case</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCase} className="space-y-4">
                    <div>
                      <Label>Case Type</Label>
                      <Select
                        value={caseForm.type}
                        onValueChange={(value) =>
                          setCaseForm({ ...caseForm, type: value })
                        }
                      >
                        <SelectTrigger data-testid="case-type-select">
                          <SelectValue placeholder="Select case type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inquiry">
                            General Inquiry
                          </SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                          <SelectItem value="refund">Refund Request</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Related Order (Optional)</Label>
                      <Select
                        value={caseForm.order_id || undefined}
                        onValueChange={(value) =>
                          setCaseForm({ ...caseForm, order_id: value })
                        }
                      >
                        <SelectTrigger data-testid="case-order-select">
                          <SelectValue placeholder="Select order (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {orders.map((order) => (
                            <SelectItem key={order.id} value={order.id}>
                              {order.order_number}
                            </SelectItem>
                          ))}
                          {orders.length === 0 && (
                            <div className="p-2 text-sm text-gray-500">
                              No orders available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subject</Label>
                      <Input
                        value={caseForm.subject}
                        onChange={(e) =>
                          setCaseForm({ ...caseForm, subject: e.target.value })
                        }
                        required
                        data-testid="case-subject-input"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={caseForm.description}
                        onChange={(e) =>
                          setCaseForm({
                            ...caseForm,
                            description: e.target.value,
                          })
                        }
                        rows={5}
                        required
                        data-testid="case-description-input"
                      />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={caseForm.priority}
                        onValueChange={(value) =>
                          setCaseForm({ ...caseForm, priority: value })
                        }
                      >
                        <SelectTrigger data-testid="case-priority-select">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600"
                      disabled={submitting}
                      data-testid="case-submit-btn"
                    >
                      {submitting ? "Submitting..." : "Submit Case"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filter & Sort Controls */}
            <Card className="mb-6">
              <CardContent className="pt-6 space-y-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by case number, subject, or description..."
                      value={caseSearchQuery}
                      onChange={(e) => setCaseSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {(caseSearchQuery ||
                    caseStatusFilter.length > 0 ||
                    casePriorityFilter.length > 0 ||
                    caseTypeFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllCaseFilters}
                      className="whitespace-nowrap"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Sort By */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">
                      Sort by:
                    </Label>
                    <Select value={caseSortBy} onValueChange={setCaseSortBy}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date Created</SelectItem>
                        <SelectItem value="case_number">Case Number</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCaseSortOrder(
                          caseSortOrder === "asc" ? "desc" : "asc"
                        )
                      }
                      title={
                        caseSortOrder === "asc" ? "Ascending" : "Descending"
                      }
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      {caseSortOrder === "asc" ? "↑" : "↓"}
                    </Button>
                  </div>

                  {/* Type Filter */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">
                      Type:
                    </Label>
                    <Select
                      value={caseTypeFilter}
                      onValueChange={setCaseTypeFilter}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="inquiry">Inquiry</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Label className="text-sm font-medium">Status:</Label>
                  {["open", "in_progress", "resolved", "closed"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => toggleCaseStatusFilter(status)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          caseStatusFilter.includes(status)
                            ? "bg-teal-500 text-white border-teal-500"
                            : "bg-white text-gray-700 border-gray-300 hover:border-teal-500"
                        }`}
                      >
                        {status.replace("_", " ").toUpperCase()}
                      </button>
                    )
                  )}
                </div>

                {/* Priority Filter Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  <Label className="text-sm font-medium">Priority:</Label>
                  {["low", "medium", "high", "urgent"].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => toggleCasePriorityFilter(priority)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        casePriorityFilter.includes(priority)
                          ? "bg-teal-500 text-white border-teal-500"
                          : "bg-white text-gray-700 border-gray-300 hover:border-teal-500"
                      }`}
                    >
                      {priority.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Results Count */}
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">
                    {getFilteredAndSortedCases().length}
                  </span>{" "}
                  of <span className="font-semibold">{cases.length}</span> cases
                </div>
              </CardContent>
            </Card>

            {/* Cases Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Case Details
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Subject & Description
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Type
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Priority
                      </th>
                      <th className="text-left p-4 font-semibold text-gray-700 text-sm uppercase tracking-wide">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAndSortedCases().length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center">
                          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600 text-lg font-medium">
                            {caseSearchQuery ||
                            caseStatusFilter.length > 0 ||
                            casePriorityFilter.length > 0 ||
                            caseTypeFilter !== "all"
                              ? "No cases match your filters"
                              : "No cases found"}
                          </p>
                          <p className="text-gray-500 text-sm mt-2">
                            {!(
                              caseSearchQuery ||
                              caseStatusFilter.length > 0 ||
                              casePriorityFilter.length > 0 ||
                              caseTypeFilter !== "all"
                            ) && "Raise a case if you need assistance"}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      getFilteredAndSortedCases().map((caseItem) => (
                        <tr
                          key={caseItem.id}
                          className="border-b hover:bg-gray-50 transition-colors"
                          data-testid="customer-case-row"
                        >
                          {/* Case Details Column */}
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">
                                {caseItem.case_number}
                              </div>
                              <div className="text-xs text-gray-500">
                                Created:{" "}
                                {new Date(
                                  caseItem.created_at
                                ).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(
                                  caseItem.created_at
                                ).toLocaleTimeString()}
                              </div>
                            </div>
                          </td>

                          {/* Subject & Description Column */}
                          <td className="p-4">
                            <div className="space-y-2">
                              <div className="font-semibold text-gray-900">
                                {caseItem.subject}
                              </div>
                              <div className="text-sm text-gray-600 line-clamp-2">
                                {caseItem.description}
                              </div>
                              {caseItem.resolution && (
                                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                                  <div className="text-xs font-semibold text-green-800 mb-1">
                                    ✓ Resolution:
                                  </div>
                                  <div className="text-xs text-green-700 line-clamp-2">
                                    {caseItem.resolution}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Type Column */}
                          <td className="p-4">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800">
                              {caseItem.type}
                            </span>
                          </td>

                          {/* Priority Column */}
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                caseItem.priority === "urgent"
                                  ? "bg-red-100 text-red-800"
                                  : caseItem.priority === "high"
                                  ? "bg-orange-100 text-orange-800"
                                  : caseItem.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {caseItem.priority}
                            </span>
                          </td>

                          {/* Status Column */}
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                caseItem.status === "open"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : caseItem.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : caseItem.status === "resolved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {caseItem.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Delivery Tracking Tab - Professional Full-Width List */}
        {activeTab === "delivery-tracking" && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Delivery Tracking
              </h2>
              <p className="text-gray-600 mt-1">
                Track your order deliveries in real-time
              </p>
            </div>

            {/* Filters Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Filters
                  </h3>
                  {(deliveryDateFrom ||
                    deliveryDateTo ||
                    deliveryStatusFilter.length > 0) && (
                    <Button
                      onClick={clearDeliveryFilters}
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Date From */}
                  <div>
                    <Label className="text-sm font-medium mb-2">
                      Delivery Date From
                    </Label>
                    <Input
                      type="date"
                      value={deliveryDateFrom}
                      onChange={(e) => setDeliveryDateFrom(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <Label className="text-sm font-medium mb-2">
                      Delivery Date To
                    </Label>
                    <Input
                      type="date"
                      value={deliveryDateTo}
                      onChange={(e) => setDeliveryDateTo(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Delivery Status Filter */}
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium mb-2">
                      Delivery Status
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "assigned",
                        "picked_up",
                        "out_for_delivery",
                        "delivered",
                      ].map((status) => (
                        <button
                          key={status}
                          onClick={() => toggleDeliveryStatusFilter(status)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            deliveryStatusFilter.includes(status)
                              ? "bg-teal-500 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {status.replace("_", " ").toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders List */}
            {getFilteredDeliveryOrders().length > 0 ? (
              <div className="space-y-4">
                {getFilteredDeliveryOrders().map((order) => (
                  <Card
                    key={order.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Left Side - Status Indicator */}
                      <div
                        className={`md:w-2 ${
                          order.delivery_status === "delivered"
                            ? "bg-green-500"
                            : order.delivery_status === "out_for_delivery"
                            ? "bg-orange-500"
                            : order.delivery_status === "picked_up"
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                        }`}
                      ></div>

                      <CardContent className="flex-1 p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Order Info Column */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">
                                  {order.order_number}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Order Status:{" "}
                                  <span className="font-semibold">
                                    {getStatusDisplayName(order.status)}
                                  </span>
                                </p>
                              </div>
                              <span
                                className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap ${
                                  order.delivery_status === "delivered"
                                    ? "bg-green-100 text-green-800 border-2 border-green-500"
                                    : order.delivery_status ===
                                      "out_for_delivery"
                                    ? "bg-orange-100 text-orange-800 border-2 border-orange-500"
                                    : order.delivery_status === "picked_up"
                                    ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-500"
                                    : "bg-blue-100 text-blue-800 border-2 border-blue-500"
                                }`}
                              >
                                {order.delivery_status
                                  ?.replace("_", " ")
                                  .toUpperCase() || "ASSIGNED"}
                              </span>
                            </div>

                            {/* Driver & Amount Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                  <Truck className="w-5 h-5 text-teal-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Driver
                                  </p>
                                  <p className="font-semibold text-gray-900">
                                    {order.driver_name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <DollarSign className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Base Amount
                                  </p>
                                  <p className="font-semibold text-gray-900">
                                    $
                                    {order.total_amount?.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    GST: $
                                    {(order.gst_amount || order.total_amount * 0.1).toFixed(2)}
                                  </p>
                                  <p className="text-xs font-bold text-teal-600">
                                    Total: ${(order.total_with_gst || order.total_amount * 1.1).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Created
                                  </p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(
                                      order.created_at
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Addresses Grid */}
                            <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-4 h-4 text-green-600" />
                                  <span className="text-xs font-semibold text-gray-700">
                                    DELIVERY
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 ml-6">
                                  {order.delivery_address}
                                </p>
                                <p className="text-xs text-gray-500 ml-6 mt-1">
                                  {new Date(
                                    order.delivery_date
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Timeline Column */}
                          <div className="lg:w-64 border-l pl-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4">
                              Delivery Progress
                            </h4>
                            <div className="space-y-4">
                              {/* Assigned */}
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    order.assigned_at
                                      ? "bg-blue-500"
                                      : "bg-gray-300"
                                  }`}
                                >
                                  <CheckCircle
                                    className={`w-4 h-4 ${
                                      order.assigned_at
                                        ? "text-white"
                                        : "text-gray-500"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Assigned
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {order.assigned_at
                                      ? new Date(
                                          order.assigned_at
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "---"}
                                  </p>
                                </div>
                              </div>

                              {/* Picked Up */}
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    order.picked_up_at
                                      ? "bg-yellow-500"
                                      : "bg-gray-300"
                                  }`}
                                >
                                  <Package
                                    className={`w-4 h-4 ${
                                      order.picked_up_at
                                        ? "text-white"
                                        : "text-gray-500"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Picked Up
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {order.picked_up_at
                                      ? new Date(
                                          order.picked_up_at
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "---"}
                                  </p>
                                </div>
                              </div>

                              {/* Out for Delivery */}
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    order.delivery_status ===
                                      "out_for_delivery" ||
                                    order.delivery_status === "delivered"
                                      ? "bg-orange-500"
                                      : "bg-gray-300"
                                  }`}
                                >
                                  <Truck
                                    className={`w-4 h-4 ${
                                      order.delivery_status ===
                                        "out_for_delivery" ||
                                      order.delivery_status === "delivered"
                                        ? "text-white"
                                        : "text-gray-500"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Out for Delivery
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {order.delivery_status ===
                                      "out_for_delivery" ||
                                    order.delivery_status === "delivered"
                                      ? "In transit"
                                      : "---"}
                                  </p>
                                </div>
                              </div>

                              {/* Delivered */}
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    order.delivered_at
                                      ? "bg-green-500"
                                      : "bg-gray-300"
                                  }`}
                                >
                                  <CheckCircle
                                    className={`w-4 h-4 ${
                                      order.delivered_at
                                        ? "text-white"
                                        : "text-gray-500"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Delivered
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {order.delivered_at
                                      ? new Date(
                                          order.delivered_at
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "---"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Delivery Notes */}
                            {order.delivery_notes && (
                              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs font-semibold text-yellow-800 mb-1">
                                  Delivery Notes
                                </p>
                                <p className="text-xs text-yellow-700">
                                  {order.delivery_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <Truck className="w-20 h-20 text-gray-400 mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    No Deliveries Found
                  </h3>
                  <p className="text-gray-600 mb-1">
                    {orders.filter((o) => o.driver_id).length === 0
                      ? "You don't have any active deliveries at the moment"
                      : "No deliveries match your filter criteria"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Orders with assigned drivers will appear here for tracking
                  </p>
                  {(deliveryDateFrom ||
                    deliveryDateTo ||
                    deliveryStatusFilter.length > 0) && (
                    <Button
                      onClick={clearDeliveryFilters}
                      variant="outline"
                      className="mt-4"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Orders Calendar
              </h2>
              <p className="text-gray-600 mt-1">
                View all your orders in calendar view
              </p>
            </div>
            <OrderCalendar orders={orders} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default CustomerDashboard;
