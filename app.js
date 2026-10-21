const STORAGE_KEY = "tom_shipper_orders_v2";
const MAX_STORAGE_DAYS = 180;

let pendingConfirmAction = null;
let pendingPhotoConfirmAction = null;
let editingOrderId = null;
let currentProofOrder = null;

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

function renderStats() {
  const today = getLocalDate();
  const orders = getOrders().filter((order) => order.date === today);

  const completed = orders.filter((order) => order.status === "completed").length;
  const pending = orders.filter((order) => order.status === "pending").length;
  const cancelled = orders.filter((order) => order.status === "cancelled").length;

  $("#statsDateLabel").textContent = formatDate(today);
  $("#completedCount").textContent = completed;
  $("#pendingCount").textContent = pending;
  $("#cancelledCount").textContent = cancelled;
}

function renderHistory() {
  const selectedDate = $("#historyDate").value || getLocalDate();

  const orders = getOrders()
    .filter((order) => order.date === selectedDate)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
  $$(".tab-content").forEach((element) => element.classList.remove("active"));
  $$(".nav-item").forEach((element) => element.classList.remove("active"));

  $(`#${tabName}Tab`).classList.add("active");
  $(`.nav-item[data-tab="${tabName}"]`).classList.add("active");

  // Nút thêm đơn chỉ xuất hiện ở tab Trang chủ.
  $("#headerAddButton").classList.toggle("hidden", tabName !== "home");

  if (tabName === "history") renderHistory();
  if (tabName === "stats") renderStats();
}

function showOrderModal() {
  editingOrderId = null;
  resetOrderForm();
  $("#orderModalTitle").textContent = "Thêm đơn hàng";
  $("#orderModalSubtitle").textContent = "Chọn cách nhập phù hợp";
  $("#customerPhone").required = true;
  $("#customerAddress").required = true;
  $(".input-mode-tabs").classList.remove("hidden");
  $("#bulkForm").classList.add("hidden");
  $("#manualForm button[type=submit]").innerHTML = '<svg><use href="#i-plus"></use></svg> Lưu đơn hàng';
  $("#orderModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#customerName").focus(), 150);
}

function openEditOrder(order) {
  if (!order || order.status !== "pending") return;
  editingOrderId = order.id;
  $("#manualForm").reset();
  $("#customerName").value = order.customerName || "";
  $("#customerPhone").value = order.phone || "";
  $("#orderDetail").value = order.detail || "";
  $("#customerAddress").value = order.address || "";
  $("#orderNote").value = order.note || "";
  $("#cashPayment").checked = order.paymentMethod === "cod";
  $("#customerPhone").required = false;
  $("#customerAddress").required = false;
  $(".input-mode-tabs").classList.add("hidden");
  $("#bulkForm").classList.add("hidden");
  $("#manualForm").classList.remove("hidden");
  $("#orderModalTitle").textContent = "Sửa đơn hàng";
  $("#orderModalSubtitle").textContent = `Cập nhật thông tin đơn của ${order.customerName}`;
  $("#manualForm button[type=submit]").innerHTML = 'Lưu thay đổi';
  $("#orderModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#customerName").focus(), 150);
}

function closeOrderModal() {
  $("#orderModal").classList.add("hidden");
  document.body.style.overflow = "";
  editingOrderId = null;
}

function resetOrderForm() {
  $("#manualForm").reset();
  $("#bulkForm").reset();
  setInputMode("manual");
}

function setInputMode(mode) {
  $$(".input-mode").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  $("#manualForm").classList.toggle("hidden", mode !== "manual");
  $("#bulkForm").classList.toggle("hidden", mode !== "bulk");
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
        updateOrder(id, {
          status: "completed",
          completedAt: new Date().toISOString()
        });

        showToast("Đơn hàng đã hoàn thành.");
      },
      onPhoto: () => {
        const input = $("#proofPhotoInput");
        input.dataset.orderId = id;
        input.dataset.completeAfterPhoto = "true";
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

  if (editingOrderId) {
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
      customerName, phone: cleanPhone(phone), detail, address, note,
      paymentMethod: $("#cashPayment").checked ? "cod" : "bank"
    });
    closeOrderModal();
    showToast("Đã cập nhật đơn hàng.");
    return;
  }

  if (!customerName || !phone || !detail || !address) {
    showToast("Vui lòng nhập đầy đủ thông tin bắt buộc.");
    return;
  }

  saveNewOrders([
    createOrder({
      customerName,
      phone,
      detail,
      address,
      note,
      paymentMethod: $("#cashPayment").checked ? "cod" : "bank"
    })
  ]);

  closeOrderModal();
  showToast("Đã thêm đơn hàng.");
}

function addBulkOrders(event) {
  event.preventDefault();

  const rawText = $("#bulkOrderText").value.trim();

  if (!rawText) {
    showToast("Vui lòng nhập danh sách đơn hàng.");
    return;
  }

  const lines = rawText.split("\n").map((line) => line.trim()).filter(Boolean);
  const newOrders = [];
  let invalidLines = 0;

  lines.forEach((line) => {
    // Chỉ tách theo dấu gạch ngang có khoảng trắng hai bên để tránh cắt nhầm
    // dữ liệu như mã đơn hoặc nội dung có dấu gạch ngang liền nhau.
    const parts = line.split(/\s*-\s*/).map((part) => part.trim());

    if (parts.length < 2) {
      invalidLines += 1;
      return;
    }

    const customerName = parts[0] || "";
    const detail = parts[1] || "";
    const phone = parts[2] || "";
    const address = parts[3] || "";
    const note = parts.slice(4).join(" - ").trim();

    if (!customerName || !detail) {
      invalidLines += 1;
      return;
    }

    newOrders.push(
      createOrder({
        customerName,
        detail,
        phone,
        address,
        note,
        paymentMethod: "bank"
      })
    );
  });

  if (!newOrders.length) {
    showToast("Không có dòng nào đúng định dạng.");
    return;
  }

  saveNewOrders(newOrders);
  closeOrderModal();

  const message =
    invalidLines > 0
      ? `Đã thêm ${newOrders.length} đơn. Bỏ qua ${invalidLines} dòng lỗi.`
      : `Đã thêm thành công ${newOrders.length} đơn hàng.`;

  showToast(message);
}

