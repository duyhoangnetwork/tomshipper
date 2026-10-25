const STORAGE_KEY = "tom_shipper_orders_v2";
const THEME_STORAGE_KEY = "tom_shipper_theme_v1";
const MAX_STORAGE_DAYS = 180;

let pendingConfirmAction = null;
let pendingPhotoConfirmAction = null;
let editingOrderId = null;
let currentProofOrder = null;
let statsView = "day";
let historyExportScope = "day";
let activeTabName = "home";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function getLocalDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatCompletionTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} - ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function cleanPhone(value = "") {
  return String(value).replace(/[^\d+]/g, "");
}

function getOrders() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function cleanOldOrders() {
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - MAX_STORAGE_DAYS);
  limitDate.setHours(0, 0, 0, 0);

  const validOrders = getOrders().filter((order) => {
    return new Date(`${order.date}T00:00:00`) >= limitDate;
  });

  saveOrders(validOrders);
}

function saveNewOrders(newOrders) {
  if (!newOrders.length) return;

  const allOrders = getOrders();
  allOrders.unshift(...newOrders);
  saveOrders(allOrders);
  renderAll();
}

function createOrder(data) {
  return {
    id: createId(),
    customerName: data.customerName.trim(),
    phone: cleanPhone(data.phone),
    detail: data.detail.trim(),
    address: data.address.trim(),
    note: data.note.trim(),
    paymentMethod: data.paymentMethod || "bank",
    status: "pending",
    date: getLocalDate(),
    createdAt: new Date().toISOString(),
    completedAt: null,
    proofImage: null
  };
}

function updateOrder(id, updates) {
  const orders = getOrders().map((order) => {
    return order.id === id ? { ...order, ...updates } : order;
  });

  saveOrders(orders);
  renderAll();
}

function getStatus(status) {
  const statuses = {
    pending: {
      label: "Đang giao",
      className: "status-pending"
    },
    completed: {
      label: "Hoàn thành",
      className: "status-completed"
    },
    cancelled: {
      label: "Đã hủy",
      className: "status-cancelled"
    }
  };

  return statuses[status] || statuses.pending;
}

function buildOrderCard(order, isHistory = false) {
  const status = getStatus(order.status);
  const isPending = order.status === "pending";
  const isCash = order.paymentMethod === "cod";
  const telUrl = `tel:${encodeURIComponent(order.phone)}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
  const completionTimeLabel = order.status === "completed"
    ? (formatCompletionTimestamp(order.completedAt) || "Chưa lưu mốc giờ")
    : "";

  return `
    <article class="order-card ${order.status}">
      <div class="order-main">
        <div class="customer-row">
          <div>
            <h3 class="customer-name">${escapeHTML(order.customerName)}</h3>
            <a class="customer-phone" href="${telUrl}">
              📞 ${escapeHTML(order.phone || "Chưa có số điện thoại")}
            </a>
          </div>
          <span class="status-badge ${status.className}">${status.label}</span>
        </div>

        ${order.status === "completed" ? `
          <div class="completion-time" aria-label="Thời gian hoàn thành">
            <span aria-hidden="true">🕒</span>
            <span>Đã giao lúc: ${escapeHTML(completionTimeLabel)}</span>
          </div>
        ` : ""}

        <p class="order-detail">${escapeHTML(order.detail)}</p>

        <div class="address-line">
          <svg><use href="#i-map"></use></svg>
          <span>${escapeHTML(order.address)}</span>
        </div>

        ${
          order.note
            ? `
              <div class="note-line">
                <span>📝</span>
                <span>${escapeHTML(order.note)}</span>
              </div>
            `
            : ""
        }

        ${
          order.proofImage
            ? `
              <button class="proof-thumbnail-button" type="button" data-action="view-proof" data-id="${order.id}" aria-label="Xem ảnh xác nhận giao hàng">
                <img class="proof-thumbnail" src="${order.proofImage}" alt="Ảnh xác nhận giao hàng" />
                <span>Ảnh xác nhận giao hàng · Nhấn để phóng to</span>
              </button>
            `
            : ""
        }

        <div class="payment-row">
          <div class="payment-type">
            <svg><use href="#${isCash ? "i-card" : "i-bank"}"></use></svg>
            <span>${isCash ? "Tiền mặt (COD)" : "Chuyển khoản (Bank)"}</span>
          </div>

          ${
            isPending
              ? `
                <button
                  class="payment-toggle ${isCash ? "cod" : ""}"
                  data-action="toggle-payment"
                  data-id="${order.id}"
                >
                  ${isCash ? "Đổi sang Bank" : "Khách trả tiền mặt"}
                </button>
              `
              : ""
          }
        </div>
        ${isPending ? `
          <div class="order-edit-row">
            <button class="edit-order-button" type="button" data-action="edit-order" data-id="${order.id}">✏️ Sửa đơn</button>
          </div>
        ` : ""}
        ${isHistory ? `
          <div class="history-card-actions">
            <button class="delete-history-order" type="button" data-action="delete-order" data-id="${order.id}" aria-label="Xóa đơn hàng">🗑️ Xóa đơn này</button>
          </div>
        ` : ""}
      </div>

      ${
        isPending && !isHistory
          ? `
            <div class="quick-actions">
              <a class="quick-action call" href="${telUrl}">
                <svg><use href="#i-phone"></use></svg>
                <span>Gọi ngay</span>
              </a>

              <a class="quick-action map" href="${mapUrl}" target="_blank" rel="noopener">
                <svg><use href="#i-map"></use></svg>
                <span>Bản đồ</span>
              </a>

              <button class="quick-action complete" data-action="complete" data-id="${order.id}">
                <svg><use href="#i-check"></use></svg>
                <span>Hoàn thành</span>
              </button>

              <button class="quick-action cancel" data-action="cancel" data-id="${order.id}">
                <svg><use href="#i-close"></use></svg>
                <span>Hủy đơn</span>
              </button>
            </div>
          `
          : ""
      }
    </article>
  `;
}

function renderHome() {
  const today = getLocalDate();
  const pendingOrders = getOrders().filter(
    (order) => order.date === today && order.status === "pending"
  );

  $("#todayLabel").textContent = formatDate(today);
  $("#pendingCountBadge").textContent = `${pendingOrders.length} đơn`;
  $("#orderList").innerHTML = pendingOrders.map((order) => buildOrderCard(order)).join("");
  $("#homeEmpty").classList.toggle("hidden", pendingOrders.length > 0);
}

function addDaysToLocalDate(dateString, dayOffset) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + dayOffset);
  return getLocalDate(date);
}

function getWeekRange(anchorDate) {
  const date = new Date(`${anchorDate}T12:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addDaysToLocalDate(anchorDate, mondayOffset);
  return { start, end: addDaysToLocalDate(start, 6) };
}

