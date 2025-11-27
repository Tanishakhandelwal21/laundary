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
  Users,
  AlertCircle,
  Plus,
  Edit,
  Lock,
  Unlock,
  Repeat,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Trash2,
  DollarSign,
  Ban,
  CheckCircle2,
  Key,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

function AdminDashboard() {
  const { API, user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [cases, setCases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [skus, setSkus] = useState([]);
  const [frequencyTemplates, setFrequencyTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderForTracking, setSelectedOrderForTracking] =
    useState(null);

  // SKU management
  const [showSkuDialog, setShowSkuDialog] = useState(false);
  const [editingSku, setEditingSku] = useState(null);
  const [skuForm, setSkuForm] = useState({
    name: "",
    category: "",
    price: "",
    unit: "",
    description: "",
  });
  const [creatingSku, setCreatingSku] = useState(false);
  const [deletingSkuId, setDeletingSkuId] = useState(null);

  // Customer Pricing
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerPricing, setCustomerPricing] = useState([]);
  const [skusWithPricing, setSkusWithPricing] = useState([]);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    sku_id: "",
    custom_price: "",
  });
  const [creatingPricing, setCreatingPricing] = useState(false);
  const [deletingPricingId, setDeletingPricingId] = useState(null);

  // Loading states for operations
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [updatingCaseId, setUpdatingCaseId] = useState(null);
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState(null);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState(null);
  const [togglingUserId, setTogglingUserId] = useState(null);
  // User edit
  const [showUserEditDialog, setShowUserEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userEditForm, setUserEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    role: "",
  });
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  // Calculate GST (10%)
  const calculateGST = (amount) => {
    // amount is the base price (ex-GST) stored in total_amount
    const basePrice = amount;
    const gst = amount * 0.1;
    const total = amount + gst;
    return { basePrice, gst, total };
  };

  const generateInvoice = (order) => {
    const invoiceDate = new Date(order.delivery_date).toLocaleDateString(
      "en-AU"
    );
    // Calculate total from actual items to ensure consistency
    const itemsTotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const { basePrice, gst, total } = calculateGST(itemsTotal);

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
            <strong>Customer Name:</strong> ${order.customer_name}<br>
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

  // Password reset
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // Users Filter & Sort
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSortBy, setUserSortBy] = useState("created_at");
  const [userSortOrder, setUserSortOrder] = useState("desc");
  const [userRoleFilter, setUserRoleFilter] = useState([]);

  // Pagination for users
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userItemsPerPage] = useState(20);

  // SKUs Filter & Sort
  const [skuSearchQuery, setSkuSearchQuery] = useState("");
  const [skuSortBy, setSkuSortBy] = useState("name");
  const [skuSortOrder, setSkuSortOrder] = useState("asc");
  const [skuCategoryFilter, setSkuCategoryFilter] = useState([]);

  // Cases Filter & Sort
  const [caseSearchQuery, setCaseSearchQuery] = useState("");
  const [caseSortBy, setCaseSortBy] = useState("created_at");
  const [caseSortOrder, setCaseSortOrder] = useState("desc");
  const [caseStatusFilter, setCaseStatusFilter] = useState([]);
  const [casePriorityFilter, setCasePriorityFilter] = useState([]);
  const [caseDateFrom, setCaseDateFrom] = useState("");
  const [caseDateTo, setCaseDateTo] = useState("");

  // Orders Filter & Sort
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderSortBy, setOrderSortBy] = useState("created_at");
  const [orderSortOrder, setOrderSortOrder] = useState("desc");
  const [orderStatusFilter, setOrderStatusFilter] = useState([]);
  const [orderRecurringFilter, setOrderRecurringFilter] = useState("all"); // 'all', 'recurring', 'one-time'
  const [orderLockFilter, setOrderLockFilter] = useState("all"); // 'all', 'locked', 'unlocked'

  // Pagination for orders
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Delivery Tracking Filters
  const [deliveryDateFrom, setDeliveryDateFrom] = useState("");
  const [deliveryDateTo, setDeliveryDateTo] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState([]);

  // Driver assignment
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState({});

  // Pending edit requests
  const [pendingEditRequests, setPendingEditRequests] = useState([]);
  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [selectedEditRequest, setSelectedEditRequest] = useState(null);
  const [editRequestAction, setEditRequestAction] = useState("approve"); // 'approve', 'modify', 'reject'
  const [editRequestForm, setEditRequestForm] = useState({});
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [processingEditRequest, setProcessingEditRequest] = useState(false);

  // Order form
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const PERMANENT_PICKUP_ADDRESS = "3/76 Mica Street, Carole Park, QLD, 4300";
  const [orderForm, setOrderForm] = useState({
    customer_id: "",
    customer_name: "",
    customer_email: "",
    items: [],
    delivery_date: "",
    pickup_address: PERMANENT_PICKUP_ADDRESS,
    delivery_address: "",
    special_instructions: "",
    is_recurring: false,
    frequency_template_id: "",
  });
  const [orderItems, setOrderItems] = useState([
    { sku_id: "", sku_name: "", quantity: 1, price: 0 },
  ]);
  const [filteredSkus, setFilteredSkus] = useState([]);

  // Helper function to get default delivery date (tomorrow at 10 AM)
  const getDefaultDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  };

  // Helper function to format date for datetime-local input
  const formatDateForInput = (dateString) => {
    if (!dateString) return getDefaultDeliveryDate();
    
    // If it's already in datetime-local format (YYYY-MM-DDTHH:MM), return as is
    if (dateString.includes('T') && dateString.length >= 16) {
      return dateString.slice(0, 16);
    }
    
    // If it's just a date (YYYY-MM-DD), add default time (10:00 AM)
    if (dateString.length === 10) {
      return `${dateString}T10:00`;
    }
    
    // Try parsing as ISO string and format
    try {
      const date = new Date(dateString);
      return date.toISOString().slice(0, 16);
    } catch {
      return getDefaultDeliveryDate();
    }
  };

  // Case update
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [caseUpdate, setCaseUpdate] = useState({
    status: "",
    resolution: "",
    priority: "",
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Fetch customer-specific SKUs when customer is selected
  useEffect(() => {
    const fetchCustomerSkus = async () => {
      if (orderForm.customer_id) {
        try {
          const response = await axios.get(
            `${API}/skus-with-pricing/${orderForm.customer_id}`
          );
          setFilteredSkus(response.data);
        } catch (error) {
          console.error("Error fetching customer SKUs:", error);
          // If error, fall back to all SKUs
          setFilteredSkus(skus);
        }
      } else {
        // No customer selected, show all SKUs
        setFilteredSkus(skus);
      }
    };

    if (skus.length > 0) {
      fetchCustomerSkus();
    }
  }, [orderForm.customer_id, skus, API]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "orders") {
        const [
          ordersRes,
          customersRes,
          skusRes,
          templatesRes,
          driversRes,
          editRequestsRes,
        ] = await Promise.all([
          axios.get(`${API}/orders`),
          axios.get(`${API}/users`),
          axios.get(`${API}/skus`),
          axios.get(`${API}/frequency-templates`),
          axios.get(`${API}/drivers`),
          axios.get(`${API}/orders/pending-edit-requests`),
        ]);
        setOrders(ordersRes.data);
        setCustomers(customersRes.data.filter((u) => u.role === "customer"));
        setSkus(skusRes.data);
        setFrequencyTemplates(templatesRes.data);
        setDrivers(driversRes.data);
        setPendingEditRequests(editRequestsRes.data);
      } else if (activeTab === "cases") {
        const casesRes = await axios.get(`${API}/cases`);
        setCases(casesRes.data);
      } else if (activeTab === "users") {
        const usersRes = await axios.get(`${API}/users`);
        setCustomers(usersRes.data);
      } else if (activeTab === "delivery-tracking") {
        const ordersRes = await axios.get(`${API}/orders`);
        setOrders(ordersRes.data);
      } else if (activeTab === "calendar") {
        // Fetch orders for calendar view
        const ordersRes = await axios.get(`${API}/orders`);
        setOrders(ordersRes.data);
      } else if (activeTab === "skus") {
        const skusRes = await axios.get(`${API}/skus`);
        setSkus(skusRes.data);
      } else if (activeTab === "pricing") {
        const [customersRes, skusRes] = await Promise.all([
          axios.get(`${API}/users`),
          axios.get(`${API}/skus`),
        ]);
        setCustomers(customersRes.data.filter((u) => u.role === "customer"));
        setSkus(skusRes.data);
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

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (creatingOrder || editingOrderId) return; // Prevent duplicate submissions

    try {
      if (isEditMode && editingOrder) {
        setEditingOrderId(editingOrder.id);
      } else {
        setCreatingOrder(true);
      }

      const customer = customers.find((c) => c.id === orderForm.customer_id);
      const formData = {
        ...orderForm,
        customer_name: customer.full_name,
        customer_email: customer.email,
        items: orderItems.map((item) => {
          const sku = filteredSkus.find((s) => s.id === item.sku_id);
          const price =
            sku.customer_price !== undefined ? sku.customer_price : sku.price;
          return {
            sku_id: item.sku_id,
            sku_name: sku.name,
            quantity: parseInt(item.quantity),
            price: price,
          };
        }),
      };

      // Include recurring data only if is_recurring is true
      if (formData.is_recurring && formData.frequency_template_id) {
        const template = frequencyTemplates.find(
          (t) => t.id === formData.frequency_template_id
        );
        formData.recurrence_pattern = {
          frequency_type: template.frequency_type,
          frequency_value: template.frequency_value,
        };
      }

      if (isEditMode && editingOrder) {
        await axios.put(`${API}/orders/${editingOrder.id}`, formData);
      } else {
        await axios.post(`${API}/orders`, formData);
      }

      setShowOrderDialog(false);
      setIsEditMode(false);
      setEditingOrder(null);
      setOrderForm({
        customer_id: "",
        customer_name: "",
        customer_email: "",
        items: [],
        delivery_date: "",
        pickup_address: PERMANENT_PICKUP_ADDRESS,
        delivery_address: "",
        special_instructions: "",
        is_recurring: false,
        frequency_template_id: "",
      });
      setOrderItems([{ sku_id: "", sku_name: "", quantity: 1, price: 0 }]);
      fetchData();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          `Failed to ${isEditMode ? "update" : "create"} order`
      );
    } finally {
      setCreatingOrder(false);
      setEditingOrderId(null);
    }
  };

  const handleEditOrder = (order) => {
    setIsEditMode(true);
    setEditingOrder(order);

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
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      delivery_date: formatDateForInput(order.delivery_date),
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

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    if (deletingOrderId) return; // Prevent duplicate deletions

    try {
      setDeletingOrderId(orderId);
      await axios.delete(`${API}/orders/${orderId}`);
      fetchData();
    } catch (error) {
      alert("Failed to delete order");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    if (updatingStatusOrderId) return; // Prevent duplicate updates

    try {
      setUpdatingStatusOrderId(orderId);
      await axios.put(`${API}/orders/${orderId}`, { status: newStatus });
      fetchData();
    } catch (error) {
      alert("Failed to update order status");
    } finally {
      setUpdatingStatusOrderId(null);
    }
  };

  const handleRecalculateOrder = async (order) => {
    if (
      !window.confirm("Recalculate this order with current customer pricing?")
    )
      return;

    try {
      // Fetch customer-specific SKUs
      const skuResponse = await axios.get(
        `${API}/skus-with-pricing/${order.customer_id}`
      );
      const customerSkus = skuResponse.data;

      // Recalculate items with correct pricing
      const updatedItems = order.items.map((item) => {
        const sku = customerSkus.find((s) => s.id === item.sku_id);
        const price =
          sku?.customer_price !== undefined
            ? sku.customer_price
            : sku?.price || item.price;
        return {
          sku_id: item.sku_id,
          sku_name: item.sku_name,
          quantity: item.quantity,
          price: price,
        };
      });

      const updateData = {
        items: updatedItems,
        delivery_date: order.delivery_date,
        delivery_address: order.delivery_address,
        pickup_address: order.pickup_address,
        special_instructions: order.special_instructions || "",
        is_recurring: order.is_recurring || false,
      };

      if (order.frequency_template_id) {
        updateData.frequency_template_id = order.frequency_template_id;
      }

      await axios.put(`${API}/orders/${order.id}`, updateData);
      alert("Order recalculated successfully!");
      fetchData();
    } catch (error) {
      console.error("Recalculation error:", error);
      alert(
        "Failed to recalculate order: " +
          (error.response?.data?.detail || error.message)
      );
    }
  };

  const handleAssignDriver = async (orderId) => {
    const driverId = selectedDriver[orderId];
    if (!driverId) {
      toast.error("Please select a driver");
      return;
    }
    try {
      await axios.put(`${API}/orders/${orderId}/assign-driver`, {
        driver_id: driverId,
      });
      toast.success("Driver assigned successfully");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to assign driver");
    }
  };

  const handleUnassignDriver = async (orderId) => {
    if (
      !window.confirm(
        "Are you sure you want to unassign the driver from this order?"
      )
    ) {
      return;
    }
    try {
      await axios.put(`${API}/orders/${orderId}/unassign-driver`);
      toast.success("Driver unassigned successfully");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to unassign driver");
    }
  };

  const handleViewEditRequest = (order) => {
    setSelectedEditRequest(order);
    setEditRequestForm({
      delivery_date:
        order.pending_modifications?.delivery_date || order.delivery_date,
      delivery_address:
        order.pending_modifications?.delivery_address || order.delivery_address,
      special_instructions:
        order.pending_modifications?.special_instructions ||
        order.special_instructions,
      items: order.pending_modifications?.items || order.items,
      recurrence_pattern:
        order.pending_modifications?.recurrence_pattern ||
        order.recurrence_pattern,
    });
    setEditRequestAction("approve");
    setRejectionReason("");
    setAdminNotes("");
    setShowEditRequestDialog(true);
  };

  const handleProcessEditRequest = async () => {
    if (processingEditRequest) return;

    if (editRequestAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessingEditRequest(true);
    try {
      const payload = {
        action: editRequestAction,
        rejection_reason:
          editRequestAction === "reject" ? rejectionReason : undefined,
        admin_notes: adminNotes || undefined,
      };

      // Include modified data if action is 'modify'
      if (editRequestAction === "modify") {
        payload.delivery_date = editRequestForm.delivery_date;
        payload.delivery_address = editRequestForm.delivery_address;
        payload.special_instructions = editRequestForm.special_instructions;
        payload.items = editRequestForm.items;
        payload.recurrence_pattern = editRequestForm.recurrence_pattern;
      }

      await axios.put(
        `${API}/orders/${selectedEditRequest.id}/review-edit-request`,
        payload
      );

      const actionText =
        editRequestAction === "reject"
          ? "rejected"
          : editRequestAction === "modify"
          ? "modified and approved"
          : "approved";
      toast.success(`Edit request ${actionText} successfully!`);

      setShowEditRequestDialog(false);
      setSelectedEditRequest(null);
      fetchData();
    } catch (error) {
      console.error("Failed to process edit request:", error);
      toast.error(
        error.response?.data?.detail || "Failed to process edit request"
      );
    } finally {
      setProcessingEditRequest(false);
    }
  };

  const handleUpdateCase = async (e) => {
    e.preventDefault();
    if (updatingCaseId) return; // Prevent duplicate submissions

    try {
      setUpdatingCaseId(selectedCase.id);
      await axios.put(`${API}/cases/${selectedCase.id}`, caseUpdate);
      setShowCaseDialog(false);
      setSelectedCase(null);
      setCaseUpdate({ status: "", resolution: "", priority: "" });
      fetchData();
    } catch (error) {
      alert("Failed to update case");
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const action = user.is_active ? "disable" : "enable";
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${user.full_name}'s account?`
      )
    )
      return;

    setTogglingUserId(user.id);
    try {
      await axios.put(`${API}/admin/users/${user.id}/toggle-status`);
      toast.success(`User account ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} user`);
    } finally {
      setTogglingUserId(null);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to reset the password for ${selectedUser?.full_name}?`
      )
    ) {
      return;
    }

    setResettingPasswordUserId(selectedUser.id);
    try {
      await axios.put(`${API}/admin/reset-password/${selectedUser.id}`, {
        new_password: newPassword,
      });
      toast.success("Password reset successfully");
      setShowPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (error) {
      console.error("Failed to reset password:", error);
      toast.error(error.response?.data?.detail || "Failed to reset password");
    } finally {
      setResettingPasswordUserId(null);
    }
  };

  const openPasswordResetDialog = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowPasswordDialog(true);
  };

  const openUserEditDialog = (u) => {
    setEditingUser(u);
    setUserEditForm({
      full_name: u.full_name || "",
      email: u.email || "",
      phone: u.phone || "",
      address: u.address || "",
      role: u.role || "customer",
    });
    setShowUserEditDialog(true);
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSavingUserEdit(true);
      const payload = {};
      // Send only changed fields
      if (userEditForm.full_name !== editingUser.full_name)
        payload.full_name = userEditForm.full_name;
      if (userEditForm.email !== editingUser.email)
        payload.email = userEditForm.email;
      if ((userEditForm.phone || "") !== (editingUser.phone || ""))
        payload.phone = userEditForm.phone;
      if ((userEditForm.address || "") !== (editingUser.address || ""))
        payload.address = userEditForm.address;
      if (userEditForm.role !== editingUser.role)
        payload.role = userEditForm.role;

      await axios.put(`${API}/users/${editingUser.id}`, payload);
      toast.success("User updated successfully");
      setShowUserEditDialog(false);
      setEditingUser(null);
      fetchData();
    } catch (error) {
      console.error("Failed to update user", error);
      toast.error(error.response?.data?.detail || "Failed to update user");
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleLockOrder = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/lock`);
      toast.success("Order locked successfully");
      fetchData(); // Refresh orders
    } catch (error) {
      console.error("Failed to lock order:", error);
      toast.error(error.response?.data?.detail || "Failed to lock order");
    }
  };

  const handleUnlockOrder = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/unlock`);
      toast.success("Order unlocked successfully");
      fetchData(); // Refresh orders
    } catch (error) {
      console.error("Failed to unlock order:", error);
      toast.error(error.response?.data?.detail || "Failed to unlock order");
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "badge-pending";
      case "processing":
        return "badge-processing";
      case "ready_for_pickup":
        return "badge-completed";
      case "delivered":
        return "badge-completed";
      case "cancelled":
        return "badge-cancelled";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // SKU Management Functions
  const handleCreateSku = async (e) => {
    e.preventDefault();
    if (creatingSku) return;

    try {
      setCreatingSku(true);
      if (editingSku) {
        await axios.put(`${API}/skus/${editingSku.id}`, skuForm);
        toast.success("SKU updated successfully");
      } else {
        await axios.post(`${API}/skus`, skuForm);
        toast.success("SKU created successfully");
      }
      setShowSkuDialog(false);
      setEditingSku(null);
      setSkuForm({
        name: "",
        category: "",
        price: "",
        unit: "",
        description: "",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to save SKU", error);
      toast.error(
        error.response?.data?.detail ||
          `Failed to ${editingSku ? "update" : "create"} SKU`
      );
    } finally {
      setCreatingSku(false);
    }
  };

  const handleEditSku = (sku) => {
    setEditingSku(sku);
    setSkuForm({
      name: sku.name,
      category: sku.category,
      price: sku.price.toString(),
      unit: sku.unit,
      description: sku.description || "",
    });
    setShowSkuDialog(true);
  };

  const handleDeleteSku = async (skuId) => {
    if (!window.confirm("Are you sure you want to delete this SKU?")) return;
    if (deletingSkuId) return;

    try {
      setDeletingSkuId(skuId);
      await axios.delete(`${API}/skus/${skuId}`);
      toast.success("SKU deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Failed to delete SKU", error);
      toast.error(error.response?.data?.detail || "Failed to delete SKU");
    } finally {
      setDeletingSkuId(null);
    }
  };

  // Customer Pricing Functions
  const handleSelectCustomer = async (customerId) => {
    if (!customerId) {
      setSelectedCustomer(null);
      setCustomerPricing([]);
      setSkusWithPricing([]);
      return;
    }

    try {
      const customer = customers.find((c) => c.id === customerId);
      setSelectedCustomer(customer);

      const pricingRes = await axios.get(
        `${API}/customer-pricing/${customerId}`
      );
      setCustomerPricing(pricingRes.data);

      const skusWithCustomPrices = skus.map((sku) => {
        const customPrice = pricingRes.data.find((p) => p.sku_id === sku.id);
        return {
          ...sku,
          custom_price: customPrice ? customPrice.custom_price : null,
          pricing_id: customPrice ? customPrice.id : null,
        };
      });
      setSkusWithPricing(skusWithCustomPrices);
    } catch (error) {
      console.error("Failed to fetch customer pricing", error);
      toast.error("Failed to load customer pricing");
    }
  };

  const handleCreatePricing = async (e) => {
    e.preventDefault();
    if (creatingPricing || !selectedCustomer) return;

    try {
      setCreatingPricing(true);
      await axios.post(`${API}/customer-pricing`, {
        customer_id: selectedCustomer.id,
        sku_id: pricingForm.sku_id,
        custom_price: parseFloat(pricingForm.custom_price),
      });
      toast.success("Custom pricing added successfully");
      setShowPricingDialog(false);
      setPricingForm({ sku_id: "", custom_price: "" });
      handleSelectCustomer(selectedCustomer.id);
    } catch (error) {
      console.error("Failed to create pricing", error);
      toast.error(
        error.response?.data?.detail || "Failed to add custom pricing"
      );
    } finally {
      setCreatingPricing(false);
    }
  };

  const handleDeletePricing = async (pricingId) => {
    if (!window.confirm("Are you sure you want to remove this custom pricing?"))
      return;
    if (deletingPricingId || !selectedCustomer) return;

    try {
      setDeletingPricingId(pricingId);
      await axios.delete(`${API}/customer-pricing/${pricingId}`);
      toast.success("Custom pricing removed successfully");
      handleSelectCustomer(selectedCustomer.id);
    } catch (error) {
      console.error("Failed to delete pricing", error);
      toast.error(
        error.response?.data?.detail || "Failed to remove custom pricing"
      );
    } finally {
      setDeletingPricingId(null);
    }
  };

  // Filter and Sort Functions
  const getFilteredAndSortedUsers = () => {
    let filtered = [...customers];

    // Search filter
    if (userSearchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name
            .toLowerCase()
            .includes(userSearchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
    }

    // Role filter
    if (userRoleFilter.length > 0) {
      filtered = filtered.filter((user) => userRoleFilter.includes(user.role));
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (userSortBy) {
        case "name":
          aVal = a.full_name.toLowerCase();
          bVal = b.full_name.toLowerCase();
          break;
        case "email":
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case "role":
          aVal = a.role;
          bVal = b.role;
          break;
        case "created_at":
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return userSortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return userSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const getFilteredAndSortedSkus = () => {
    let filtered = [...skus];

    // Search filter
    if (skuSearchQuery) {
      filtered = filtered.filter(
        (sku) =>
          sku.name.toLowerCase().includes(skuSearchQuery.toLowerCase()) ||
          (sku.description &&
            sku.description
              .toLowerCase()
              .includes(skuSearchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (skuCategoryFilter.length > 0) {
      filtered = filtered.filter((sku) =>
        skuCategoryFilter.includes(sku.category)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (skuSortBy) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "category":
          aVal = a.category.toLowerCase();
          bVal = b.category.toLowerCase();
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return skuSortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return skuSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const clearUserFilters = () => {
    setUserSearchQuery("");
    setUserSortBy("created_at");
    setUserSortOrder("desc");
    setUserRoleFilter([]);
    setUserCurrentPage(1);
  };

  const clearSkuFilters = () => {
    setSkuSearchQuery("");
    setSkuSortBy("name");
    setSkuSortOrder("asc");
    setSkuCategoryFilter([]);
  };

  const toggleUserRoleFilter = (role) => {
    setUserRoleFilter((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    setUserCurrentPage(1); // Reset to first page when filter changes
  };

  const toggleSkuCategoryFilter = (category) => {
    setSkuCategoryFilter((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const getUniqueCategories = () => {
    return [...new Set(skus.map((sku) => sku.category))].sort();
  };

  // Case Filter & Sort Functions
  const getFilteredAndSortedCases = () => {
    let filtered = [...cases];

    // Search filter
    if (caseSearchQuery) {
      const query = caseSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.case_number?.toLowerCase().includes(query) ||
          c.customer_name?.toLowerCase().includes(query) ||
          c.customer_email?.toLowerCase().includes(query) ||
          c.subject?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (caseStatusFilter.length > 0) {
      filtered = filtered.filter((c) => caseStatusFilter.includes(c.status));
    }

    // Priority filter
    if (casePriorityFilter.length > 0) {
      filtered = filtered.filter((c) =>
        casePriorityFilter.includes(c.priority)
      );
    }

    // Date range filter
    if (caseDateFrom || caseDateTo) {
      filtered = filtered.filter((c) => {
        const caseDate = new Date(c.created_at);
        const fromDate = caseDateFrom ? new Date(caseDateFrom) : null;
        const toDate = caseDateTo
          ? new Date(caseDateTo + "T23:59:59.999")
          : null;

        if (fromDate && caseDate < fromDate) return false;
        if (toDate && caseDate > toDate) return false;
        return true;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (caseSortBy) {
        case "case_number":
          aVal = a.case_number || "";
          bVal = b.case_number || "";
          break;
        case "customer_name":
          aVal = a.customer_name || "";
          bVal = b.customer_name || "";
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        case "priority":
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
          aVal = priorityOrder[a.priority] || 0;
          bVal = priorityOrder[b.priority] || 0;
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
      }

      if (aVal < bVal) return caseSortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return caseSortOrder === "asc" ? 1 : -1;
      return 0;
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

  const clearCaseFilters = () => {
    setCaseSearchQuery("");
    setCaseSortBy("created_at");
    setCaseSortOrder("desc");
    setCaseStatusFilter([]);
    setCasePriorityFilter([]);
    setCaseDateFrom("");
    setCaseDateTo("");
  };

  // Order Filter & Sort Functions
  const getFilteredAndSortedOrders = () => {
    let filtered = [...orders];

    // Hide completed/delivered orders by default unless explicitly in filter
    if (orderStatusFilter.length === 0) {
      // No filters applied - show all except delivered and cancelled
      filtered = filtered.filter(
        (o) => o.status !== "delivered" && o.status !== "cancelled"
      );
    } else {
      // Filters are applied - show only orders matching the filters
      filtered = filtered.filter((o) => {
        // Check each selected filter
        for (const selectedStatus of orderStatusFilter) {
          if (selectedStatus === "delivered") {
            // For "delivered" filter, match:
            // 1. Non-recurring orders with status "delivered"
            // 2. Recurring orders with delivery history
            const isDelivered = o.status === "delivered";
            const hasDeliveryHistory =
              o.is_recurring &&
              o.deliveries_history &&
              o.deliveries_history.length > 0;
            if (isDelivered || hasDeliveryHistory) return true;
          } else {
            // For other statuses, check the order's current status
            if (o.status === selectedStatus) return true;
          }
        }
        return false;
      });
    }

    // Search filter
    if (orderSearchQuery) {
      const query = orderSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(query) ||
          o.customer_name?.toLowerCase().includes(query) ||
          o.customer_email?.toLowerCase().includes(query)
      );
    }

    // Recurring filter
    if (orderRecurringFilter === "recurring") {
      filtered = filtered.filter((o) => o.is_recurring === true);
    } else if (orderRecurringFilter === "one-time") {
      filtered = filtered.filter((o) => !o.is_recurring);
    }

    // Lock filter
    if (orderLockFilter === "locked") {
      filtered = filtered.filter((o) => o.is_locked === true);
    } else if (orderLockFilter === "unlocked") {
      filtered = filtered.filter((o) => !o.is_locked);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (orderSortBy) {
        case "order_number":
          aVal = a.order_number;
          bVal = b.order_number;
          break;
        case "customer_name":
          aVal = a.customer_name?.toLowerCase() || "";
          bVal = b.customer_name?.toLowerCase() || "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "total_amount":
          aVal = a.total_amount || 0;
          bVal = b.total_amount || 0;
          break;
        case "delivery_date":
          aVal = new Date(a.delivery_date);
          bVal = new Date(b.delivery_date);
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
      }

      if (aVal < bVal) return orderSortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return orderSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const toggleOrderStatusFilter = (status) => {
    setOrderStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const clearOrderFilters = () => {
    setOrderSearchQuery("");
    setOrderSortBy("created_at");
    setOrderSortOrder("desc");
    setOrderStatusFilter([]);
    setOrderRecurringFilter("all");
    setOrderLockFilter("all");
    setCurrentPage(1); // Reset to first page
  };

  // Pagination helpers
  const getPaginatedOrders = () => {
    const filtered = getFilteredAndSortedOrders();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredAndSortedOrders();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // User Pagination helpers
  const getPaginatedUsers = () => {
    const filtered = getFilteredAndSortedUsers();
    const startIndex = (userCurrentPage - 1) * userItemsPerPage;
    const endIndex = startIndex + userItemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getUserTotalPages = () => {
    const filtered = getFilteredAndSortedUsers();
    return Math.ceil(filtered.length / userItemsPerPage);
  };

  const handleUserPageChange = (newPage) => {
    setUserCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delivery tracking filter functions
  const getFilteredDeliveryOrders = () => {
    return orders
      .filter((o) => o.driver_id)
      .filter((order) => {
        // Date filtering
        if (
          deliveryDateFrom &&
          new Date(order.delivery_date) < new Date(deliveryDateFrom)
        ) {
          return false;
        }
        if (
          deliveryDateTo &&
          new Date(order.delivery_date) > new Date(deliveryDateTo + " 23:59:59")
        ) {
          return false;
        }

        // Status filtering
        if (deliveryStatusFilter.length > 0) {
          const currentStatus = order.delivery_status || "assigned";
          if (!deliveryStatusFilter.includes(currentStatus)) {
            return false;
          }
        }

        return true;
      });
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
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "orders"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="orders-tab"
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab("cases")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "cases"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="cases-tab"
          >
            Cases
          </button>
          <button
            onClick={() => setActiveTab("delivery-tracking")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "delivery-tracking"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="delivery-tracking-tab"
          >
            Delivery Tracking
          </button>
          <button
            onClick={() => setActiveTab("skus")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "skus"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="skus-tab"
          >
            SKUs
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "pricing"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="pricing-tab"
          >
            Pricing
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "calendar"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="calendar-tab"
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "users"
                ? "text-teal-600 border-b-2 border-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="users-tab"
          >
            User Management
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Order Management
              </h2>
              <Dialog
                open={showOrderDialog}
                onOpenChange={(open) => {
                  setShowOrderDialog(open);
                  if (!open) {
                    setIsEditMode(false);
                    setEditingOrder(null);
                    setOrderForm({
                      customer_id: "",
                      customer_name: "",
                      customer_email: "",
                      items: [],
                      delivery_date: "",
                      pickup_address: PERMANENT_PICKUP_ADDRESS,
                      delivery_address: "",
                      special_instructions: "",
                      is_recurring: false,
                      frequency_template_id: "",
                    });
                    setOrderItems([
                      { sku_id: "", sku_name: "", quantity: 1, price: 0 },
                    ]);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-teal-500 hover:bg-teal-600"
                    onClick={() => {
                      setIsEditMode(false);
                      setEditingOrder(null);
                      // Set default delivery date when creating new order
                      setOrderForm(prev => ({
                        ...prev,
                        delivery_date: getDefaultDeliveryDate()
                      }));
                    }}
                    data-testid="create-order-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {isEditMode ? "Edit Order" : "Create New Order"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateOrder} className="space-y-4">
                    <div>
                      <Label>Customer</Label>
                      <Select
                        value={orderForm.customer_id}
                        onValueChange={(value) =>
                          setOrderForm({ ...orderForm, customer_id: value })
                        }
                        required
                      >
                        <SelectTrigger data-testid="order-customer-select">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.full_name} ({customer.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                              {filteredSkus.map((sku) => {
                                const price =
                                  sku.customer_price !== undefined
                                    ? sku.customer_price
                                    : sku.price;
                                const gst = price * 0.1;
                                const total = price + gst;
                                return (
                                  <SelectItem key={sku.id} value={sku.id}>
                                    {sku.name} - ${price.toFixed(2)} + GST $
                                    {gst.toFixed(2)} = ${total.toFixed(2)} per
                                    unit
                                  </SelectItem>
                                );
                              })}
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
                        type="datetime-local"
                        value={orderForm.delivery_date}
                        onChange={(e) =>
                          setOrderForm({
                            ...orderForm,
                            delivery_date: e.target.value,
                          })
                        }
                        required
                        data-testid="order-delivery-date"
                      />
                    </div>

                    <div>
                      <Label>Pickup Address</Label>
                      <Input
                        value={orderForm.pickup_address}
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
                        data-testid="order-pickup-address"
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
                        data-testid="order-delivery-address"
                      />
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
                        data-testid="order-instructions"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Switch
                          checked={orderForm.is_recurring}
                          onCheckedChange={(checked) =>
                            setOrderForm({
                              ...orderForm,
                              is_recurring: checked,
                            })
                          }
                          data-testid="recurring-switch"
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
                          >
                            <SelectTrigger data-testid="frequency-template-select">
                              <SelectValue placeholder="Choose recurring frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencyTemplates.map((template) => (
                                <SelectItem
                                  key={template.id}
                                  value={template.id}
                                >
                                  {template.name} - Every{" "}
                                  {template.frequency_value}{" "}
                                  {template.frequency_type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-2">
                            This order will automatically repeat based on the
                            selected frequency
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Order Summary */}
                    {orderItems.some(
                      (item) => item.sku_id && item.quantity > 0
                    ) && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          Order Summary
                        </h3>
                        {(() => {
                          const subtotalExGST = orderItems.reduce(
                            (total, item) => {
                              const sku = filteredSkus.find(
                                (s) => s.id === item.sku_id
                              );
                              if (!sku || !item.quantity) return total;
                              const price =
                                sku.customer_price !== undefined
                                  ? sku.customer_price
                                  : sku.price;
                              return (
                                total + price * parseInt(item.quantity || 0)
                              );
                            },
                            0
                          );
                          const gstAmount = subtotalExGST * 0.1;
                          const totalIncGST = subtotalExGST + gstAmount;

                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  Base Amount:
                                </span>
                                <span className="text-gray-900 font-medium">
                                  ${subtotalExGST.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  GST (10%):
                                </span>
                                <span className="text-gray-900 font-medium">
                                  ${gstAmount.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                <span className="text-lg font-bold text-gray-900">
                                  Total Amount
                                </span>
                                <span className="text-2xl font-bold text-teal-600">
                                  ${totalIncGST.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {isEditMode && editingOrder && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full mb-3"
                        onClick={() => generateInvoice(editingOrder)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download Delivery Receipt
                      </Button>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600"
                      disabled={creatingOrder || editingOrderId !== null}
                      data-testid="order-submit-btn"
                    >
                      {creatingOrder || editingOrderId ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          {isEditMode ? "Updating..." : "Creating..."}
                        </>
                      ) : isEditMode ? (
                        "Update Order"
                      ) : (
                        "Create Order"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filter Controls */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Search and Sort Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search Orders
                      </Label>
                      <Input
                        placeholder="Search by order number, customer name, or email..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        Sort By
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={orderSortBy}
                          onValueChange={setOrderSortBy}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created_at">
                              Created Date
                            </SelectItem>
                            <SelectItem value="order_number">
                              Order Number
                            </SelectItem>
                            <SelectItem value="customer_name">
                              Customer
                            </SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="total_amount">
                              Total Amount
                            </SelectItem>
                            <SelectItem value="delivery_date">
                              Delivery Date
                            </SelectItem>
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
                          className="px-3"
                        >
                          {orderSortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filter by Status
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "pending",
                        "scheduled",
                        "processing",
                        "ready_for_pickup",
                        "out_for_delivery",
                        "delivered",
                        "cancelled",
                      ].map((status) => (
                        <Button
                          key={status}
                          variant={
                            orderStatusFilter.includes(status)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleOrderStatusFilter(status)}
                          className={
                            orderStatusFilter.includes(status)
                              ? "bg-blue-500 hover:bg-blue-600"
                              : ""
                          }
                        >
                          {status.replace(/_/g, " ")}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Type and Lock Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2">
                        Order Type
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant={
                            orderRecurringFilter === "all"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setOrderRecurringFilter("all")}
                          className={
                            orderRecurringFilter === "all"
                              ? "bg-teal-500 hover:bg-teal-600"
                              : ""
                          }
                        >
                          All Orders
                        </Button>
                        <Button
                          variant={
                            orderRecurringFilter === "recurring"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setOrderRecurringFilter("recurring")}
                          className={
                            orderRecurringFilter === "recurring"
                              ? "bg-purple-500 hover:bg-purple-600"
                              : ""
                          }
                        >
                          <Repeat className="w-3 h-3 mr-1" />
                          Recurring
                        </Button>
                        <Button
                          variant={
                            orderRecurringFilter === "one-time"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setOrderRecurringFilter("one-time")}
                          className={
                            orderRecurringFilter === "one-time"
                              ? "bg-gray-500 hover:bg-gray-600"
                              : ""
                          }
                        >
                          One-Time
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2">
                        Lock Status
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant={
                            orderLockFilter === "all" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setOrderLockFilter("all")}
                          className={
                            orderLockFilter === "all"
                              ? "bg-teal-500 hover:bg-teal-600"
                              : ""
                          }
                        >
                          All
                        </Button>
                        <Button
                          variant={
                            orderLockFilter === "locked" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setOrderLockFilter("locked")}
                          className={
                            orderLockFilter === "locked"
                              ? "bg-yellow-500 hover:bg-yellow-600"
                              : ""
                          }
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Button>
                        <Button
                          variant={
                            orderLockFilter === "unlocked"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setOrderLockFilter("unlocked")}
                          className={
                            orderLockFilter === "unlocked"
                              ? "bg-green-500 hover:bg-green-600"
                              : ""
                          }
                        >
                          <Unlock className="w-3 h-3 mr-1" />
                          Unlocked
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Results and Clear */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Showing {getFilteredAndSortedOrders().length} of{" "}
                      {orders.length} orders
                    </p>
                    {(orderSearchQuery ||
                      orderStatusFilter.length > 0 ||
                      orderRecurringFilter !== "all" ||
                      orderLockFilter !== "all" ||
                      orderSortBy !== "created_at" ||
                      orderSortOrder !== "desc") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearOrderFilters}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Edit Requests Section */}
            {pendingEditRequests.length > 0 && (
              <Card className="mb-6 border-2 border-yellow-300 shadow-lg">
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="flex items-center gap-2 text-yellow-900">
                    <Clock className="w-5 h-5" />
                    Pending Customer Edit Requests ({pendingEditRequests.length}
                    )
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {pendingEditRequests.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 bg-white border-2 border-yellow-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-bold text-lg text-gray-900">
                                {order.order_number}
                              </span>
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                                <Repeat className="w-3 h-3" />
                                Recurring Order
                              </span>
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Edit Pending
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600">Customer:</span>
                                <span className="font-medium text-gray-900 ml-2">
                                  {order.customer_name}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Requested:
                                </span>
                                <span className="font-medium text-gray-900 ml-2">
                                  {new Date(
                                    order.modification_requested_at
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {order.pending_modifications?.reason && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                <span className="text-gray-600 font-medium">
                                  Reason:
                                </span>
                                <p className="text-gray-800 mt-1">
                                  {order.pending_modifications.reason}
                                </p>
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => handleViewEditRequest(order)}
                            className="bg-teal-500 hover:bg-teal-600 ml-4"
                            size="sm"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Review Request
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Orders Table - Professional Full-Width Layout */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-w-full">
                  <table
                    className="w-full min-w-full"
                    data-testid="orders-list"
                  >
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Delivery
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Driver
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Assign
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getPaginatedOrders().map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* Order Details */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-900 text-sm">
                                {order.order_number}
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                {order.is_recurring && (
                                  <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-800 flex items-center gap-1">
                                    <Repeat className="w-3 h-3" />
                                  </span>
                                )}
                                {order.is_locked && (
                                  <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                  </span>
                                )}
                                {order.is_recurring &&
                                  order.deliveries_history &&
                                  order.deliveries_history.length > 0 && (
                                    <span
                                      className="px-1.5 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800 flex items-center gap-1"
                                      title={`${order.deliveries_history.length} deliveries completed`}
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      {order.deliveries_history.length}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="px-3 py-3">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">
                                {order.customer_name}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {order.customer_email}
                              </p>
                            </div>
                          </td>

                          {/* Items */}
                          <td className="px-3 py-3">
                            <div className="text-xs space-y-1">
                              {order.items.slice(0, 2).map((item, idx) => (
                                <p key={idx} className="text-gray-700">
                                  {item.sku_name}{" "}
                                  <span className="text-gray-500">
                                    ×{item.quantity}
                                  </span>
                                </p>
                              ))}
                              {order.items.length > 2 && (
                                <p className="text-xs text-gray-500">
                                  +{order.items.length - 2} more
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Dates */}
                          <td className="px-3 py-3">
                            <div className="text-xs">
                              <p className="text-gray-700">
                                {new Date(
                                  order.delivery_date
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </td>

                          {/* Total */}
                          <td className="px-3 py-3">
                            <div className="text-sm font-bold text-teal-600">
                              ${(order.total_amount * 1.1).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Inc. GST
                            </div>
                          </td>

                          {/* Status Selector */}
                          <td className="px-3 py-3">
                            <Select
                              value={order.status}
                              onValueChange={(value) =>
                                handleUpdateOrderStatus(order.id, value)
                              }
                              disabled={updatingStatusOrderId === order.id}
                            >
                              <SelectTrigger className="w-full min-w-[120px]">
                                {updatingStatusOrderId === order.id ? (
                                  <span className="flex items-center text-xs">
                                    <Clock className="w-3 h-3 mr-2 animate-spin" />
                                    Updating...
                                  </span>
                                ) : (
                                  <SelectValue placeholder="Select Status">
                                    {order.status === "pending" ? "Pending" :
                                     order.status === "confirmed" ? "Confirmed" :
                                     order.status === "scheduled" ? "Scheduled" :
                                     order.status === "processing" ? "Processing" :
                                     order.status === "ready_for_pickup" ? "Ready for Pickup" :
                                     order.status === "out_for_delivery" ? "Out for Delivery" :
                                     order.status === "delivered" ? "Delivered" :
                                     order.status === "cancelled" ? "Cancelled" :
                                     order.status || "Select Status"}
                                  </SelectValue>
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="scheduled">
                                  Scheduled
                                </SelectItem>
                                <SelectItem value="processing">
                                  Processing
                                </SelectItem>
                                <SelectItem value="ready_for_pickup">
                                  Ready for Pickup
                                </SelectItem>
                                <SelectItem value="out_for_delivery">
                                  Out for Delivery
                                </SelectItem>
                                <SelectItem value="delivered">
                                  Delivered
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Assigned Driver */}
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {order.driver_name || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          {/* Driver Assignment */}
                          <td className="px-3 py-3">
                            {order.driver_id ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✓
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUnassignDriver(order.id)}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-7 w-7 p-0"
                                  title="Unassign driver"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Select
                                  value={selectedDriver[order.id] || ""}
                                  onValueChange={(value) =>
                                    setSelectedDriver({
                                      ...selectedDriver,
                                      [order.id]: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-28 h-7 text-xs">
                                    <SelectValue placeholder="Driver" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {drivers.map((driver) => (
                                      <SelectItem
                                        key={driver.id}
                                        value={driver.id}
                                      >
                                        {driver.full_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => handleAssignDriver(order.id)}
                                  className="bg-teal-500 hover:bg-teal-600 h-7 w-7 p-0"
                                  title="Assign"
                                >
                                  <Truck className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                                disabled={editingOrderId === order.id}
                                className="border-teal-300 text-teal-600 hover:bg-teal-50 h-7 w-7 p-0"
                                title="Edit order"
                              >
                                {editingOrderId === order.id ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Edit className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteOrder(order.id)}
                                disabled={deletingOrderId === order.id}
                                className="border-red-300 text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                                title="Delete order"
                              >
                                {deletingOrderId === order.id ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  order.is_locked
                                    ? handleUnlockOrder(order.id)
                                    : handleLockOrder(order.id)
                                }
                                className={`h-7 w-7 p-0 ${
                                  order.is_locked
                                    ? "border-green-300 text-green-600 hover:bg-green-50"
                                    : "border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                                }`}
                                title={
                                  order.is_locked
                                    ? "Unlock order"
                                    : "Lock order"
                                }
                              >
                                {order.is_locked ? (
                                  <Unlock className="w-3 h-3" />
                                ) : (
                                  <Lock className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {getTotalPages() > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        getFilteredAndSortedOrders().length
                      )}{" "}
                      of {getFilteredAndSortedOrders().length} orders
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
                          // Show first page, last page, current page, and pages around current
                          if (
                            pageNum === 1 ||
                            pageNum === getTotalPages() ||
                            (pageNum >= currentPage - 1 &&
                              pageNum <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className={
                                  currentPage === pageNum
                                    ? "bg-teal-500 hover:bg-teal-600"
                                    : ""
                                }
                              >
                                {pageNum}
                              </Button>
                            );
                          } else if (
                            pageNum === currentPage - 2 ||
                            pageNum === currentPage + 2
                          ) {
                            return (
                              <span key={pageNum} className="px-2 py-1">
                                ...
                              </span>
                            );
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

                {/* Empty State */}
                {getFilteredAndSortedOrders().length === 0 && (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Orders Found
                    </h3>
                    <p className="text-gray-600">
                      {orders.length === 0
                        ? "Create your first order to get started"
                        : "No orders match your current filters"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cases Tab */}
        {activeTab === "cases" && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Case Management
            </h2>

            {/* Search and Filter Controls */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Search and Sort Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search Cases
                      </Label>
                      <Input
                        placeholder="Search by case number, customer, or subject..."
                        value={caseSearchQuery}
                        onChange={(e) => setCaseSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        Sort By
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={caseSortBy}
                          onValueChange={setCaseSortBy}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created_at">
                              Created Date
                            </SelectItem>
                            <SelectItem value="case_number">
                              Case Number
                            </SelectItem>
                            <SelectItem value="customer_name">
                              Customer
                            </SelectItem>
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
                          className="px-3"
                        >
                          {caseSortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filter by Status
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {["open", "in_progress", "resolved", "closed"].map(
                        (status) => (
                          <Button
                            key={status}
                            variant={
                              caseStatusFilter.includes(status)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => toggleCaseStatusFilter(status)}
                            className={
                              caseStatusFilter.includes(status)
                                ? "bg-blue-500 hover:bg-blue-600"
                                : ""
                            }
                          >
                            {status.replace("_", " ")}
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2">
                      Filter by Priority
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {["low", "medium", "high", "urgent"].map((priority) => (
                        <Button
                          key={priority}
                          variant={
                            casePriorityFilter.includes(priority)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleCasePriorityFilter(priority)}
                          className={
                            casePriorityFilter.includes(priority)
                              ? "bg-orange-500 hover:bg-orange-600"
                              : ""
                          }
                        >
                          {priority}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        From Date
                      </Label>
                      <Input
                        type="date"
                        value={caseDateFrom}
                        onChange={(e) => setCaseDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        To Date
                      </Label>
                      <Input
                        type="date"
                        value={caseDateTo}
                        onChange={(e) => setCaseDateTo(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Results and Clear */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Showing {getFilteredAndSortedCases().length} of{" "}
                      {cases.length} cases
                    </p>
                    {(caseSearchQuery ||
                      caseStatusFilter.length > 0 ||
                      casePriorityFilter.length > 0 ||
                      caseDateFrom ||
                      caseDateTo ||
                      caseSortBy !== "created_at" ||
                      caseSortOrder !== "desc") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearCaseFilters}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cases Table - Professional Full-Width Layout */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="cases-list">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Case Details
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Subject & Description
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredAndSortedCases().map((caseItem) => (
                        <tr
                          key={caseItem.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* Case Details */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-900 text-base">
                                {caseItem.case_number}
                              </span>
                              <span className="text-xs text-gray-500">
                                Created:{" "}
                                {new Date(
                                  caseItem.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">
                                {caseItem.customer_name}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {caseItem.customer_email}
                              </p>
                            </div>
                          </td>

                          {/* Subject & Description */}
                          <td className="px-6 py-4">
                            <div className="max-w-md">
                              <p className="font-semibold text-gray-900 text-sm mb-1">
                                {caseItem.subject}
                              </p>
                              <p className="text-gray-600 text-xs line-clamp-2">
                                {caseItem.description}
                              </p>
                              {caseItem.resolution && (
                                <div className="mt-2 p-2 bg-green-50 rounded">
                                  <p className="text-xs font-semibold text-green-800">
                                    Resolution:
                                  </p>
                                  <p className="text-xs text-green-700 line-clamp-2">
                                    {caseItem.resolution}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full inline-block ${
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

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full inline-block ${
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

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <Button
                              onClick={() => {
                                setSelectedCase(caseItem);
                                setCaseUpdate({
                                  status: caseItem.status,
                                  resolution: caseItem.resolution || "",
                                  priority: caseItem.priority,
                                });
                                setShowCaseDialog(true);
                              }}
                              size="sm"
                              className="bg-teal-500 hover:bg-teal-600"
                              data-testid={`update-case-${caseItem.id}`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Update
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {getFilteredAndSortedCases().length === 0 && (
                  <div className="p-12 text-center">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Cases Found
                    </h3>
                    <p className="text-gray-600">
                      {cases.length === 0
                        ? "No cases have been submitted yet"
                        : "No cases match your current filters"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Case</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateCase} className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={caseUpdate.status}
                      onValueChange={(value) =>
                        setCaseUpdate({ ...caseUpdate, status: value })
                      }
                    >
                      <SelectTrigger data-testid="case-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={caseUpdate.priority}
                      onValueChange={(value) =>
                        setCaseUpdate({ ...caseUpdate, priority: value })
                      }
                    >
                      <SelectTrigger data-testid="case-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Resolution</Label>
                    <Textarea
                      value={caseUpdate.resolution}
                      onChange={(e) =>
                        setCaseUpdate({
                          ...caseUpdate,
                          resolution: e.target.value,
                        })
                      }
                      rows={4}
                      data-testid="case-resolution-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-teal-500 hover:bg-teal-600"
                    disabled={updatingCaseId !== null}
                    data-testid="case-update-submit-btn"
                  >
                    {updatingCaseId ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Case"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
                Track delivery progress and view detailed timeline with driver
                information
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
                                  Customer:{" "}
                                  <span className="font-semibold">
                                    {order.customer_name}
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                                    {calculateGST(
                                      order.total_amount
                                    ).basePrice.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    GST: $
                                    {calculateGST(
                                      order.total_amount
                                    ).gst.toFixed(2)}
                                  </p>
                                  <p className="text-xs font-bold text-teal-600">
                                    Total: ${order.total_amount?.toFixed(2)}
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
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Items</p>
                                  <p className="font-semibold text-gray-900">
                                    {order.items?.length || 0}
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

                        {/* Order Items (Expandable Section) */}
                        {order.items && order.items.length > 0 && (
                          <div className="mt-6 pt-4 border-t">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              Order Items ({order.items.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between bg-gray-50 p-2 rounded text-sm"
                                >
                                  <span className="text-gray-900">
                                    {item.sku_name || item.sku_id}
                                  </span>
                                  <span className="text-gray-600">
                                    Qty: {item.quantity}{" "}
                                    {item.price &&
                                      `× $${item.price.toFixed(2)}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                      ? "No orders with assigned drivers at the moment"
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
                View all orders in calendar view
              </p>
            </div>
            <OrderCalendar orders={orders} />
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                User Management
              </h2>
            </div>

            {/* Search and Filter Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Search and Sort Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search Users
                      </Label>
                      <Input
                        placeholder="Search by name or email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full"
                        data-testid="user-search-input"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        Sort By
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={userSortBy}
                          onValueChange={setUserSortBy}
                        >
                          <SelectTrigger data-testid="user-sort-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="role">Role</SelectItem>
                            <SelectItem value="created_at">
                              Created Date
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setUserSortOrder(
                              userSortOrder === "asc" ? "desc" : "asc"
                            )
                          }
                          className="px-3"
                          data-testid="user-sort-order-btn"
                        >
                          {userSortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Filter Row */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filter by Role
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {["owner", "admin", "customer", "driver"].map((role) => (
                        <Button
                          key={role}
                          variant={
                            userRoleFilter.includes(role)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleUserRoleFilter(role)}
                          className={
                            userRoleFilter.includes(role)
                              ? "bg-teal-500 hover:bg-teal-600"
                              : ""
                          }
                          data-testid={`user-role-filter-${role}`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Results and Clear */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Showing {getFilteredAndSortedUsers().length} of{" "}
                      {customers.length} users
                    </p>
                    {(userSearchQuery ||
                      userRoleFilter.length > 0 ||
                      userSortBy !== "created_at" ||
                      userSortOrder !== "desc") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearUserFilters}
                        data-testid="clear-user-filters-btn"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table - Professional Full-Width Layout */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          User Details
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getPaginatedUsers().map((customer) => (
                        <tr
                          key={customer.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            !customer.is_active ? "opacity-60 bg-gray-50" : ""
                          }`}
                        >
                          {/* User Details */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-900 text-base">
                                {customer.full_name}
                              </span>
                              <span className="font-mono text-xs text-gray-500">
                                {customer.id}
                              </span>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">
                                {customer.email}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {customer.phone || "N/A"}
                              </p>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full inline-block ${
                                customer.role === "owner"
                                  ? "bg-purple-100 text-purple-800"
                                  : customer.role === "admin"
                                  ? "bg-blue-100 text-blue-800"
                                  : customer.role === "driver"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {customer.role.charAt(0).toUpperCase() +
                                customer.role.slice(1)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1 ${
                                customer.is_active !== false
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {customer.is_active !== false ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3 h-3" /> Disabled
                                </>
                              )}
                            </span>
                          </td>

                          {/* Created */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">
                              {new Date(
                                customer.created_at
                              ).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-center">
                              {(customer.role === "customer" ||
                                customer.role === "driver") && (
                                <Button
                                  onClick={() => openUserEditDialog(customer)}
                                  variant="outline"
                                  size="sm"
                                  className="border-teal-300 text-teal-600 hover:bg-teal-50"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                onClick={() =>
                                  openPasswordResetDialog(customer)
                                }
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-300"
                                disabled={
                                  resettingPasswordUserId === customer.id
                                }
                                title="Reset Password"
                              >
                                {resettingPasswordUserId === customer.id ? (
                                  <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Key className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleToggleUserStatus(customer)}
                                variant="outline"
                                size="sm"
                                className={`${
                                  customer.is_active !== false
                                    ? "text-red-600 hover:text-red-800 border-red-300 hover:bg-red-50"
                                    : "text-green-600 hover:text-green-800 border-green-300 hover:bg-green-50"
                                }`}
                                title={
                                  customer.is_active !== false
                                    ? "Disable User"
                                    : "Enable User"
                                }
                                disabled={togglingUserId === customer.id}
                              >
                                {togglingUserId === customer.id ? (
                                  <Clock className="w-4 h-4 animate-spin" />
                                ) : customer.is_active !== false ? (
                                  <Ban className="w-4 h-4" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {getPaginatedUsers().length === 0 && (
                  <div className="p-12 text-center">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Users Found
                    </h3>
                    <p className="text-gray-600">
                      {customers.length === 0
                        ? "No users in the system yet"
                        : "No users match your current filters"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination Controls */}
            {getUserTotalPages() > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {(userCurrentPage - 1) * userItemsPerPage + 1} to{" "}
                  {Math.min(
                    userCurrentPage * userItemsPerPage,
                    getFilteredAndSortedUsers().length
                  )}{" "}
                  of {getFilteredAndSortedUsers().length} users
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUserPageChange(userCurrentPage - 1)}
                    disabled={userCurrentPage === 1}
                  >
                    Previous
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {Array.from(
                      { length: Math.min(5, getUserTotalPages()) },
                      (_, i) => {
                        let pageNum;
                        const totalPages = getUserTotalPages();

                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (userCurrentPage <= 3) {
                          pageNum = i + 1;
                        } else if (userCurrentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = userCurrentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={
                              userCurrentPage === pageNum
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => handleUserPageChange(pageNum)}
                            className={
                              userCurrentPage === pageNum
                                ? "bg-teal-500 hover:bg-teal-600"
                                : ""
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUserPageChange(userCurrentPage + 1)}
                    disabled={userCurrentPage === getUserTotalPages()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Password Reset Dialog */}
            <Dialog
              open={showPasswordDialog}
              onOpenChange={setShowPasswordDialog}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <Label className="text-gray-700">User</Label>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedUser?.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedUser?.email}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      required
                      minLength={6}
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> This will immediately change the
                      user's password. The user will need to use this new
                      password to log in.
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPasswordDialog(false)}
                      disabled={resettingPasswordUserId}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={resettingPasswordUserId}
                    >
                      {resettingPasswordUserId ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* User Edit Dialog */}
            <Dialog
              open={showUserEditDialog}
              onOpenChange={setShowUserEditDialog}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User Details</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveUserEdit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input
                        value={userEditForm.full_name}
                        onChange={(e) =>
                          setUserEditForm({
                            ...userEditForm,
                            full_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={userEditForm.email}
                        onChange={(e) =>
                          setUserEditForm({
                            ...userEditForm,
                            email: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={userEditForm.phone}
                        onChange={(e) =>
                          setUserEditForm({
                            ...userEditForm,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input
                        value={userEditForm.address}
                        onChange={(e) =>
                          setUserEditForm({
                            ...userEditForm,
                            address: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select
                        value={userEditForm.role}
                        onValueChange={(v) =>
                          setUserEditForm({ ...userEditForm, role: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUserEditDialog(false)}
                      disabled={savingUserEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700"
                      disabled={savingUserEdit}
                    >
                      {savingUserEdit ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* SKUs Tab */}
        {activeTab === "skus" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                SKU Management
              </h2>
              <Dialog
                open={showSkuDialog}
                onOpenChange={(open) => {
                  setShowSkuDialog(open);
                  if (!open) {
                    setEditingSku(null);
                    setSkuForm({
                      name: "",
                      category: "",
                      price: "",
                      unit: "",
                      description: "",
                    });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-teal-500 hover:bg-teal-600"
                    data-testid="create-sku-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create SKU
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSku ? "Edit SKU" : "Create New SKU"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSku} className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={skuForm.name}
                        onChange={(e) =>
                          setSkuForm({ ...skuForm, name: e.target.value })
                        }
                        required
                        data-testid="sku-name-input"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={skuForm.category}
                        onChange={(e) =>
                          setSkuForm({ ...skuForm, category: e.target.value })
                        }
                        required
                        data-testid="sku-category-input"
                      />
                    </div>
                    <div>
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={skuForm.price}
                        onChange={(e) =>
                          setSkuForm({ ...skuForm, price: e.target.value })
                        }
                        required
                        data-testid="sku-price-input"
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input
                        value={skuForm.unit}
                        onChange={(e) =>
                          setSkuForm({ ...skuForm, unit: e.target.value })
                        }
                        required
                        placeholder="e.g., kg, item, piece"
                        data-testid="sku-unit-input"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={skuForm.description}
                        onChange={(e) =>
                          setSkuForm({
                            ...skuForm,
                            description: e.target.value,
                          })
                        }
                        data-testid="sku-description-input"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600"
                      disabled={creatingSku}
                      data-testid="sku-submit-btn"
                    >
                      {creatingSku ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          {editingSku ? "Updating..." : "Creating..."}
                        </>
                      ) : editingSku ? (
                        "Update SKU"
                      ) : (
                        "Create SKU"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and Filter Controls */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Search and Sort Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search SKUs
                      </Label>
                      <Input
                        placeholder="Search by name or description..."
                        value={skuSearchQuery}
                        onChange={(e) => setSkuSearchQuery(e.target.value)}
                        className="w-full"
                        data-testid="sku-search-input"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        Sort By
                      </Label>
                      <div className="flex gap-2">
                        <Select value={skuSortBy} onValueChange={setSkuSortBy}>
                          <SelectTrigger data-testid="sku-sort-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="price">Price</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSkuSortOrder(
                              skuSortOrder === "asc" ? "desc" : "asc"
                            )
                          }
                          className="px-3"
                          data-testid="sku-sort-order-btn"
                        >
                          {skuSortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Filter Row */}
                  {getUniqueCategories().length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filter by Category
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {getUniqueCategories().map((category) => (
                          <Button
                            key={category}
                            variant={
                              skuCategoryFilter.includes(category)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => toggleSkuCategoryFilter(category)}
                            className={
                              skuCategoryFilter.includes(category)
                                ? "bg-teal-500 hover:bg-teal-600"
                                : ""
                            }
                            data-testid={`sku-category-filter-${category}`}
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Results and Clear */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Showing {getFilteredAndSortedSkus().length} of{" "}
                      {skus.length} SKUs
                    </p>
                    {(skuSearchQuery ||
                      skuCategoryFilter.length > 0 ||
                      skuSortBy !== "name" ||
                      skuSortOrder !== "asc") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSkuFilters}
                        data-testid="clear-sku-filters-btn"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SKUs Table - Professional Full-Width Layout */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="skus-list">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          SKU Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Price (Inc. GST)
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredAndSortedSkus().map((sku) => (
                        <tr
                          key={sku.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* SKU Name */}
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900 text-base">
                              {sku.name}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 inline-block">
                              {sku.category}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600 max-w-xs line-clamp-2">
                              {sku.description || "No description"}
                            </p>
                          </td>

                          {/* Unit */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-700">
                              {sku.unit}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="px-6 py-4">
                            {sku.has_custom_pricing ? (
                              <div className="flex flex-col space-y-0.5">
                                <div className="flex items-center gap-1 text-xs text-gray-400 line-through">
                                  Base: ${(sku.price * 1.1).toFixed(2)}
                                </div>
                                <div className="text-xs font-semibold text-teal-600">
                                  CUSTOM PRICING
                                </div>
                                <div className="text-xs text-gray-600">
                                  Custom: ${sku.customer_price.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  GST (10%): $
                                  {(sku.customer_price * 0.1).toFixed(2)}
                                </div>
                                <div className="text-sm font-bold text-teal-600 pt-1 border-t">
                                  ${(sku.customer_price * 1.1).toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-0.5">
                                <div className="text-xs text-gray-600">
                                  Base: ${sku.price.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  GST (10%): ${(sku.price * 0.1).toFixed(2)}
                                </div>
                                <div className="text-sm font-bold text-teal-600 pt-1 border-t">
                                  ${(sku.price * 1.1).toFixed(2)}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSku(sku)}
                                className="border-teal-300 text-teal-600 hover:bg-teal-50"
                                title="Edit SKU"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteSku(sku.id)}
                                disabled={deletingSkuId === sku.id}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                title="Delete SKU"
                              >
                                {deletingSkuId === sku.id ? (
                                  <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {getFilteredAndSortedSkus().length === 0 && (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No SKUs Found
                    </h3>
                    <p className="text-gray-600">
                      {skus.length === 0
                        ? "Create your first SKU to get started"
                        : "No SKUs match your current filters"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === "pricing" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Customer Pricing
              </h2>
              <div className="max-w-md">
                <Label>Select Customer</Label>
                <Select
                  value={selectedCustomer?.id || ""}
                  onValueChange={handleSelectCustomer}
                >
                  <SelectTrigger data-testid="pricing-customer-select">
                    <SelectValue placeholder="Choose a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.full_name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCustomer && (
              <>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedCustomer.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedCustomer.email}
                      </p>
                    </div>
                    <Dialog
                      open={showPricingDialog}
                      onOpenChange={setShowPricingDialog}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className="bg-teal-500 hover:bg-teal-600"
                          size="sm"
                          data-testid="add-pricing-btn"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Custom Pricing
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Custom Pricing</DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={handleCreatePricing}
                          className="space-y-4"
                        >
                          <div>
                            <Label>Select SKU</Label>
                            <Select
                              value={pricingForm.sku_id}
                              onValueChange={(value) =>
                                setPricingForm({
                                  ...pricingForm,
                                  sku_id: value,
                                })
                              }
                              required
                            >
                              <SelectTrigger data-testid="pricing-sku-select">
                                <SelectValue placeholder="Choose SKU" />
                              </SelectTrigger>
                              <SelectContent>
                                {skus
                                  .filter(
                                    (sku) =>
                                      !skusWithPricing.find(
                                        (s) => s.id === sku.id && s.custom_price
                                      )
                                  )
                                  .map((sku) => {
                                    const gst = sku.price * 0.1;
                                    const total = sku.price + gst;
                                    return (
                                      <SelectItem key={sku.id} value={sku.id}>
                                        {sku.name} - ${sku.price.toFixed(2)} +
                                        GST ${gst.toFixed(2)} = $
                                        {total.toFixed(2)}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Custom Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricingForm.custom_price}
                              onChange={(e) =>
                                setPricingForm({
                                  ...pricingForm,
                                  custom_price: e.target.value,
                                })
                              }
                              required
                              data-testid="pricing-price-input"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full bg-teal-500 hover:bg-teal-600"
                            disabled={creatingPricing}
                            data-testid="pricing-submit-btn"
                          >
                            {creatingPricing ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add Pricing"
                            )}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-3" data-testid="pricing-list">
                  {skusWithPricing
                    .filter((sku) => sku.custom_price)
                    .map((sku) => (
                      <Card key={sku.id} className="card-hover">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {sku.name}
                              </h4>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="text-xs text-gray-600 mb-1">
                                    Default Price:
                                  </p>
                                  <div className="space-y-0.5 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Base:
                                      </span>
                                      <span className="font-medium">
                                        ${sku.price.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        GST (10%):
                                      </span>
                                      <span className="font-medium">
                                        ${(sku.price * 0.1).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t">
                                      <span className="font-semibold">
                                        Total:
                                      </span>
                                      <span className="font-bold text-gray-900">
                                        ${(sku.price * 1.1).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {sku.custom_price && (
                                  <div className="p-2 bg-teal-50 rounded border border-teal-200">
                                    <p className="text-xs text-teal-700 mb-1 font-medium">
                                      Custom Price:
                                    </p>
                                    <div className="space-y-0.5 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-teal-700">
                                          Base:
                                        </span>
                                        <span className="font-medium">
                                          ${sku.custom_price.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-teal-700">
                                          GST (10%):
                                        </span>
                                        <span className="font-medium">
                                          ${(sku.custom_price * 0.1).toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between pt-1 border-t border-teal-300">
                                        <span className="font-semibold text-teal-900">
                                          Total:
                                        </span>
                                        <span className="font-bold text-teal-600">
                                          ${(sku.custom_price * 1.1).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            {sku.custom_price && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeletePricing(sku.pricing_id)
                                }
                                disabled={deletingPricingId === sku.pricing_id}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                {deletingPricingId === sku.pricing_id ? (
                                  <>
                                    <Clock className="w-4 h-4 mr-1 animate-spin" />
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-1" />
                                    Remove
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {selectedCustomer &&
                  skusWithPricing.filter((sku) => sku.custom_price).length ===
                    0 && (
                    <Card className="mt-6">
                      <CardContent className="p-12 text-center">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">
                          No custom pricing set for this customer
                        </p>
                        <p className="text-sm text-gray-500">
                          Click "Add Custom Pricing" above to set custom pricing
                          for this customer
                        </p>
                      </CardContent>
                    </Card>
                  )}
              </>
            )}

            {!selectedCustomer && (
              <Card>
                <CardContent className="p-12 text-center">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Select a customer to manage pricing
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Edit Request Review Dialog */}
        <Dialog
          open={showEditRequestDialog}
          onOpenChange={setShowEditRequestDialog}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Customer Edit Request</DialogTitle>
            </DialogHeader>

            {selectedEditRequest && (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Order Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {selectedEditRequest.order_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {selectedEditRequest.customer_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {selectedEditRequest.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Request Date:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {new Date(
                          selectedEditRequest.modification_requested_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer's Reason */}
                {selectedEditRequest.pending_modifications?.reason && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Customer's Reason:
                    </h3>
                    <p className="text-blue-800">
                      {selectedEditRequest.pending_modifications.reason}
                    </p>
                  </div>
                )}

                {/* Current vs Requested Changes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-900 mb-3">
                      Current Values
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-red-700 font-medium">Items:</span>
                        <div className="mt-1 space-y-1">
                          {selectedEditRequest.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-red-900 bg-red-100 px-2 py-1 rounded"
                            >
                              <span>{item.sku_name}</span>
                              <span className="font-semibold">
                                ×{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-red-700 font-medium">
                          Delivery Date:
                        </span>
                        <p className="text-red-900">
                          {new Date(
                            selectedEditRequest.delivery_date
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-red-700 font-medium">
                          Delivery Address:
                        </span>
                        <p className="text-red-900">
                          {selectedEditRequest.delivery_address}
                        </p>
                      </div>
                      {selectedEditRequest.special_instructions && (
                        <div>
                          <span className="text-red-700 font-medium">
                            Instructions:
                          </span>
                          <p className="text-red-900">
                            {selectedEditRequest.special_instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-900 mb-3">
                      Requested Changes
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-green-700 font-medium">
                          Items:
                        </span>
                        {selectedEditRequest.pending_modifications?.items ? (
                          <div className="mt-1 space-y-1">
                            {selectedEditRequest.pending_modifications.items.map(
                              (item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-green-900 bg-green-100 px-2 py-1 rounded"
                                >
                                  <span>{item.sku_name}</span>
                                  <span className="font-semibold">
                                    ×{item.quantity}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-green-900 mt-1">No change</p>
                        )}
                      </div>
                      <div>
                        <span className="text-green-700 font-medium">
                          Delivery Date:
                        </span>
                        <p className="text-green-900">
                          {selectedEditRequest.pending_modifications
                            ?.delivery_date
                            ? new Date(
                                selectedEditRequest.pending_modifications.delivery_date
                              ).toLocaleString()
                            : "No change"}
                        </p>
                      </div>
                      <div>
                        <span className="text-green-700 font-medium">
                          Delivery Address:
                        </span>
                        <p className="text-green-900">
                          {selectedEditRequest.pending_modifications
                            ?.delivery_address || "No change"}
                        </p>
                      </div>
                      {selectedEditRequest.pending_modifications
                        ?.special_instructions && (
                        <div>
                          <span className="text-green-700 font-medium">
                            Instructions:
                          </span>
                          <p className="text-green-900">
                            {
                              selectedEditRequest.pending_modifications
                                .special_instructions
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Selection */}
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">
                    Select Action:
                  </Label>
                  <div className="flex gap-4 mb-4">
                    <Button
                      variant={
                        editRequestAction === "approve" ? "default" : "outline"
                      }
                      onClick={() => setEditRequestAction("approve")}
                      className={
                        editRequestAction === "approve"
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                    >
                      ✓ Approve As-Is
                    </Button>
                    <Button
                      variant={
                        editRequestAction === "modify" ? "default" : "outline"
                      }
                      onClick={() => setEditRequestAction("modify")}
                      className={
                        editRequestAction === "modify"
                          ? "bg-blue-500 hover:bg-blue-600"
                          : ""
                      }
                    >
                      ✏️ Modify & Approve
                    </Button>
                    <Button
                      variant={
                        editRequestAction === "reject" ? "default" : "outline"
                      }
                      onClick={() => setEditRequestAction("reject")}
                      className={
                        editRequestAction === "reject"
                          ? "bg-red-500 hover:bg-red-600"
                          : ""
                      }
                    >
                      ✗ Reject
                    </Button>
                  </div>

                  {/* Modify Form */}
                  {editRequestAction === "modify" && (
                    <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                      <Label>Modify Requested Changes:</Label>
                      <div>
                        <Label className="text-sm">Delivery Date</Label>
                        <Input
                          type="datetime-local"
                          value={
                            editRequestForm.delivery_date?.slice(0, 16) || ""
                          }
                          onChange={(e) =>
                            setEditRequestForm({
                              ...editRequestForm,
                              delivery_date: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Delivery Address</Label>
                        <Input
                          value={editRequestForm.delivery_address || ""}
                          onChange={(e) =>
                            setEditRequestForm({
                              ...editRequestForm,
                              delivery_address: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Special Instructions</Label>
                        <Textarea
                          value={editRequestForm.special_instructions || ""}
                          onChange={(e) =>
                            setEditRequestForm({
                              ...editRequestForm,
                              special_instructions: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {editRequestAction === "reject" && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <Label className="text-sm">
                        Rejection Reason (Required)
                      </Label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this request is being rejected..."
                        required
                      />
                    </div>
                  )}

                  {/* Admin Notes */}
                  <div className="mt-4">
                    <Label className="text-sm">Admin Notes (Optional)</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Any additional notes for the customer..."
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditRequestDialog(false)}
                    disabled={processingEditRequest}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleProcessEditRequest}
                    disabled={processingEditRequest}
                    className={
                      editRequestAction === "approve"
                        ? "bg-green-500 hover:bg-green-600"
                        : editRequestAction === "modify"
                        ? "bg-blue-500 hover:bg-blue-600"
                        : "bg-red-500 hover:bg-red-600"
                    }
                  >
                    {processingEditRequest ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {editRequestAction === "approve" && "✓ Approve Request"}
                        {editRequestAction === "modify" &&
                          "✏️ Modify & Approve"}
                        {editRequestAction === "reject" && "✗ Reject Request"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
