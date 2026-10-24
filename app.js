const STORAGE_KEY = "tom_shipper_orders_v2";
const THEME_STORAGE_KEY = "tom_shipper_theme_v1";
const MAX_STORAGE_DAYS = 180;

let pendingConfirmAction = null;
let pendingPhotoConfirmAction = null;
let editingOrderId = null;
let currentProofOrder = null;
let statsView = "day";
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
  editingOrderId = null;
  $("#bulkForm").reset();
  $("#bulkOrderText").value = "";
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
  // Reuse the single bulk textarea so the add modal never switches to a manual form.
  $("#bulkOrderText").value = [
    order.customerName || "",
    order.detail || "",
    order.phone || "",
    order.address || "",
    order.note || ""
  ].join(" - ");
  $("#orderModalTitle").textContent = "Sửa đơn hàng";
  $("#orderModalSubtitle").textContent = `Sửa thông tin đơn của ${order.customerName}; chỉ nhập một dòng`;
  $("#saveBulkOrdersButton").innerHTML = 'Lưu thay đổi';
  $("#orderModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#bulkOrderText").focus(), 150);
}

function closeOrderModal() {
  $("#orderModal").classList.add("hidden");
  document.body.style.overflow = "";
  editingOrderId = null;
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
    // Only split on a hyphen surrounded by spaces; lookarounds preserve empty optional fields.
    const parts = line.split(/(?<=\s)-(?=\s|$)/).map((part) => part.trim());
    const customerName = parts[0] || "";
    const detail = parts[1] || "";
    const phone = parts[2] || "";
    const address = parts[3] || "";
    const note = parts.slice(4).join(" - ").trim();

    if (!customerName || !detail) {
      invalidLines += 1;
      return;
    }

    parsedOrders.push({ customerName, detail, phone, address, note });
  });

  if (editingOrderId) {
    if (parsedOrders.length !== 1 || lines.length !== 1 || invalidLines > 0) {
      showToast("Khi sửa đơn, vui lòng chỉ nhập đúng một dòng hợp lệ.");
      return;
    }

    const existingOrders = getOrders();
    const currentOrder = existingOrders.find((order) => order.id === editingOrderId);
    if (!currentOrder || currentOrder.status !== "pending") {
      showToast("Chỉ có thể sửa đơn đang chờ giao.");
      closeOrderModal();
      return;
    }

    const changes = parsedOrders[0];
    saveOrders(existingOrders.map((order) => order.id === editingOrderId ? {
      ...order,
      customerName: changes.customerName,
      detail: changes.detail,
      phone: cleanPhone(changes.phone),
      address: changes.address,
      note: changes.note
    } : order));
    closeOrderModal();
    renderAll();
    showToast("Đã cập nhật đơn hàng.");
    return;
  }

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
  $("#themeToggle").addEventListener("click", toggleTheme);

  $("#historyDate").addEventListener("change", renderHistory);
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