function getCompletedDate(order) {
  if (order.completedAt) {
    const parsed = new Date(order.completedAt);
    if (!Number.isNaN(parsed.getTime())) return getLocalDate(parsed);
  }
  return order.date;
}

function renderStats() {
  const today = getLocalDate();
  const allOrders = getOrders();
  const dayOrders = allOrders.filter((order) => order.date === today);
  const dayCompleted = dayOrders.filter((order) => order.status === "completed").length;
  const dayPending = dayOrders.filter((order) => order.status === "pending").length;
  const dayCancelled = dayOrders.filter((order) => order.status === "cancelled").length;

  $("#completedCount").textContent = dayCompleted;
  $("#pendingCount").textContent = dayPending;
  $("#cancelledCount").textContent = dayCancelled;

  const isWeek = statsView === "week";
  $("#statsDayView").classList.toggle("hidden", isWeek);
  $("#statsWeekView").classList.toggle("hidden", !isWeek);
  $("#weekFilterWrap").classList.toggle("hidden", !isWeek);
  $("#statsHeading").textContent = isWeek ? "Thống kê theo tuần" : "Thống kê hôm nay";
  $$(".stats-view-button").forEach((button) => {
    const selected = button.dataset.statsView === statsView;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  if (!isWeek) {
    $("#statsDateLabel").textContent = formatDate(today);
    return;
  }

  if (!$("#statsWeekDate").value) $("#statsWeekDate").value = today;
  const range = getWeekRange($("#statsWeekDate").value);
  const dates = Array.from({ length: 7 }, (_, index) => addDaysToLocalDate(range.start, index));
  const inRange = (dateString) => dateString >= range.start && dateString <= range.end;
  const completedOrders = allOrders.filter((order) => order.status === "completed" && inRange(getCompletedDate(order)));
  const pendingOrders = allOrders.filter((order) => order.status === "pending" && inRange(order.date));
  const cancelledOrders = allOrders.filter((order) => order.status === "cancelled" && inRange(order.date));

  $("#weeklyCompletedCount").textContent = completedOrders.length;
  $("#weeklyPendingCount").textContent = pendingOrders.length;
  $("#weeklyCancelledCount").textContent = cancelledOrders.length;
  $("#statsDateLabel").textContent = `${formatDate(range.start)} – ${formatDate(range.end)}`;

  const counts = dates.map((date) => completedOrders.filter((order) => getCompletedDate(order) === date).length);
  const maxCount = Math.max(1, ...counts);
  $("#weeklyBreakdown").innerHTML = dates.map((date, index) => {
    const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
    const dayNumber = date.slice(8, 10);
    const count = counts[index];
    const height = count === 0 ? 4 : Math.max(12, Math.round((count / maxCount) * 100));
    return `<div class="weekly-bar-column" title="${escapeHTML(formatDate(date))}: ${count} đơn">
      <strong class="weekly-bar-count">${count}</strong>
      <div class="weekly-bar-track"><span class="weekly-bar-fill" style="height:${height}%"></span></div>
      <span class="weekly-bar-day">${escapeHTML(weekday)}</span><span class="weekly-bar-date">${dayNumber}</span>
    </div>`;
  }).join("");
}

function renderHistory() {
  const selectedDate = $("#historyDate").value || getLocalDate();

  // Lịch sử chỉ lưu các đơn giao thành công; ngày lọc là ngày hoàn thành.
  const orders = getOrders()
    .filter((order) => order.status === "completed" && getCompletedDate(order) === selectedDate)
    .sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0));

  $("#historyList").innerHTML = orders
    .map((order) => buildOrderCard(order, true))
    .join("");

  $("#historyEmpty").classList.toggle("hidden", orders.length > 0);
  updateHistoryExportControls();
}

function getHistoryExportSelection() {
  const selectedDate = $("#historyDate").value || getLocalDate();
  const range = historyExportScope === "week" ? getWeekRange(selectedDate) : null;
  const inRange = (dateString) => historyExportScope === "day"
    ? dateString === selectedDate
    : dateString >= range.start && dateString <= range.end;
  const orders = getOrders()
    .filter((order) => order.status === "completed" && inRange(getCompletedDate(order)))
    .sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0));

  const periodLabel = historyExportScope === "day"
    ? `Theo ngày: ${formatDate(selectedDate)}`
    : `Theo tuần: ${formatDate(range.start)} – ${formatDate(range.end)}`;
  const fileRange = historyExportScope === "day"
    ? selectedDate
    : `${range.start}_${range.end}`;

  return { orders, selectedDate, range, periodLabel, fileRange };
}