function setupEnterNavigation() {
  const fields = [
    $("#customerName"),
    $("#customerPhone"),
    $("#orderDetail"),
    $("#customerAddress"),
    $("#orderNote")
  ];

  fields.forEach((field, index) => {
    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey) return;

      event.preventDefault();

      const nextField = fields[index + 1];

      if (nextField) {
        nextField.focus();
      } else {
        $("#manualForm").requestSubmit();
      }
    });
  });
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

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
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

    const maxWidth = 1800;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const imageWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const imageHeight = Math.max(1, Math.round(image.naturalHeight * scale));
    const pad = Math.max(24, Math.round(imageWidth * 0.025));
    const headerHeight = Math.max(112, Math.round(imageWidth * 0.105));
    const footerHeight = Math.max(96, Math.round(imageWidth * 0.09));
    const canvas = document.createElement("canvas");
    canvas.width = imageWidth + pad * 2;
    canvas.height = imageHeight + headerHeight + footerHeight + pad * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Thiết bị không hỗ trợ xuất ảnh.");

    // Ocean-blue branded card and rounded outer frame.
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#075985");
    gradient.addColorStop(0.52, "#0284c7");
    gradient.addColorStop(1, "#38bdf8");
    roundedRect(ctx, 0, 0, canvas.width, canvas.height, Math.max(26, pad));
    ctx.fillStyle = gradient;
    ctx.fill();

    const innerX = pad;
    const innerY = pad + headerHeight;
    const innerW = imageWidth;
    const innerH = imageHeight;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, innerX, innerY, innerW, innerH, Math.max(12, pad * 0.45));
    ctx.fill();
    ctx.save();
    roundedRect(ctx, innerX, innerY, innerW, innerH, Math.max(12, pad * 0.45));
    ctx.clip();
    ctx.drawImage(image, innerX, innerY, innerW, innerH);
    ctx.restore();

    const left = pad + 6;
    const usableWidth = canvas.width - pad * 2 - 12;
    const name = String(order.customerName || "Khách hàng");
    const phone = String(order.phone || "Chưa có số điện thoại");
    const doneDate = order.completedAt
      ? formatDate(getLocalDate(new Date(order.completedAt)))
      : (order.proofImageAt ? formatDate(getLocalDate(new Date(order.proofImageAt))) : formatDate(order.date));
    const headerTop = Math.max(28, Math.round(pad * 0.75));
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = `800 ${Math.max(22, Math.round(imageWidth * 0.035))}px system-ui, -apple-system, Segoe UI, sans-serif`;
    let customerLine = `${name}  ·  ${phone}`;
    while (ctx.measureText(customerLine).width > usableWidth && ctx.font.match(/(\d+)px/)) {
      const fontSize = Number(ctx.font.match(/(\d+)px/)[1]);
      if (fontSize <= 16) break;
      ctx.font = `800 ${fontSize - 2}px system-ui, -apple-system, Segoe UI, sans-serif`;
    }
    ctx.fillText(customerLine, left, headerTop, usableWidth);
    ctx.font = `500 ${Math.max(15, Math.round(imageWidth * 0.018))}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText(`Ngày hoàn thành: ${doneDate}`, left, headerTop + Math.max(38, Math.round(imageWidth * 0.047)), usableWidth);

    const footerY = innerY + innerH + Math.max(18, Math.round(pad * 0.65));
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(17, Math.round(imageWidth * 0.022))}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.fillText("Tom Shipper by Duy Hoang Network", canvas.width / 2, footerY + footerHeight * 0.36, canvas.width - pad * 2);
    ctx.font = `500 ${Math.max(13, Math.round(imageWidth * 0.015))}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText("BẰNG CHỨNG GIAO HÀNG", canvas.width / 2, footerY + footerHeight * 0.70, canvas.width - pad * 2);

    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể xuất PNG.")), "image/png"));
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Don_Hoan_Thanh_${safeFileName(name)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast("Đã tạo và tải ảnh xác thực có khung thương hiệu.");
  } catch (error) {
    showToast(error.message || "Không thể tải ảnh xác thực.");
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
  if (!file || !orderId) return;
  if (!file.type.startsWith("image/")) {
    showToast("Vui lòng chọn một tệp hình ảnh.");
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
      orders[index].completedAt = new Date().toISOString();
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
  }
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

  $$(".input-mode").forEach((button) => {
    button.addEventListener("click", () => setInputMode(button.dataset.mode));
  });

  $("#manualForm").addEventListener("submit", addManualOrder);
  $("#bulkForm").addEventListener("submit", addBulkOrders);

  $("#historyDate").addEventListener("change", renderHistory);

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

  setupEnterNavigation();
}

function initializeApp() {
  cleanOldOrders();
  $("#historyDate").value = getLocalDate();

  initEvents();
  renderAll();

  const splash = $("#splashScreen");
  window.setTimeout(() => {
    splash?.classList.add("splash-hidden");
    window.setTimeout(() => splash?.remove(), 450);
  }, 1700);
}

document.addEventListener("DOMContentLoaded", initializeApp);