function updateHistoryExportControls() {
  const countElement = $("#historyExportCount");
  const summaryElement = $("#historyExportSummary");
  if (!countElement || !summaryElement) return;

  const selection = getHistoryExportSelection();
  countElement.textContent = `${selection.orders.length} đơn`;
  summaryElement.textContent = `${selection.periodLabel}. Số đơn hoàn thành sẽ xuất: ${selection.orders.length}. Mỗi đơn theo mẫu: Tên khách - Đơn hàng - Địa chỉ - Số điện thoại - Ghi chú.`;

  $$("[data-export-scope]").forEach((button) => {
    const active = button.dataset.exportScope === historyExportScope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderAll() {
  cleanOldOrders();
  renderHome();
  renderStats();
  renderHistory();
}

function changeTab(tabName) {
  if (!document.getElementById(`${tabName}Tab`)) return;
  const tabOrder = ["home", "stats", "history"];
  const oldIndex = tabOrder.indexOf(activeTabName);
  const newIndex = tabOrder.indexOf(tabName);
  const direction = newIndex >= oldIndex ? "tab-enter-left" : "tab-enter-right";

  $$(".tab-content").forEach((element) => {
    element.classList.remove("active", "tab-enter-left", "tab-enter-right");
  });
  $$(".nav-item").forEach((element) => element.classList.remove("active"));

  const panel = $(`#${tabName}Tab`);
  if (!panel) return;
  panel.classList.add("active", direction);
  // Restart the entry animation even when the same tab is tapped again.
  void panel.offsetWidth;
  activeTabName = tabName;
  $(`.nav-item[data-tab="${tabName}"]`)?.classList.add("active");

  // Nút thêm đơn chỉ xuất hiện ở tab Trang chủ.
  $("#headerAddButton").classList.toggle("hidden", tabName !== "home");

  if (tabName === "history") renderHistory();
  if (tabName === "stats") renderStats();
}

function showOrderModal() {
  // Thêm đơn luôn mở duy nhất giao diện nhập hàng loạt.
  editingOrderId = null;
  $("#bulkForm").reset();
  $("#bulkOrderText").value = "";
  $("#bulkForm").classList.remove("hidden");
  $("#manualForm").classList.add("hidden");
  $("#orderModalTitle").textContent = "Thêm đơn hàng";
  $("#orderModalSubtitle").textContent = "Dán nhiều đơn — mỗi dòng là một đơn hàng";
  $("#saveBulkOrdersButton").innerHTML = '<svg><use href="#i-plus"></use></svg> Lưu tất cả đơn';
  $("#orderModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#bulkOrderText").focus(), 150);
}

function openEditOrder(order) {
  if (!order || order.status !== "pending") return;
  editingOrderId = order.id;

  // Giữ nguyên form sửa đơn từng trường như phiên bản cũ; không dùng textarea nhập nhiều đơn.
  $("#manualForm").reset();
  $("#customerName").value = order.customerName || "";
  $("#customerPhone").value = order.phone || "";
  $("#orderDetail").value = order.detail || "";
  $("#customerAddress").value = order.address || "";
  $("#orderNote").value = order.note || "";
  $("#cashPayment").checked = order.paymentMethod === "cod";
  $("#customerPhone").required = false;
  $("#customerAddress").required = false;

  $("#bulkForm").classList.add("hidden");
  $("#manualForm").classList.remove("hidden");
  $("#orderModalTitle").textContent = "Sửa đơn hàng";
  $("#orderModalSubtitle").textContent = `Cập nhật thông tin đơn của ${order.customerName}`;
  $("#orderModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#customerName").focus(), 150);
}

function closeOrderModal() {
  $("#orderModal").classList.add("hidden");
  document.body.style.overflow = "";
  editingOrderId = null;
  // Reset modal về trạng thái nhập hàng loạt cho lần thêm đơn tiếp theo.
  $("#manualForm").classList.add("hidden");
  $("#bulkForm").classList.remove("hidden");
}

function openConfirm({ title, message, type, onAccept, onPhoto }) {
  pendingConfirmAction = onAccept;
  pendingPhotoConfirmAction = onPhoto || null;
  const photoButton = $("#confirmPhotoComplete");
  photoButton.classList.toggle("hidden", type !== "complete" || typeof onPhoto !== "function");

  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  $("#confirmAccept").textContent = type === "complete" ? "Hoàn thành" : "Xác nhận";
  $("#confirmAccept").className = type === "complete" ? "primary-button" : "danger-button";

  $("#confirmIcon").innerHTML =
    type === "complete"
      ? '<svg><use href="#i-check"></use></svg>'
      : '<svg><use href="#i-close"></use></svg>';

  $("#confirmModal").classList.remove("hidden");
}

function closeConfirm() {
  pendingConfirmAction = null;
  pendingPhotoConfirmAction = null;
  $("#confirmModal").classList.add("hidden");
}

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function handleCardAction(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const { action, id } = actionButton.dataset;
  const order = getOrders().find((item) => item.id === id);

  if (!order) return;

  if (action === "edit-order") {
    openEditOrder(order);
    return;
  }

  if (action === "delete-order") {
    openConfirm({
      title: "Xóa đơn trong lịch sử?",
      message: `Bạn có chắc muốn xóa đơn của ${order.customerName} ngày ${formatDate(order.date)}? Thao tác này không thể hoàn tác.`,
      type: "cancel",
      onAccept: () => {
        saveOrders(getOrders().filter((item) => item.id !== id));
        renderAll();
        showToast("Đã xóa đơn hàng khỏi lịch sử.");
      }
    });
    return;
  }

  if (action === "toggle-payment") {
    const paymentMethod = order.paymentMethod === "cod" ? "bank" : "cod";

    updateOrder(id, { paymentMethod });

    showToast(
      paymentMethod === "cod"
        ? "Đã chọn khách trả tiền mặt."
        : "Đã chuyển sang thanh toán Bank."
    );
  }

  if (action === "complete") {
    openConfirm({
      title: "Hoàn thành đơn?",
      message: `Xác nhận đã giao thành công cho ${order.customerName}.`,
      type: "complete",
      onAccept: () => {
        const completedAt = new Date().toISOString();
        updateOrder(id, {
          status: "completed",
          completedAt
        });

        showToast("Đơn hàng đã hoàn thành.");
      },
      onPhoto: () => {
        const input = $("#proofPhotoInput");
        input.dataset.orderId = id;
        input.dataset.completeAfterPhoto = "true";
        // Capture the completion-confirmation time before the camera opens.
        input.dataset.completionTimestamp = new Date().toISOString();
        input.value = "";
        input.click();
      }
    });
  }

  if (action === "view-proof") {
    openProofLightbox(order);
  }

  if (action === "cancel") {
    openConfirm({
      title: "Hủy đơn hàng?",
      message: `Đơn của ${order.customerName} sẽ được chuyển sang trạng thái đã hủy.`,
      type: "cancel",
      onAccept: () => {
        updateOrder(id, { status: "cancelled" });
        showToast("Đơn hàng đã được hủy.");
      }
    });
  }
}

function addManualOrder(event) {
  event.preventDefault();

  const customerName = $("#customerName").value.trim();
  const phone = $("#customerPhone").value.trim();
  const detail = $("#orderDetail").value.trim();
  const address = $("#customerAddress").value.trim();
  const note = $("#orderNote").value.trim();

  if (!editingOrderId) {
    showToast("Form này chỉ dùng để sửa đơn đang chờ giao.");
    return;
  }

  if (!customerName || !detail) {
    showToast("Vui lòng nhập ít nhất tên khách hàng và chi tiết đơn hàng.");
    return;
  }

  const current = getOrders().find((order) => order.id === editingOrderId);
  if (!current || current.status !== "pending") {
    showToast("Chỉ có thể sửa đơn đang chờ giao.");
    closeOrderModal();
    return;
  }

  updateOrder(editingOrderId, {
    customerName,
    phone: cleanPhone(phone),
    detail,
    address,
    note,
    paymentMethod: $("#cashPayment").checked ? "cod" : "bank"
  });
  closeOrderModal();
  showToast("Đã cập nhật đơn hàng.");
}

function addBulkOrders(event) {
  event.preventDefault();

  const rawText = $("#bulkOrderText").value.trim();
  if (!rawText) {
    showToast("Vui lòng nhập danh sách đơn hàng.");
    return;
  }

  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsedOrders = [];
  let invalidLines = 0;

  lines.forEach((line) => {
    // Giữ lại trường trống, ví dụ: Tên - Đơn hàng - - Địa chỉ - Ghi chú.
    const parts = line.split(/(?<=\s)-(?=\s|$)/).map((part) => part.trim());
    const customerName = parts[0] || "";
    const detail = parts[1] || "";
    // Định dạng thêm đơn chuẩn: Tên khách - Đơn hàng - Địa chỉ - Số điện thoại - Ghi chú.
    const address = parts[2] || "";
    const phone = parts[3] || "";
    const note = parts.slice(4).join(" - ").trim();

    if (!customerName || !detail) {
      invalidLines += 1;
      return;
    }

    parsedOrders.push({ customerName, detail, phone, address, note });
  });

  if (!parsedOrders.length) {
    showToast("Không có dòng nào đúng định dạng.");
    return;
  }

  const newOrders = parsedOrders.map((data) => createOrder({ ...data, paymentMethod: "bank" }));
  saveNewOrders(newOrders);
  closeOrderModal();

  const message = invalidLines > 0
    ? `Đã thêm ${newOrders.length} đơn. Bỏ qua ${invalidLines} dòng lỗi.`
    : `Đã thêm thành công ${newOrders.length} đơn hàng.`;
  showToast(message);
}

function openProofLightbox(order) {
  if (!order || !order.proofImage) {
    showToast("Đơn hàng chưa có ảnh xác nhận.");
    return;
  }

  currentProofOrder = order;
  $("#proofLightboxImage").src = order.proofImage;
  const proofDate = order.completedAt ? formatDate(getLocalDate(new Date(order.completedAt))) : (order.proofImageAt ? formatDate(getLocalDate(new Date(order.proofImageAt))) : formatDate(order.date));
  $("#proofLightboxCaption").textContent = `Ảnh xác nhận · ${order.customerName} · ${proofDate}`;
  $("#proofLightbox").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeProofLightbox() {
  $("#proofLightbox").classList.add("hidden");
  $("#proofLightboxImage").removeAttribute("src");
  currentProofOrder = null;
  document.body.style.overflow = "";
}

function safeFileName(value = "KhachHang") {
  const normalized = String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "KhachHang";
}

async function downloadBrandedProof() {
  const order = currentProofOrder;
  if (!order?.proofImage) {
    showToast("Không tìm thấy ảnh xác nhận để tải.");
    return;
  }
  try {
    const image = new Image();
    image.src = order.proofImage;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Không thể đọc ảnh xác nhận."));
    });

    // Canvas 2x-friendly high-resolution PNG with a crisp, square Ocean Blue frame.
    const maxWidth = 1800;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const imageWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const imageHeight = Math.max(1, Math.round(image.naturalHeight * scale));
    const border = Math.max(8, Math.round(imageWidth * 0.009));
    const pad = Math.max(22, Math.round(imageWidth * 0.025));
    const headerHeight = Math.max(148, Math.round(imageWidth * 0.17));
    const footerHeight = Math.max(50, Math.round(imageWidth * 0.055));
    const canvas = document.createElement("canvas");
    canvas.width = imageWidth + (pad + border) * 2;
    canvas.height = imageHeight + headerHeight + footerHeight + (pad + border) * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Thiết bị không hỗ trợ xuất ảnh.");

    const ocean = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    ocean.addColorStop(0, "#075985");
    ocean.addColorStop(0.55, "#0284c7");
    ocean.addColorStop(1, "#38bdf8");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // A narrow inner rule keeps all four corners perfectly square.
    ctx.strokeStyle = "rgba(224,242,254,.72)";
    ctx.lineWidth = Math.max(2, Math.round(border * 0.22));
    ctx.strokeRect(border / 2, border / 2, canvas.width - border, canvas.height - border);

    const imageX = pad + border;
    const imageY = headerHeight + pad + border;
    const whiteBand = ctx.createLinearGradient(0, border, canvas.width, headerHeight);
    whiteBand.addColorStop(0, "rgba(7,89,133,.25)");
    whiteBand.addColorStop(1, "rgba(255,255,255,.06)");
    ctx.fillStyle = whiteBand;
    ctx.fillRect(border, border, canvas.width - border * 2, headerHeight);

    const left = imageX;
    const usableWidth = canvas.width - imageX * 2;
    const name = String(order.customerName || "Khách hàng");
    const address = String(order.address || "Chưa có địa chỉ giao hàng");
    const formattedCompletionTime = formatCompletionTimestamp(order.completedAt);
    const completionTimeText = formattedCompletionTime
      ? `🕒 ${formattedCompletionTime}`
      : "🕒 Chưa lưu mốc giờ hoàn thành";

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    let nameFontSize = Math.max(20, Math.round(imageWidth * 0.029));
    ctx.font = `800 ${nameFontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    while (ctx.measureText(name).width > usableWidth && nameFontSize > 16) {
      nameFontSize -= 2;
      ctx.font = `800 ${nameFontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    }
    const nameY = border + Math.max(14, Math.round(pad * 0.32));
    ctx.fillText(name, left, nameY, usableWidth);

    // Wrap the delivery address to at most two lines.
    const addressFontSize = Math.max(14, Math.round(imageWidth * 0.017));
    ctx.font = `500 ${addressFontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,.94)";
    const addressY = nameY + Math.round(nameFontSize * 1.25);
    const addressLineHeight = Math.round(addressFontSize * 1.3);
    const addressLines = [];
    let line = "";
    let addressOverflowed = false;
    for (const word of address.split(/\s+/)) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width > usableWidth && line) {
        addressLines.push(line);
        line = word;
        if (addressLines.length === 2) {
          addressOverflowed = true;
          break;
        }
      } else {
        line = trial;
      }
    }
    if (!addressOverflowed && line) addressLines.push(line);
    if (addressOverflowed && addressLines.length) {
      const lastIndex = addressLines.length - 1;
      let lastLine = addressLines[lastIndex];
      while (ctx.measureText(`${lastLine}…`).width > usableWidth && lastLine.length > 1) {
        lastLine = lastLine.slice(0, -1);
      }
      addressLines[lastIndex] = `${lastLine}…`;
    }
    addressLines.slice(0, 2).forEach((text, index) => {
      ctx.fillText(text, left, addressY + index * addressLineHeight, usableWidth);
    });

    const timeFontSize = Math.max(14, Math.round(imageWidth * 0.018));
    ctx.font = `700 ${timeFontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.fillStyle = "#e0f2fe";
    const timeY = addressY + Math.max(1, addressLines.length) * addressLineHeight + Math.max(7, Math.round(pad * 0.12));
    let visibleTimeFontSize = timeFontSize;
    while (ctx.measureText(completionTimeText).width > usableWidth && visibleTimeFontSize > 12) {
      visibleTimeFontSize -= 1;
      ctx.font = `700 ${visibleTimeFontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    }
    ctx.fillText(completionTimeText, left, timeY, usableWidth);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
    ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);

    const footerY = imageY + imageHeight + pad;
    ctx.strokeStyle = "rgba(224,242,254,.55)";
    ctx.lineWidth = Math.max(1, Math.round(border * 0.18));
    ctx.beginPath();
    ctx.moveTo(imageX, footerY - Math.max(7, Math.round(pad * 0.28)));
    ctx.lineTo(imageX + imageWidth, footerY - Math.max(7, Math.round(pad * 0.28)));
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${Math.max(12, Math.round(imageWidth * 0.014))}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,.93)";
    ctx.fillText("Tom Shipper by Duy Hoang Network", canvas.width / 2, footerY + footerHeight / 2, imageWidth);

    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể xuất PNG.")), "image/png"));
    const fileName = `XacNhan_Don_${safeFileName(name)}.png`;
    const imageFile = new File([blob], fileName, { type: "image/png", lastModified: Date.now() });

    // Hệ điều hành sẽ cho chọn Photos/Gallery hoặc ứng dụng đích; không thể ép trình duyệt tự ghi vào thư viện ảnh.
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({ files: [imageFile], title: "Ảnh xác thực giao hàng", text: `Ảnh xác nhận giao hàng · ${name} · ${formattedCompletionTime || "Chưa lưu mốc giờ"}` });
        showToast("Đã chia sẻ ảnh xác thực. Chọn Lưu hình ảnh nếu được hỗ trợ.");
        return;
      } catch (shareError) {
        // Khi người dùng tự hủy bảng chia sẻ, không tải file thứ hai ngoài ý muốn.
        if (shareError && shareError.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    showToast("Đã tạo ảnh PNG để lưu vào thiết bị.");
  } catch (error) {
    showToast(error.message || "Không thể lưu ảnh xác thực.");
  }
}

function compressImageToDataURL(file, maxDimension = 1440, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Không thể xử lý ảnh trên thiết bị này."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không đọc được ảnh đã chọn."));
    };

    image.src = objectUrl;
  });
}

async function handleProofPhotoSelected(event) {
  const input = event.currentTarget;
  const file = input.files && input.files[0];
  const orderId = input.dataset.orderId;
  const requestedCompletionTimestamp = input.dataset.completionTimestamp;
  if (!file || !orderId) {
    delete input.dataset.orderId;
    delete input.dataset.completeAfterPhoto;
    delete input.dataset.completionTimestamp;
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast("Vui lòng chọn một tệp hình ảnh.");
    delete input.dataset.orderId;
    delete input.dataset.completeAfterPhoto;
    delete input.dataset.completionTimestamp;
    input.value = "";
    return;
  }

  try {
    const imageData = await compressImageToDataURL(file);
    const orders = getOrders();
    const index = orders.findIndex((order) => order.id === orderId);
    if (index < 0) {
      showToast("Không tìm thấy đơn hàng cần lưu ảnh.");
      return;
    }

    orders[index].proofImage = imageData;
    orders[index].proofImageAt = new Date().toISOString();
    const completeAfterPhoto = input.dataset.completeAfterPhoto === "true";
    if (completeAfterPhoto) {
      orders[index].status = "completed";
      orders[index].completedAt = requestedCompletionTimestamp || new Date().toISOString();
    }
    try {
      saveOrders(orders);
    } catch (storageError) {
      showToast("Không đủ dung lượng lưu ảnh. Hãy chọn ảnh nhỏ hơn.");
      return;
    }
    renderAll();
    showToast(completeAfterPhoto ? "Đã lưu ảnh và hoàn thành đơn hàng." : "Đã lưu ảnh xác nhận vào đơn hàng.");
  } catch (error) {
    showToast(error.message || "Không thể lưu ảnh xác nhận.");
  } finally {
    input.value = "";
    delete input.dataset.orderId;
    delete input.dataset.completeAfterPhoto;
    delete input.dataset.completionTimestamp;
  }
}

function normalizeExportField(value = "") {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function formatExportDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatOrderForExport(order) {
  // Thứ tự cố định theo mẫu nhập đơn. Bỏ các trường trống ở cuối để
  // đơn chỉ có Tên + Đơn hàng không bị thêm dấu "-" thừa phía sau.
  const fields = [order.customerName, order.detail, order.address, order.phone, order.note]
    .map(normalizeExportField);
  while (fields.length && !fields[fields.length - 1]) fields.pop();
  return fields.join(" - ");
}

function buildHistoryText(selection) {
  const orderLines = selection.orders.map(formatOrderForExport);
  return [
    "TOM SHIPPER",
    `Ngày giờ xuất: ${selection.exportedAt || formatExportDateTime()}`,
    `Tổng đơn: ${selection.orders.length}`,
    "",
    ...orderLines
  ].join("\r\n");
}

function wrapCanvasText(context, text, maxWidth) {
  const words = String(text || " ").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if (context.measureText(word).width > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      let chunk = "";
      for (const character of word) {
        const candidate = chunk + character;
        if (context.measureText(candidate).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk = candidate;
        }
      }
      currentLine = chunk;
      continue;
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine || !lines.length) lines.push(currentLine);
  return lines;
}

async function createHistoryPdfPages(selection) {
  const PAGE_WIDTH = 1240;
  const PAGE_HEIGHT = 1754;
  const LEFT = 76;
  const RIGHT = PAGE_WIDTH - 76;
  const MAX_WIDTH = RIGHT - LEFT;
  const BODY_BOTTOM = 1620;
  const LINE_HEIGHT = 34;
  const pages = [];

  function createPage() {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Thiết bị không hỗ trợ tạo PDF.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    const headerGradient = context.createLinearGradient(0, 0, PAGE_WIDTH, 180);
    headerGradient.addColorStop(0, "#082f49");
    headerGradient.addColorStop(0.58, "#0369a1");
    headerGradient.addColorStop(1, "#0ea5e9");
    context.fillStyle = headerGradient;
    context.fillRect(0, 0, PAGE_WIDTH, 195);

    context.textBaseline = "top";
    context.textAlign = "left";
    context.fillStyle = "#ffffff";
    context.font = "800 42px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    context.fillText("TOM SHIPPER", LEFT, 39, MAX_WIDTH);
    context.font = "500 22px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    context.fillStyle = "rgba(255,255,255,.94)";
    context.fillText(`Ngày giờ xuất: ${selection.exportedAt || formatExportDateTime()}`, LEFT, 100, MAX_WIDTH);
    context.font = "700 21px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    context.fillText(`Tổng đơn: ${selection.orders.length}`, LEFT, 139, MAX_WIDTH);

    // Kết thúc phần tiêu đề, danh sách đơn bắt đầu ngay bên dưới.
    context.strokeStyle = "#dbeafe";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(LEFT, 224);
    context.lineTo(RIGHT, 224);
    context.stroke();

    const page = { canvas, context, y: 250 };
    pages.push(page);
    return page;
  }

  let page = createPage();
  for (let index = 0; index < selection.orders.length; index += 1) {
    const text = formatOrderForExport(selection.orders[index]);
    page.context.font = "500 23px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    const lines = wrapCanvasText(page.context, text, MAX_WIDTH);
    page.context.fillStyle = "#0f172a";

    for (const line of lines) {
      if (page.y + LINE_HEIGHT > BODY_BOTTOM) {
        page = createPage();
        page.context.font = "500 23px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
        page.context.fillStyle = "#0f172a";
      }
      page.context.fillText(line, LEFT, page.y, MAX_WIDTH);
      page.y += LINE_HEIGHT;
    }

    page.y += 12;
    if (page.y + 15 < BODY_BOTTOM) {
      page.context.strokeStyle = "#e2e8f0";
      page.context.lineWidth = 1;
      page.context.beginPath();
      page.context.moveTo(LEFT, page.y - 3);
      page.context.lineTo(RIGHT, page.y - 3);
      page.context.stroke();
    }
    page.y += 12;
  }

  // Footer is applied after pagination so the page count is accurate.
  pages.forEach((item, index) => {
    const context = item.context;
    context.strokeStyle = "#bae6fd";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(LEFT, 1672);
    context.lineTo(RIGHT, 1672);
    context.stroke();
    context.font = "500 17px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    context.fillStyle = "#64748b";
    context.textBaseline = "middle";
    context.textAlign = "left";
    context.fillText("Tom Shipper by Duy Hoang Network", LEFT, 1704, MAX_WIDTH * 0.72);
    context.textAlign = "right";
    context.fillText(`Trang ${index + 1}/${pages.length}`, RIGHT, 1704, MAX_WIDTH * 0.25);
  });

  const images = [];
  for (const item of pages) {
    const blob = await new Promise((resolve, reject) => {
      item.canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể kết xuất trang PDF.")), "image/jpeg", 0.92);
    });
    images.push({ bytes: new Uint8Array(await blob.arrayBuffer()), width: item.canvas.width, height: item.canvas.height });
  }
  return images;
}

function buildPdfBlobFromJpegs(jpegPages) {
  if (!jpegPages.length) throw new Error("Không có trang để xuất PDF.");
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;
  const write = (part) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObject = (objectNumber) => {
    offsets[objectNumber] = length;
    write(`${objectNumber} 0 obj\n`);
  };
  const endObject = () => write("\nendobj\n");

  write("%PDF-1.4\n");
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const objectCount = 2 + jpegPages.length * 3;
  beginObject(1);
  write("<< /Type /Catalog /Pages 2 0 R >>");
  endObject();

  const pageRefs = jpegPages.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  beginObject(2);
  write(`<< /Type /Pages /Kids [${pageRefs}] /Count ${jpegPages.length} >>`);
  endObject();

  jpegPages.forEach((page, index) => {
    const pageObject = 3 + index * 3;
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    const contentBytes = encoder.encode("q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n");

    beginObject(pageObject);
    write(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    endObject();

    beginObject(contentObject);
    write(`<< /Length ${contentBytes.length} >>\nstream\n`);
    write(contentBytes);
    write("endstream");
    endObject();

    beginObject(imageObject);
    write(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`);
    write(page.bytes);
    write("\nendstream");
    endObject();
  });

  const xrefOffset = length;
  write(`xref\n0 ${objectCount + 1}\n`);
  write("0000000000 65535 f \n");
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    write(`${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}

async function shareOrDownloadExportFile(blob, fileName, title, shareText) {
  if (typeof File !== "undefined") {
    const file = new File([blob], fileName, { type: blob.type, lastModified: Date.now() });
    if (navigator.share && navigator.canShare) {
      try {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text: shareText });
          showToast("Đã mở chia sẻ file. Chọn Lưu vào Tệp nếu muốn lưu trên thiết bị.");
          return;
        }
      } catch (error) {
        // Người dùng hủy bảng chia sẻ thì không tự tải thêm một bản trùng.
        if (error && error.name === "AbortError") return;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast(`Đã tạo file ${fileName.split(".").pop().toUpperCase()} để tải về.`);
}

async function exportHistory() {
  const selection = getHistoryExportSelection();
  selection.exportedAt = formatExportDateTime(new Date());
  if (!selection.orders.length) {
    showToast("Không có đơn hoàn thành trong phạm vi đã chọn để xuất.");
    return;
  }

  const format = $("#historyExportFormat").value;
  const safeRange = selection.fileRange.replace(/[^0-9_-]/g, "");
  const fileName = `TomShipper_LichSu_${safeRange}.${format}`;
  const summary = `${selection.periodLabel} · ${selection.orders.length} đơn hoàn thành`;

  const exportButton = $("#exportHistoryButton");
  const originalButtonContent = exportButton.innerHTML;
  exportButton.disabled = true;
  exportButton.textContent = "Đang tạo file…";

  try {
    let blob;
    if (format === "pdf") {
      const pages = await createHistoryPdfPages(selection);
      blob = buildPdfBlobFromJpegs(pages);
    } else {
      // BOM giúp các ứng dụng trên iOS/Windows nhận đúng tiếng Việt UTF-8.
      blob = new Blob(["\uFEFF", buildHistoryText(selection)], { type: "text/plain;charset=utf-8" });
    }
    await shareOrDownloadExportFile(blob, fileName, "Tom Shipper · Lịch sử đơn hàng", summary);
  } catch (error) {
    console.error("History export failed:", error);
    showToast(error.message || "Không thể xuất lịch sử đơn hàng.");
  } finally {
    exportButton.disabled = false;
    exportButton.innerHTML = originalButtonContent;
  }
}

function applyTheme(theme, persist = true) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  const toggle = $("#themeToggle");
  if (toggle) {
    toggle.textContent = isDark ? "☀️" : "🌙";
    toggle.setAttribute("aria-label", isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối");
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.title = isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối";
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", isDark ? "#0f172a" : "#0284c7");
  if (persist) {
    try { localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light"); } catch {}
  }
}

function initializeTheme() {
  let savedTheme = "light";
  try { savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light"; } catch {}
  applyTheme(savedTheme === "dark" ? "dark" : "light", false);
}

function toggleTheme() {
  applyTheme(document.body.classList.contains("dark-mode") ? "light" : "dark");
}

function initEvents() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => changeTab(button.dataset.tab));
  });

  ["#headerAddButton", "#emptyAddButton"].forEach((selector) => {
    $(selector).addEventListener("click", showOrderModal);
  });

  $("#proofPhotoInput").addEventListener("change", handleProofPhotoSelected);
  $("#closeProofLightbox").addEventListener("click", closeProofLightbox);
  $("#downloadProofImage").addEventListener("click", downloadBrandedProof);
  $("#proofLightbox").addEventListener("click", (event) => {
    if (event.target === $("#proofLightbox")) closeProofLightbox();
  });

  $("#closeOrderModal").addEventListener("click", closeOrderModal);

  $("#orderModal").addEventListener("click", (event) => {
    if (event.target === $("#orderModal")) closeOrderModal();
  });

  $("#bulkForm").addEventListener("submit", addBulkOrders);
  $("#manualForm").addEventListener("submit", addManualOrder);
  $("#themeToggle").addEventListener("click", toggleTheme);

  $("#historyDate").addEventListener("change", renderHistory);
  $$("[data-export-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      historyExportScope = button.dataset.exportScope === "week" ? "week" : "day";
      updateHistoryExportControls();
    });
  });
  $("#exportHistoryButton").addEventListener("click", exportHistory);
  $$(".stats-view-button").forEach((button) => {
    button.addEventListener("click", () => {
      statsView = button.dataset.statsView;
      renderStats();
    });
  });
  $("#statsWeekDate").addEventListener("change", renderStats);

  $("#orderList").addEventListener("click", handleCardAction);
  $("#historyList").addEventListener("click", handleCardAction);

  $("#confirmCancel").addEventListener("click", closeConfirm);

  $("#confirmPhotoComplete").addEventListener("click", () => {
    if (typeof pendingPhotoConfirmAction === "function") {
      const action = pendingPhotoConfirmAction;
      closeConfirm();
      action();
    }
  });

  $("#confirmAccept").addEventListener("click", () => {
    if (typeof pendingConfirmAction === "function") {
      pendingConfirmAction();
    }

    closeConfirm();
  });

  $("#confirmModal").addEventListener("click", (event) => {
    if (event.target === $("#confirmModal")) closeConfirm();
  });

  $("#deleteTodayOrders").addEventListener("click", () => {
    const today = getLocalDate();
    const count = getOrders().filter((order) => order.date === today).length;
    if (!count) {
      showToast("Hôm nay chưa có đơn hàng để xóa.");
      return;
    }
    openConfirm({
      title: "Xóa tất cả đơn hôm nay?",
      message: `Thao tác này sẽ xóa ${count} đơn được tạo hôm nay. Dữ liệu ngày khác vẫn được giữ lại. Bạn có chắc chắn không?`,
      type: "cancel",
      onAccept: () => {
        saveOrders(getOrders().filter((order) => order.date !== today));
        renderAll();
        showToast("Đã xóa toàn bộ đơn hàng hôm nay.");
      }
    });
  });

  $("#resetAllOrders").addEventListener("click", () => {
    const count = getOrders().length;
    if (!count) {
      showToast("Dữ liệu đã trống, không cần đặt lại.");
      return;
    }
    openConfirm({
      title: "Đặt lại toàn bộ dữ liệu?",
      message: `Thao tác này sẽ xóa toàn bộ ${count} đơn hàng đã lưu trên thiết bị, bao gồm cả lịch sử các ngày trước. Không thể hoàn tác. Bạn có muốn bắt đầu lại từ đầu?`,
      type: "cancel",
      onAccept: () => {
        saveOrders([]);
        renderAll();
        showToast("Đã đặt lại dữ liệu. Sẵn sàng cho ca làm mới.");
      }
    });
  });

}

function initializeApp() {
  initializeTheme();
  cleanOldOrders();
  $("#historyDate").value = getLocalDate();

  initEvents();
  renderAll();

  const splash = $("#splashScreen");
  window.setTimeout(() => {
    splash?.classList.add("splash-hidden");
    document.body.classList.add("app-ready");
    window.setTimeout(() => splash?.remove(), 450);
  }, 1700);
}

document.addEventListener("DOMContentLoaded", initializeApp);
