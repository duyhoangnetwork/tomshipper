'use strict';

(function () {
  /* ==========================================================================
     CONSTANTS & STORAGE KEYS
     ========================================================================== */
  const STORAGE_ORDERS_KEY = 'tom_shipper_orders_v1';
  const STORAGE_SETTINGS_KEY = 'tom_shipper_settings_v1';
  const STORAGE_PROFILE_KEY = 'tom_shipper_profile_v1';
  const STORAGE_IMG_PREFIX = 'tom_shipper_img_';
  const LEGACY_KEYS = ['orders', 'tom_shipper_orders', 'shipper_orders'];
  const MAX_IMAGE_DIM = 1200;
  const AVATAR_IMAGE_DIM = 360;
  const JPEG_QUALITY = 0.78;

  const DEFAULT_SETTINGS = {
    theme: 'auto', // 'auto' | 'light' | 'dark'
    accentColor: 'blue', // 'blue' | 'orange' | 'green' | 'black' | 'white'
    bgStyle: 'ocean', // 'ocean' | 'neutral' | 'midnight'
    uiRadius: 'soft', // 'soft' | 'rounded' | 'sharp'
    defaultStartTab: 'home', // 'home' | 'stats' | 'history' | 'profile'
    largeText: false,
    compactCards: false,
    liquidGlass: true,
    glassBlur: 'medium', // 'light' | 'medium' | 'strong'
    touchRipple: true,
    cardMotion: true,
    orderSort: 'newest', // 'newest' | 'oldest' | 'carryover'
    singleExpand: false,
    autoExpandNew: false,
    showPaymentBadge: true,
    highlightCarryover: true,
    warnMissingPhoto: false,
    showCollapseButton: true,
    hapticFeedback: true,
    confirmActions: true,
    defaultPayment: 'cash', // 'cash' | 'transfer'
    mapProvider: 'auto' // 'auto' | 'google' | 'apple'
  };

  let idSequence = 0;
  let currentDayKey = getLocalDateKey(Date.now());

  const state = {
    orders: [],
    settings: Object.assign({}, DEFAULT_SETTINGS),
    profile: null,
    activeTab: 'home', // 'home' | 'stats' | 'history' | 'profile' | 'settings'
    expandedIds: new Set(),
    homeSearch: '',
    historySearch: '',
    historyDate: currentDayKey,
    historyShowAll: false,
    exportScope: 'day', // 'day' | 'week'
    statsMode: 'day', // 'day' | 'week'
    statsDate: currentDayKey,
    statsWeekType: 'calendar', // 'calendar' | 'last7'
    statsWeekDate: currentDayKey,
    pendingCameraOrderId: null,
    activeImageOrderId: null,
    confirmCallback: null,
    seenHomeCardIds: new Set(),
    seenHistoryCardIds: new Set(),
    tabScrollPositions: {
      home: 0,
      stats: 0,
      history: 0,
      profile: 0,
      settings: 0
    }
  };

  /* ==========================================================================
     DOM REFERENCES
     ========================================================================== */
  const dom = {
    headerContext: document.getElementById('header-context'),
    navItems: document.querySelectorAll('.nav-item'),
    pages: {
      home: document.getElementById('page-home'),
      stats: document.getElementById('page-stats'),
      history: document.getElementById('page-history'),
      profile: document.getElementById('page-profile'),
      settings: document.getElementById('page-settings')
    },
    fabAdd: document.getElementById('fab-add'),

    // Home
    homeSearchInput: document.getElementById('home-search-input'),
    homeSearchClear: document.getElementById('home-search-clear'),
    homeSummaryBar: document.getElementById('home-summary-bar'),
    ordersList: document.getElementById('orders-list'),
    homeEmpty: document.getElementById('home-empty'),
    homeEmptyTitle: document.getElementById('home-empty-title'),
    homeEmptyDesc: document.getElementById('home-empty-desc'),

    // Stats
    statsModeDay: document.getElementById('stats-mode-day'),
    statsModeWeek: document.getElementById('stats-mode-week'),
    statsDayControls: document.getElementById('stats-day-controls'),
    statsDateInput: document.getElementById('stats-date-input'),
    statsTodayBtn: document.getElementById('stats-today-btn'),
    statsWeekControls: document.getElementById('stats-week-controls'),
    weekTypeCalendar: document.getElementById('week-type-calendar'),
    weekTypeLast7: document.getElementById('week-type-last7'),
    statsWeekPickerWrap: document.getElementById('stats-week-picker-wrap'),
    statsWeekDate: document.getElementById('stats-week-date'),
    statsWeekRangeLabel: document.getElementById('stats-week-range-label'),
    statsKpiGrid: document.getElementById('stats-kpi-grid'),
    statsChartPanel: document.getElementById('stats-chart-panel'),
    statsBarChart: document.getElementById('stats-bar-chart'),

    // History
    historySearchInput: document.getElementById('history-search-input'),
    historySearchClear: document.getElementById('history-search-clear'),
    historyDateInput: document.getElementById('history-date-input'),
    historyAllDatesBtn: document.getElementById('history-all-dates-btn'),
    exportScopeDay: document.getElementById('export-scope-day'),
    exportScopeWeek: document.getElementById('export-scope-week'),
    btnExportTxt: document.getElementById('btn-export-txt'),
    btnExportPdf: document.getElementById('btn-export-pdf'),
    historySummaryBar: document.getElementById('history-summary-bar'),
    historyList: document.getElementById('history-list'),
    historyEmpty: document.getElementById('history-empty'),
    historyEmptyTitle: document.getElementById('history-empty-title'),
    historyEmptyDesc: document.getElementById('history-empty-desc'),

    // Profile
    btnEditProfile: document.getElementById('btn-edit-profile'),
    btnEditProfileInline: document.getElementById('btn-edit-profile-inline'),
    profileAvatarImg: document.getElementById('profile-avatar-img'),
    profileAvatarDefault: document.getElementById('profile-avatar-default'),
    btnChangeAvatar: document.getElementById('btn-change-avatar'),
    btnUploadAvatar: document.getElementById('btn-upload-avatar'),
    btnResetAvatar: document.getElementById('btn-reset-avatar'),
    avatarInput: document.getElementById('avatar-input'),
    profileDisplayName: document.getElementById('profile-display-name'),
    profileRoleBadge: document.getElementById('profile-role-badge'),
    profileBioText: document.getElementById('profile-bio-text'),
    profileStatPending: document.getElementById('profile-stat-pending'),
    profileStatCompleted: document.getElementById('profile-stat-completed'),
    profileInfoList: document.getElementById('profile-info-list'),

    // Settings
    settingThemeGroup: document.getElementById('setting-theme-group'),
    settingAccentGroup: document.getElementById('setting-accent-group'),
    settingBgGroup: document.getElementById('setting-bg-group'),
    settingRadiusGroup: document.getElementById('setting-radius-group'),
    settingStartTabGroup: document.getElementById('setting-start-tab-group'),
    settingBlurGroup: document.getElementById('setting-blur-group'),
    settingSortGroup: document.getElementById('setting-sort-group'),
    settingPaymentGroup: document.getElementById('setting-payment-group'),
    settingMapGroup: document.getElementById('setting-map-group'),
    settingToggleBtns: document.querySelectorAll('[data-setting-toggle]'),
    settingsDataSummary: document.getElementById('settings-data-summary'),
    btnBackupExport: document.getElementById('btn-backup-export'),
    btnBackupImport: document.getElementById('btn-backup-import'),
    importBackupInput: document.getElementById('import-backup-input'),
    btnClearCancelled: document.getElementById('btn-clear-cancelled'),
    btnResetSettings: document.getElementById('btn-reset-settings'),
    btnClearAllOrders: document.getElementById('btn-clear-all-orders'),

    // Modals
    modalAdd: document.getElementById('modal-add'),
    formAddOrders: document.getElementById('form-add-orders'),
    bulkOrdersInput: document.getElementById('bulk-orders-input'),
    addErrorMsg: document.getElementById('add-error-msg'),

    modalEdit: document.getElementById('modal-edit'),
    formEditOrder: document.getElementById('form-edit-order'),
    editOrderId: document.getElementById('edit-order-id'),
    editName: document.getElementById('edit-name'),
    editPhone: document.getElementById('edit-phone'),
    editOrderDetail: document.getElementById('edit-order-detail'),
    editAddress: document.getElementById('edit-address'),
    editNote: document.getElementById('edit-note'),
    editPayment: document.getElementById('edit-payment'),
    editErrorMsg: document.getElementById('edit-error-msg'),

    modalProfile: document.getElementById('modal-profile'),
    formEditProfile: document.getElementById('form-edit-profile'),
    profileInputName: document.getElementById('profile-input-name'),
    profileInputHotline: document.getElementById('profile-input-hotline'),
    profileInputGmail: document.getElementById('profile-input-gmail'),
    profileInputZalo: document.getElementById('profile-input-zalo'),
    profileInputVehicle: document.getElementById('profile-input-vehicle'),
    profileInputArea: document.getElementById('profile-input-area'),
    profileInputBio: document.getElementById('profile-input-bio'),

    modalConfirm: document.getElementById('modal-confirm'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
    confirmOkBtn: document.getElementById('confirm-ok-btn'),

    modalImage: document.getElementById('modal-image'),
    modalImagePreview: document.getElementById('modal-image-preview'),
    modalImageCaption: document.getElementById('modal-image-caption'),
    modalImageDownloadBtn: document.getElementById('modal-image-download-btn'),

    cameraInput: document.getElementById('camera-input'),
    toastContainer: document.getElementById('toast-container'),
    printArea: document.getElementById('print-area')
  };

  /* ==========================================================================
     DATE, STRING & DEVICE UTILITIES
     ========================================================================== */
  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function getLocalDateKey(timestamp) {
    const d = new Date(timestamp);
    return (
      d.getFullYear() +
      '-' +
      pad2(d.getMonth() + 1) +
      '-' +
      pad2(d.getDate())
    );
  }

  function parseDateKeyToLocalDate(dateKey) {
    const parts = String(dateKey || '').split('-');
    if (parts.length !== 3) {
      return new Date();
    }
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    return new Date(y, m, day, 0, 0, 0, 0);
  }

  function formatDayMonth(timestamp) {
    const d = new Date(timestamp);
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1);
  }

  function formatDateSlash(timestamp) {
    const d = new Date(timestamp);
    return (
      pad2(d.getDate()) +
      '/' +
      pad2(d.getMonth() + 1) +
      '/' +
      d.getFullYear()
    );
  }

  function formatTimeDate(timestamp) {
    const d = new Date(timestamp);
    return (
      pad2(d.getHours()) +
      ':' +
      pad2(d.getMinutes()) +
      ' - ' +
      pad2(d.getDate()) +
      '/' +
      pad2(d.getMonth() + 1) +
      '/' +
      d.getFullYear()
    );
  }

  function formatExportTimestamp(timestamp) {
    const d = new Date(timestamp);
    return (
      pad2(d.getDate()) +
      '/' +
      pad2(d.getMonth() + 1) +
      '/' +
      d.getFullYear() +
      ' ' +
      pad2(d.getHours()) +
      ':' +
      pad2(d.getMinutes())
    );
  }

  function getMondayOfWeek(dateKey) {
    const date = parseDateKeyToLocalDate(dateKey);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    date.setDate(date.getDate() + diffToMonday);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getWeekDaysFromMonday(mondayDate) {
    const days = [];
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      days.push({
        key: getLocalDateKey(d.getTime()),
        label: dayLabels[i],
        shortDate: pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1),
        dateObj: d
      });
    }
    return days;
  }

  function getLast7Days(anchorDateKey) {
    const end = parseDateKeyToLocalDate(anchorDateKey);
    const days = [];
    const weekdayMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      days.push({
        key: getLocalDateKey(d.getTime()),
        label: weekdayMap[d.getDay()],
        shortDate: pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1),
        dateObj: d
      });
    }
    return days;
  }

  function normalizeVietnamese(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function generateUniqueId() {
    idSequence += 1;
    return (
      'ord_' +
      Date.now().toString(36) +
      '_' +
      idSequence.toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 6)
    );
  }

  function isAppleDevice() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    return (
      /iPad|iPhone|iPod|Macintosh/.test(ua) ||
      (/Mac/.test(platform) && navigator.maxTouchPoints > 0)
    );
  }

  function buildMapUrl(address) {
    const encoded = encodeURIComponent(address.trim());
    const provider = state.settings.mapProvider;
    if (provider === 'apple') {
      return 'https://maps.apple.com/?q=' + encoded;
    }
    if (provider === 'google') {
      return 'https://www.google.com/maps/search/?api=1&query=' + encoded;
    }
    if (isAppleDevice()) {
      return 'https://maps.apple.com/?q=' + encoded;
    }
    return 'https://www.google.com/maps/search/?api=1&query=' + encoded;
  }

  function sanitizePhoneHref(phone) {
    const cleaned = String(phone || '').replace(/[^\d+]/g, '');
    return cleaned.length > 0 ? 'tel:' + cleaned : '';
  }

  function isCarryoverOrder(order) {
    if (!order || order.status !== 'pending') return false;
    return getLocalDateKey(order.createdAt) < currentDayKey;
  }

  function getPaymentLabel(method) {
    return method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt';
  }

  /* ==========================================================================
     SVG ICON FACTORIES (NO EXTERNAL CDN)
     ========================================================================== */
  function createSvgIcon(pathsMarkup, size) {
    const s = size || 18;
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    span.style.display = 'inline-flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    span.innerHTML =
      '<svg viewBox="0 0 24 24" width="' +
      s +
      '" height="' +
      s +
      '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      pathsMarkup +
      '</svg>';
    return span;
  }

  const ICONS = {
    chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>',
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z"></path>',
    mapPin:
      '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
    check: '<polyline points="20 6 9 17 4 12"></polyline>',
    xCircle:
      '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
    edit:
      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
    camera:
      '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>',
    mail:
      '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>',
    message:
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    truck:
      '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>',
    user:
      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>'
  };

  /* ==========================================================================
     LOCALSTORAGE PERSISTENCE & MIGRATION
     ========================================================================== */
  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return { ok: true };
    } catch (err) {
      const isQuota =
        err &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          err.code === 22);
      return {
        ok: false,
        quotaExceeded: Boolean(isQuota),
        error: err
      };
    }
  }

  function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      // Ignore storage removal errors
    }
  }

  function sanitizeOrder(raw, existingIds) {
    if (!raw || typeof raw !== 'object') return null;

    let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateUniqueId();
    while (existingIds.has(id)) {
      id = generateUniqueId();
    }
    existingIds.add(id);

    const statusRaw = raw.status;
    const status =
      statusRaw === 'completed' || statusRaw === 'cancelled' || statusRaw === 'pending'
        ? statusRaw
        : 'pending';

    const paymentMethod = raw.paymentMethod === 'transfer' ? 'transfer' : 'cash';
    const createdAt =
      typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now();

    let completedAt =
      typeof raw.completedAt === 'number' && Number.isFinite(raw.completedAt)
        ? raw.completedAt
        : null;
    if (status === 'completed' && !completedAt) {
      completedAt = createdAt;
    }

    const cancelledAt =
      typeof raw.cancelledAt === 'number' && Number.isFinite(raw.cancelledAt)
        ? raw.cancelledAt
        : null;

    // Load proof image from per-order key or migrate inline image safely
    let proofImage = null;
    const storedImg = safeStorageGet(STORAGE_IMG_PREFIX + id);
    if (storedImg && storedImg.startsWith('data:image/')) {
      proofImage = storedImg;
    } else if (
      typeof raw.proofImage === 'string' &&
      raw.proofImage.startsWith('data:image/')
    ) {
      proofImage = raw.proofImage;
      safeStorageSet(STORAGE_IMG_PREFIX + id, proofImage);
    }

    return {
      id: id,
      name: String(raw.name || raw.customerName || '').trim() || 'Khách hàng',
      phone: String(raw.phone || '').trim(),
      order: String(raw.order || raw.items || raw.detail || '').trim() || 'Đơn hàng',
      address: String(raw.address || '').trim(),
      note: String(raw.note || '').trim(),
      paymentMethod: paymentMethod,
      status: status,
      createdAt: createdAt,
      completedAt: completedAt,
      cancelledAt: cancelledAt,
      proofImage: proofImage
    };
  }

  function serializeOrderMeta(order) {
    return {
      id: order.id,
      name: order.name,
      phone: order.phone,
      order: order.order,
      address: order.address,
      note: order.note,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      proofImage: null
    };
  }

  function persistOrdersMeta() {
    const payload = state.orders.map(serializeOrderMeta);
    const res = safeStorageSet(STORAGE_ORDERS_KEY, JSON.stringify(payload));
    if (!res.ok) {
      if (res.quotaExceeded) {
        showToast(
          'Bộ nhớ trình duyệt đã đầy! Vui lòng xóa bớt ảnh xác nhận cũ.',
          'error'
        );
      } else {
        showToast('Không thể lưu dữ liệu vào bộ nhớ trình duyệt.', 'error');
      }
      return false;
    }
    return true;
  }

  function persistOrderProofImage(orderId, base64DataUrl) {
    if (!base64DataUrl) {
      safeStorageRemove(STORAGE_IMG_PREFIX + orderId);
      return true;
    }
    const res = safeStorageSet(STORAGE_IMG_PREFIX + orderId, base64DataUrl);
    if (!res.ok) {
      if (res.quotaExceeded) {
        showToast(
          'Dung lượng localStorage đã đầy. Hãy xóa bớt ảnh cũ trước khi lưu ảnh mới.',
          'error'
        );
      } else {
        showToast('Không thể lưu ảnh vào bộ nhớ trình duyệt.', 'error');
      }
      return false;
    }
    return true;
  }

  function loadOrdersFromStorage() {
    let rawJson = safeStorageGet(STORAGE_ORDERS_KEY);
    let migratedFromLegacy = false;

    if (!rawJson) {
      for (let i = 0; i < LEGACY_KEYS.length; i++) {
        const legacy = safeStorageGet(LEGACY_KEYS[i]);
        if (legacy) {
          rawJson = legacy;
          migratedFromLegacy = true;
          break;
        }
      }
    }

    if (!rawJson) {
      state.orders = [];
      return;
    }

    try {
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) {
        state.orders = [];
        return;
      }
      const seenIds = new Set();
      const cleaned = [];
      for (let i = 0; i < parsed.length; i++) {
        const item = sanitizeOrder(parsed[i], seenIds);
        if (item) cleaned.push(item);
      }
      state.orders = cleaned;
      if (migratedFromLegacy) {
        persistOrdersMeta();
      }
    } catch (err) {
      state.orders = [];
      showToast('Dữ liệu lưu trữ bị lỗi định dạng, đã khởi tạo an toàn.', 'error');
    }
  }

  function findOrderById(orderId) {
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].id === orderId) return state.orders[i];
    }
    return null;
  }

  function sanitizeSettings(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const theme =
      src.theme === 'light' || src.theme === 'dark' || src.theme === 'auto'
        ? src.theme
        : DEFAULT_SETTINGS.theme;
    const accentColor =
      src.accentColor === 'blue' ||
      src.accentColor === 'orange' ||
      src.accentColor === 'green' ||
      src.accentColor === 'black' ||
      src.accentColor === 'white'
        ? src.accentColor
        : DEFAULT_SETTINGS.accentColor;
    const bgStyle =
      src.bgStyle === 'ocean' || src.bgStyle === 'neutral' || src.bgStyle === 'midnight'
        ? src.bgStyle
        : DEFAULT_SETTINGS.bgStyle;
    const uiRadius =
      src.uiRadius === 'soft' || src.uiRadius === 'rounded' || src.uiRadius === 'sharp'
        ? src.uiRadius
        : DEFAULT_SETTINGS.uiRadius;
    const defaultStartTab =
      src.defaultStartTab === 'home' ||
      src.defaultStartTab === 'stats' ||
      src.defaultStartTab === 'history' ||
      src.defaultStartTab === 'profile'
        ? src.defaultStartTab
        : DEFAULT_SETTINGS.defaultStartTab;
    const glassBlur =
      src.glassBlur === 'light' || src.glassBlur === 'medium' || src.glassBlur === 'strong'
        ? src.glassBlur
        : DEFAULT_SETTINGS.glassBlur;
    const orderSort =
      src.orderSort === 'newest' || src.orderSort === 'oldest' || src.orderSort === 'carryover'
        ? src.orderSort
        : DEFAULT_SETTINGS.orderSort;
    const defaultPayment =
      src.defaultPayment === 'transfer' || src.defaultPayment === 'cash'
        ? src.defaultPayment
        : DEFAULT_SETTINGS.defaultPayment;
    const mapProvider =
      src.mapProvider === 'google' || src.mapProvider === 'apple' || src.mapProvider === 'auto'
        ? src.mapProvider
        : DEFAULT_SETTINGS.mapProvider;

    return {
      theme: theme,
      accentColor: accentColor,
      bgStyle: bgStyle,
      uiRadius: uiRadius,
      defaultStartTab: defaultStartTab,
      largeText: Boolean(src.largeText),
      compactCards: Boolean(src.compactCards),
      liquidGlass: src.liquidGlass !== undefined ? Boolean(src.liquidGlass) : DEFAULT_SETTINGS.liquidGlass,
      glassBlur: glassBlur,
      touchRipple: src.touchRipple !== undefined ? Boolean(src.touchRipple) : DEFAULT_SETTINGS.touchRipple,
      cardMotion: src.cardMotion !== undefined ? Boolean(src.cardMotion) : DEFAULT_SETTINGS.cardMotion,
      orderSort: orderSort,
      singleExpand: Boolean(src.singleExpand),
      autoExpandNew: Boolean(src.autoExpandNew),
      showPaymentBadge:
        src.showPaymentBadge !== undefined
          ? Boolean(src.showPaymentBadge)
          : DEFAULT_SETTINGS.showPaymentBadge,
      highlightCarryover:
        src.highlightCarryover !== undefined
          ? Boolean(src.highlightCarryover)
          : DEFAULT_SETTINGS.highlightCarryover,
      warnMissingPhoto: Boolean(src.warnMissingPhoto),
      showCollapseButton:
        src.showCollapseButton !== undefined
          ? Boolean(src.showCollapseButton)
          : DEFAULT_SETTINGS.showCollapseButton,
      hapticFeedback:
        src.hapticFeedback !== undefined ? Boolean(src.hapticFeedback) : DEFAULT_SETTINGS.hapticFeedback,
      confirmActions:
        src.confirmActions !== undefined ? Boolean(src.confirmActions) : DEFAULT_SETTINGS.confirmActions,
      defaultPayment: defaultPayment,
      mapProvider: mapProvider
    };
  }

  function loadSettingsFromStorage() {
    const rawJson = safeStorageGet(STORAGE_SETTINGS_KEY);
    if (!rawJson) {
      state.settings = Object.assign({}, DEFAULT_SETTINGS);
      return;
    }
    try {
      const parsed = JSON.parse(rawJson);
      state.settings = sanitizeSettings(parsed);
    } catch (_) {
      state.settings = Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings() {
    safeStorageSet(STORAGE_SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function applySettingsToDocument() {
    const root = document.documentElement;
    const s = state.settings;
    root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-accent', s.accentColor);
    root.setAttribute('data-bg', s.bgStyle);
    root.setAttribute('data-radius', s.uiRadius);
    root.setAttribute('data-blur', s.glassBlur);
    root.classList.toggle('no-liquid-glass', !s.liquidGlass);
    root.classList.toggle('no-card-motion', !s.cardMotion);
    root.classList.toggle('large-text', Boolean(s.largeText));
    root.classList.toggle('compact-cards', Boolean(s.compactCards));
  }

  /* ==========================================================================
     DRIVER PROFILE PERSISTENCE & RENDERING
     ========================================================================== */
  function generateDefaultUsername() {
    const digits = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    return 'users_' + digits;
  }

  function sanitizeProfile(raw, fallbackDefaultName) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const validDefault =
      typeof src.defaultName === 'string' && /^users_\d{6}$/.test(src.defaultName.trim())
        ? src.defaultName.trim()
        : fallbackDefaultName || generateDefaultUsername();
    const avatarImage =
      typeof src.avatarImage === 'string' && src.avatarImage.startsWith('data:image/')
        ? src.avatarImage
        : null;

    return {
      defaultName: validDefault,
      name: String(src.name || '').trim(),
      hotline: String(src.hotline || '').trim(),
      gmail: String(src.gmail || '').trim(),
      zalo: String(src.zalo || '').trim(),
      vehicle: String(src.vehicle || '').trim(),
      area: String(src.area || '').trim(),
      bio: String(src.bio || '').trim(),
      avatarImage: avatarImage
    };
  }

  function loadProfileFromStorage() {
    const rawJson = safeStorageGet(STORAGE_PROFILE_KEY);
    if (!rawJson) {
      state.profile = sanitizeProfile({}, generateDefaultUsername());
      saveProfile();
      return;
    }
    try {
      const parsed = JSON.parse(rawJson);
      state.profile = sanitizeProfile(parsed);
      if (!parsed || typeof parsed.defaultName !== 'string' || !/^users_\d{6}$/.test(parsed.defaultName)) {
        saveProfile();
      }
    } catch (_) {
      state.profile = sanitizeProfile({}, generateDefaultUsername());
      saveProfile();
    }
  }

  function saveProfile() {
    if (!state.profile) return false;
    const res = safeStorageSet(STORAGE_PROFILE_KEY, JSON.stringify(state.profile));
    if (!res.ok) {
      if (res.quotaExceeded) {
        showToast('Dung lượng trình duyệt đã đầy, hãy chọn ảnh đại diện nhẹ hơn.', 'error');
      } else {
        showToast('Không thể lưu hồ sơ vào bộ nhớ trình duyệt.', 'error');
      }
      return false;
    }
    return true;
  }

  function buildZaloHref(zaloInput) {
    const digits = String(zaloInput || '').replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return '';
    return 'https://zalo.me/' + digits;
  }

  function createProfileInfoRow(iconSvg, label, value, actionHref, actionLabel) {
    const row = document.createElement('div');
    row.className = 'profile-info-row';

    const left = document.createElement('div');
    left.className = 'profile-info-left';

    const iconBox = document.createElement('div');
    iconBox.className = 'profile-info-icon';
    iconBox.appendChild(createSvgIcon(iconSvg, 19));

    const textCol = document.createElement('div');
    textCol.className = 'profile-info-text';

    const lbl = document.createElement('span');
    lbl.className = 'profile-info-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'profile-info-value' + (value ? '' : ' is-muted');
    val.textContent = value || 'Chưa cập nhật';

    textCol.appendChild(lbl);
    textCol.appendChild(val);
    left.appendChild(iconBox);
    left.appendChild(textCol);
    row.appendChild(left);

    if (value && actionHref && actionLabel) {
      const link = document.createElement('a');
      link.className = 'profile-info-action';
      link.href = actionHref;
      if (actionHref.startsWith('http')) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      link.textContent = actionLabel;
      row.appendChild(link);
    }

    return row;
  }

  function renderProfile() {
    if (!state.profile) {
      loadProfileFromStorage();
    }
    const p = state.profile;
    const hasCustomAvatar = Boolean(p.avatarImage);

    if (dom.profileAvatarImg && dom.profileAvatarDefault) {
      if (hasCustomAvatar) {
        dom.profileAvatarImg.src = p.avatarImage;
        dom.profileAvatarImg.hidden = false;
        dom.profileAvatarDefault.hidden = true;
      } else {
        dom.profileAvatarImg.removeAttribute('src');
        dom.profileAvatarImg.hidden = true;
        dom.profileAvatarDefault.hidden = false;
      }
    }

    if (dom.btnResetAvatar) {
      dom.btnResetAvatar.hidden = !hasCustomAvatar;
    }

    if (dom.profileDisplayName) {
      dom.profileDisplayName.textContent = p.name || p.defaultName;
    }

    if (dom.profileBioText) {
      if (p.bio) {
        dom.profileBioText.textContent = p.bio;
        dom.profileBioText.hidden = false;
      } else {
        dom.profileBioText.textContent = '';
        dom.profileBioText.hidden = true;
      }
    }

    let pendingCount = 0;
    let completedCount = 0;
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].status === 'pending') pendingCount += 1;
      else if (state.orders[i].status === 'completed') completedCount += 1;
    }
    if (dom.profileStatPending) {
      dom.profileStatPending.textContent = String(pendingCount);
    }
    if (dom.profileStatCompleted) {
      dom.profileStatCompleted.textContent = String(completedCount);
    }

    if (dom.profileInfoList) {
      dom.profileInfoList.innerHTML = '';

      const hotlineHref = sanitizePhoneHref(p.hotline);
      dom.profileInfoList.appendChild(
        createProfileInfoRow(ICONS.phone, 'Hotline / Số điện thoại', p.hotline, hotlineHref, 'Gọi')
      );

      const gmailHref = p.gmail && p.gmail.indexOf('@') !== -1 ? 'mailto:' + p.gmail : '';
      dom.profileInfoList.appendChild(
        createProfileInfoRow(ICONS.mail, 'Gmail / Email', p.gmail, gmailHref, 'Gửi thư')
      );

      const zaloHref = buildZaloHref(p.zalo);
      dom.profileInfoList.appendChild(
        createProfileInfoRow(ICONS.message, 'Zalo', p.zalo, zaloHref, 'Mở Zalo')
      );

      dom.profileInfoList.appendChild(
        createProfileInfoRow(ICONS.truck, 'Phương tiện & Biển số', p.vehicle)
      );

      dom.profileInfoList.appendChild(
        createProfileInfoRow(ICONS.mapPin, 'Khu vực giao hàng', p.area)
      );

      dom.profileInfoList.appendChild(
        createProfileInfoRow(ICONS.user, 'Mã tài xế mặc định', p.defaultName)
      );
    }
  }

  function openEditProfileModal() {
    if (!state.profile) loadProfileFromStorage();
    const p = state.profile;
    dom.profileInputName.value = p.name;
    dom.profileInputHotline.value = p.hotline;
    dom.profileInputGmail.value = p.gmail;
    dom.profileInputZalo.value = p.zalo;
    dom.profileInputVehicle.value = p.vehicle;
    dom.profileInputArea.value = p.area;
    dom.profileInputBio.value = p.bio;
    openModal(dom.modalProfile);
    dom.profileInputName.focus();
  }

  function renderSettings() {
    const s = state.settings;

    if (dom.settingThemeGroup) {
      dom.settingThemeGroup.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
        const active = btn.dataset.themeChoice === s.theme;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    if (dom.settingAccentGroup) {
      dom.settingAccentGroup.querySelectorAll('[data-accent-choice]').forEach(function (btn) {
        const active = btn.dataset.accentChoice === s.accentColor;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    if (dom.settingBgGroup) {
      dom.settingBgGroup.querySelectorAll('[data-bg-choice]').forEach(function (btn) {
        const active = btn.dataset.bgChoice === s.bgStyle;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    if (dom.settingRadiusGroup) {
      dom.settingRadiusGroup.querySelectorAll('[data-radius-choice]').forEach(function (btn) {
        const active = btn.dataset.radiusChoice === s.uiRadius;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    if (dom.settingStartTabGroup) {
      dom.settingStartTabGroup.querySelectorAll('[data-start-tab-choice]').forEach(function (btn) {
        const active = btn.dataset.startTabChoice === s.defaultStartTab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    if (dom.settingBlurGroup) {
      dom.settingBlurGroup.querySelectorAll('[data-blur-choice]').forEach(function (btn) {
        const active = btn.dataset.blurChoice === s.glassBlur;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    if (dom.settingSortGroup) {
      dom.settingSortGroup.querySelectorAll('[data-sort-choice]').forEach(function (btn) {
        const active = btn.dataset.sortChoice === s.orderSort;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    if (dom.settingPaymentGroup) {
      dom.settingPaymentGroup.querySelectorAll('[data-payment-choice]').forEach(function (btn) {
        const active = btn.dataset.paymentChoice === s.defaultPayment;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    if (dom.settingMapGroup) {
      dom.settingMapGroup.querySelectorAll('[data-map-choice]').forEach(function (btn) {
        const active = btn.dataset.mapChoice === s.mapProvider;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    dom.settingToggleBtns.forEach(function (btn) {
      const key = btn.dataset.settingToggle;
      if (!key) return;
      const isOn = Boolean(s[key]);
      btn.classList.toggle('is-on', isOn);
      btn.setAttribute('aria-checked', isOn ? 'true' : 'false');
    });

    if (dom.settingsDataSummary) {
      let pending = 0;
      let completed = 0;
      let cancelled = 0;
      let photos = 0;
      for (let i = 0; i < state.orders.length; i++) {
        const o = state.orders[i];
        if (o.status === 'pending') pending += 1;
        else if (o.status === 'completed') completed += 1;
        else if (o.status === 'cancelled') cancelled += 1;
        if (o.proofImage) photos += 1;
      }
      dom.settingsDataSummary.textContent =
        'Tổng ' +
        state.orders.length +
        ' đơn (' +
        pending +
        ' chờ giao · ' +
        completed +
        ' đã giao · ' +
        cancelled +
        ' đã hủy · ' +
        photos +
        ' ảnh xác nhận)';
    }

    if (dom.btnClearCancelled) {
      const hasCancelled = state.orders.some(function (o) {
        return o.status === 'cancelled';
      });
      dom.btnClearCancelled.disabled = !hasCancelled;
    }

    if (dom.btnClearAllOrders) {
      dom.btnClearAllOrders.disabled = state.orders.length === 0;
    }
  }

  function exportBackupJson() {
    const backup = {
      app: 'Tom Shipper',
      version: 2,
      exportedAt: Date.now(),
      settings: state.settings,
      profile: state.profile,
      orders: state.orders.map(function (o) {
        return {
          id: o.id,
          name: o.name,
          phone: o.phone,
          order: o.order,
          address: o.address,
          note: o.note,
          paymentMethod: o.paymentMethod,
          status: o.status,
          createdAt: o.createdAt,
          completedAt: o.completedAt,
          cancelledAt: o.cancelledAt,
          proofImage: o.proofImage || null
        };
      })
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const fileName = 'tom-shipper-backup-' + getLocalDateKey(Date.now()) + '.json';
    triggerBlobDownload(blob, fileName);
    showToast('Đã xuất tệp sao lưu JSON (' + state.orders.length + ' đơn)!', 'success');
  }

  async function importBackupJsonFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawOrders = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.orders)
          ? parsed.orders
          : null;

      if (!rawOrders) {
        showToast('Tệp sao lưu JSON không đúng định dạng Tom Shipper.', 'error');
        return;
      }

      const existingIds = new Set(
        state.orders.map(function (o) {
          return o.id;
        })
      );

      let addedCount = 0;
      for (let i = 0; i < rawOrders.length; i++) {
        const item = rawOrders[i];
        if (!item || typeof item !== 'object') continue;
        if (typeof item.id === 'string' && existingIds.has(item.id)) {
          continue;
        }
        const sanitized = sanitizeOrder(item, existingIds);
        if (sanitized) {
          state.orders.push(sanitized);
          addedCount += 1;
        }
      }

      if (parsed && parsed.settings && typeof parsed.settings === 'object') {
        state.settings = sanitizeSettings(parsed.settings);
        saveSettings();
        applySettingsToDocument();
      }

      if (parsed && parsed.profile && typeof parsed.profile === 'object') {
        state.profile = sanitizeProfile(
          parsed.profile,
          state.profile ? state.profile.defaultName : undefined
        );
        saveProfile();
      }

      if (persistOrdersMeta()) {
        showToast(
          addedCount > 0
            ? 'Đã khôi phục ' + addedCount + ' đơn hàng từ tệp JSON!'
            : 'Dữ liệu đã có sẵn, không có đơn mới được thêm.',
          'success'
        );
      }
      renderAll();
    } catch (_) {
      showToast('Không thể đọc tệp sao lưu JSON.', 'error');
    }
  }

  /* ==========================================================================
     TOAST & MODALS
     ========================================================================== */
  function showToast(message, variant) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (variant ? ' toast-' + variant : '');
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    if (modalEl._closeTimer) {
      clearTimeout(modalEl._closeTimer);
      modalEl._closeTimer = null;
    }
    modalEl.classList.remove('is-closing');
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    if (!modalEl || modalEl.hidden) return;
    const reducedMotion =
      !state.settings.cardMotion ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const finalizeClose = function () {
      modalEl._closeTimer = null;
      modalEl.hidden = true;
      modalEl.classList.remove('is-closing');
      const anyOpen = document.querySelector('.modal-overlay:not([hidden])');
      if (!anyOpen) {
        document.body.style.overflow = '';
      }
    };

    if (reducedMotion) {
      finalizeClose();
      return;
    }

    if (modalEl._closeTimer) {
      clearTimeout(modalEl._closeTimer);
    }
    modalEl.classList.add('is-closing');
    modalEl._closeTimer = setTimeout(finalizeClose, 190);
  }

  function openConfirmDialog(options) {
    dom.confirmTitle.textContent = options.title || 'Xác nhận';
    dom.confirmMessage.textContent = options.message || '';
    dom.confirmOkBtn.textContent = options.okLabel || 'Xác nhận';
    dom.confirmOkBtn.className = 'btn ' + (options.okClass || 'btn-primary');
    state.confirmCallback = typeof options.onConfirm === 'function' ? options.onConfirm : null;
    openModal(dom.modalConfirm);
    dom.confirmOkBtn.focus();
  }

  /* ==========================================================================
     BULK PARSER (ADD ORDERS)
     ========================================================================== */
  function parseBulkOrders(rawText) {
    const lines = String(rawText || '').split(/\r?\n/);
    const validOrders = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip blank lines

      const parts = line.split(/\s*-\s*/);
      const name = (parts[0] || '').trim();
      const orderDetail = (parts[1] || '').trim();
      const address = (parts[2] || '').trim();
      const phone = (parts[3] || '').trim();
      const note = parts.length > 4 ? parts.slice(4).join(' - ').trim() : '';

      if (!name || !orderDetail) {
        errors.push(
          'Dòng ' +
            (i + 1) +
            ': Cần có ít nhất "Tên khách - Đơn hàng" (ví dụ: Trần Thị Mai - 1 phần cơm).'
        );
        continue;
      }

      validOrders.push({
        id: generateUniqueId(),
        name: name,
        phone: phone,
        order: orderDetail,
        address: address,
        note: note,
        paymentMethod: state.settings.defaultPayment === 'transfer' ? 'transfer' : 'cash',
        status: 'pending',
        createdAt: Date.now(),
        completedAt: null,
        cancelledAt: null,
        proofImage: null
      });
    }

    return { validOrders: validOrders, errors: errors };
  }

  /* ==========================================================================
     IMAGE COMPRESSION & CANVAS PROOF EXPORT
     ========================================================================== */
  function loadImageElement(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('Không thể đọc dữ liệu ảnh.'));
      };
      img.src = src;
    });
  }

  async function compressImageFile(file, maxDimOverride) {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Vui lòng chọn tệp hình ảnh hợp lệ.');
    }

    const maxDim = maxDimOverride || MAX_IMAGE_DIM;
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawable = null;
    let objectUrl = null;

    try {
      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(file, {
            imageOrientation: 'from-image'
          });
          drawable = bitmap;
          sourceWidth = bitmap.width;
          sourceHeight = bitmap.height;
        } catch (bitmapErr) {
          drawable = null;
        }
      }

      if (!drawable) {
        objectUrl = URL.createObjectURL(file);
        const img = await loadImageElement(objectUrl);
        drawable = img;
        sourceWidth = img.naturalWidth || img.width;
        sourceHeight = img.naturalHeight || img.height;
      }

      if (!sourceWidth || !sourceHeight) {
        throw new Error('Ảnh không có kích thước hợp lệ.');
      }

      const scale = Math.min(1, maxDim / Math.max(sourceWidth, sourceHeight));
      const targetW = Math.max(1, Math.round(sourceWidth * scale));
      const targetH = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Trình duyệt không hỗ trợ Canvas.');
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(drawable, 0, 0, targetW, targetH);

      if (drawable && typeof drawable.close === 'function') {
        drawable.close();
      }

      return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Single very long word fallback
          let chunk = '';
          for (let c = 0; c < word.length; c++) {
            const nextChunk = chunk + word[c];
            if (ctx.measureText(nextChunk).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = word[c];
            } else {
              chunk = nextChunk;
            }
          }
          currentLine = chunk;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines.length > 0 ? lines : [''];
  }

  function canvasToPngBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(function (blob) {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Không thể tạo tệp PNG.'));
          }
        }, 'image/png');
      } else {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const byteString = atob(dataUrl.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          resolve(new Blob([ab], { type: 'image/png' }));
        } catch (err) {
          reject(err);
        }
      }
    });
  }

  async function exportProofCanvas(order) {
    if (!order || !order.proofImage) {
      showToast('Đơn hàng chưa có ảnh xác nhận.', 'error');
      return;
    }

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const photoImg = await loadImageElement(order.proofImage);

      const canvasWidth = 1200;
      const outerBorder = 12;
      const contentPaddingX = 44;
      const textMaxWidth = canvasWidth - contentPaddingX * 2;
      const fontStack =
        '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif';

      // Build header text WITHOUT phone number
      const displayTime = formatTimeDate(order.completedAt || Date.now());
      const headerSegments = [order.name];
      if (order.address) {
        headerSegments.push(order.address);
      }
      headerSegments.push(displayTime);
      const headerSummaryText = headerSegments.join(' | ');

      // Measure header lines dynamically
      const measureCanvas = document.createElement('canvas');
      const mCtx = measureCanvas.getContext('2d');
      mCtx.font = '700 34px ' + fontStack;
      const headerLines = wrapCanvasText(mCtx, headerSummaryText, textMaxWidth);

      const lineHeight = 48;
      const headerPadY = 34;
      const headerHeight = headerPadY * 2 + headerLines.length * lineHeight;
      const footerHeight = 96;

      // Calculate middle photo container keeping natural aspect ratio cleanly
      const photoBoxPad = 28;
      const maxPhotoW = canvasWidth - outerBorder * 2 - photoBoxPad * 2;
      const maxPhotoH = 1280;
      const minPhotoH = 680;
      const naturalW = photoImg.naturalWidth || photoImg.width || 1000;
      const naturalH = photoImg.naturalHeight || photoImg.height || 1000;
      const aspectRatio = naturalH / naturalW;
      const idealPhotoH = Math.round(maxPhotoW * aspectRatio);
      const photoAreaInnerH = Math.max(minPhotoH, Math.min(maxPhotoH, idealPhotoH));
      const middleHeight = photoAreaInnerH + photoBoxPad * 2;

      const totalHeight = outerBorder * 2 + headerHeight + middleHeight + footerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = totalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Không khởi tạo được Canvas 2D.');
      }

      // Square corners (0px border radius) & Ocean Blue frame
      ctx.fillStyle = '#006CA5';
      ctx.fillRect(0, 0, canvasWidth, totalHeight);

      // Sharp inner matte background for photo section
      const middleTop = outerBorder + headerHeight;
      ctx.fillStyle = '#F4F8FB';
      ctx.fillRect(
        outerBorder,
        middleTop,
        canvasWidth - outerBorder * 2,
        middleHeight
      );

      // Draw top Ocean Blue header text (crisp white)
      ctx.fillStyle = '#006CA5';
      ctx.fillRect(outerBorder, outerBorder, canvasWidth - outerBorder * 2, headerHeight);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 34px ' + fontStack;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      for (let i = 0; i < headerLines.length; i++) {
        const y = outerBorder + headerPadY + i * lineHeight;
        ctx.fillText(headerLines[i], contentPaddingX, y);
      }

      // Draw centered photo without distortion or cropping
      const fitScale = Math.min(maxPhotoW / naturalW, photoAreaInnerH / naturalH);
      const drawW = Math.round(naturalW * fitScale);
      const drawH = Math.round(naturalH * fitScale);
      const drawX = Math.round((canvasWidth - drawW) / 2);
      const drawY = Math.round(middleTop + (middleHeight - drawH) / 2);

      // Crisp 2px border around image inside matte
      ctx.fillStyle = '#CBDCE8';
      ctx.fillRect(drawX - 2, drawY - 2, drawW + 4, drawH + 4);
      ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);

      // Draw bottom Ocean Blue footer
      const footerTop = middleTop + middleHeight;
      ctx.fillStyle = '#006CA5';
      ctx.fillRect(
        outerBorder,
        footerTop,
        canvasWidth - outerBorder * 2,
        footerHeight
      );

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 28px ' + fontStack;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Tom Shipper by Duy Hoang Network',
        canvasWidth / 2,
        footerTop + footerHeight / 2
      );

      // Sharp outer Ocean Blue border
      ctx.strokeStyle = '#004E78';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, canvasWidth - 4, totalHeight - 4);

      const blob = await canvasToPngBlob(canvas);
      const safeName = normalizeVietnamese(order.name)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'don-hang';
      const fileName = 'tom-shipper-' + safeName + '.png';
      const file = new File([blob], fileName, { type: 'image/png' });

      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: 'Ảnh xác nhận - ' + order.name
          });
          showToast('Đã lưu / chia sẻ ảnh xác nhận thành công!', 'success');
        } catch (shareErr) {
          if (shareErr && shareErr.name === 'AbortError') {
            // User cancelled share sheet: do NOT download duplicate or show saved toast
            return;
          }
          // Fallback to download only for non-cancellation errors
          triggerBlobDownload(blob, fileName);
          showToast('Đã tải ảnh xác nhận PNG!', 'success');
        }
        return;
      }

      triggerBlobDownload(blob, fileName);
      showToast('Đã tải ảnh xác nhận PNG!', 'success');
    } catch (err) {
      showToast(
        (err && err.message) || 'Không thể xuất ảnh xác nhận.',
        'error'
      );
    }
  }

  function triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  /* ==========================================================================
     CARD BUILDER (SHARED FOR HOME & HISTORY, ZERO XSS)
     ========================================================================== */
  function createDetailRow(label, value, isMuted, extraClass) {
    const row = document.createElement('div');
    row.className = 'detail-item';

    const lbl = document.createElement('span');
    lbl.className = 'detail-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className =
      'detail-value' +
      (isMuted ? ' is-muted' : '') +
      (extraClass ? ' ' + extraClass : '');
    val.textContent = value;

    row.appendChild(lbl);
    row.appendChild(val);
    return row;
  }

  function buildOrderCard(order, mode) {
    const isExpanded = state.expandedIds.has(order.id);
    const isHistory = mode === 'history';
    const carryover = !isHistory && isCarryoverOrder(order);

    const card = document.createElement('article');
    card.className = 'order-card' + (isExpanded ? ' expanded' : '');
    card.dataset.orderId = order.id;

    // Compact Trigger Area
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'card-compact-trigger';
    trigger.dataset.action = 'toggle-expand';
    trigger.dataset.orderId = order.id;
    trigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');

    const mainCol = document.createElement('div');
    mainCol.className = 'card-compact-main';

    const topLine = document.createElement('div');
    topLine.className = 'card-top-line';

    const nameHeading = document.createElement('h3');
    nameHeading.className = 'customer-name';
    nameHeading.textContent = order.name;
    topLine.appendChild(nameHeading);

    if (carryover && state.settings.highlightCarryover) {
      const carryTag = document.createElement('span');
      carryTag.className = 'carryover-tag';
      carryTag.textContent = 'Tạo từ ngày: ' + formatDayMonth(order.createdAt);
      topLine.appendChild(carryTag);
    }

    mainCol.appendChild(topLine);

    const addrPara = document.createElement('p');
    addrPara.className =
      'compact-address' + (order.address ? '' : ' is-missing');
    addrPara.textContent = order.address || 'Chưa có địa chỉ giao hàng';
    mainCol.appendChild(addrPara);

    const badgesRow = document.createElement('div');
    badgesRow.className = 'card-badges-row';

    const statusBadge = document.createElement('span');
    statusBadge.className =
      'badge ' + (isHistory ? 'badge-completed' : 'badge-pending');
    statusBadge.textContent = isHistory ? 'Đã giao' : 'Chờ giao';
    badgesRow.appendChild(statusBadge);

    if (state.settings.showPaymentBadge) {
      const payBadge = document.createElement('span');
      payBadge.className = 'badge badge-payment';
      payBadge.textContent = getPaymentLabel(order.paymentMethod);
      badgesRow.appendChild(payBadge);
    }

    if (order.proofImage) {
      const photoBadge = document.createElement('span');
      photoBadge.className = 'badge badge-photo-indicator';
      photoBadge.textContent = 'Có ảnh xác nhận';
      badgesRow.appendChild(photoBadge);
    }

    mainCol.appendChild(badgesRow);

    if (isHistory && order.completedAt) {
      const deliveredLine = document.createElement('p');
      deliveredLine.className = 'delivered-time-line';
      deliveredLine.textContent =
        '🕒 Đã giao lúc: ' + formatTimeDate(order.completedAt);
      mainCol.appendChild(deliveredLine);
    }

    const chevron = document.createElement('span');
    chevron.className = 'expand-chevron';
    chevron.appendChild(createSvgIcon(ICONS.chevronDown, 22));

    trigger.appendChild(mainCol);
    trigger.appendChild(chevron);
    card.appendChild(trigger);

    if (!isExpanded) {
      return card;
    }

    // Expanded Body
    const expandedBody = document.createElement('div');
    expandedBody.className = 'card-expanded-body';

    const detailList = document.createElement('div');
    detailList.className = 'detail-list';

    detailList.appendChild(createDetailRow('Khách hàng', order.name, false));
    detailList.appendChild(
      createDetailRow(
        'Số điện thoại',
        order.phone || 'Chưa có số điện thoại',
        !order.phone
      )
    );
    detailList.appendChild(
      createDetailRow('Nội dung đơn hàng', order.order, false)
    );
    detailList.appendChild(
      createDetailRow(
        'Địa chỉ giao hàng',
        order.address || 'Chưa có địa chỉ',
        !order.address
      )
    );
    detailList.appendChild(
      createDetailRow(
        'Ghi chú',
        order.note || 'Không có ghi chú',
        !order.note
      )
    );
    detailList.appendChild(
      createDetailRow(
        'Phương thức thanh toán',
        getPaymentLabel(order.paymentMethod),
        false
      )
    );
    detailList.appendChild(
      createDetailRow('Ngày tạo đơn', formatTimeDate(order.createdAt), false)
    );

    if (order.status === 'completed' && order.completedAt) {
      detailList.appendChild(
        createDetailRow(
          'Thời gian giao hàng',
          '🕒 Đã giao lúc: ' + formatTimeDate(order.completedAt),
          false,
          'detail-value-delivered'
        )
      );
    }

    expandedBody.appendChild(detailList);

    // Proof Photo Section if present
    if (order.proofImage) {
      const proofBox = document.createElement('div');
      proofBox.className = 'proof-section';

      const proofTitle = document.createElement('p');
      proofTitle.className = 'proof-header-label';
      proofTitle.textContent = 'Ảnh xác nhận giao hàng';
      proofBox.appendChild(proofTitle);

      const proofRow = document.createElement('div');
      proofRow.className = 'proof-row';

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'proof-thumb-wrap';

      const thumbBtn = document.createElement('button');
      thumbBtn.type = 'button';
      thumbBtn.className = 'proof-thumb-btn';
      thumbBtn.dataset.action = 'view-photo';
      thumbBtn.dataset.orderId = order.id;
      thumbBtn.setAttribute('aria-label', 'Xem ảnh lớn của ' + order.name);

      const thumbImg = document.createElement('img');
      thumbImg.className = 'proof-thumb-img';
      thumbImg.src = order.proofImage;
      thumbImg.alt = 'Ảnh xác nhận đơn ' + order.name;
      thumbBtn.appendChild(thumbImg);

      const deleteCornerBtn = document.createElement('button');
      deleteCornerBtn.type = 'button';
      deleteCornerBtn.className = 'proof-delete-corner';
      deleteCornerBtn.dataset.action = 'delete-photo';
      deleteCornerBtn.dataset.orderId = order.id;
      deleteCornerBtn.setAttribute('aria-label', 'Xóa ảnh xác thực này');

      const deleteBadge = document.createElement('span');
      deleteBadge.className = 'proof-delete-badge';
      deleteBadge.textContent = '×';
      deleteCornerBtn.appendChild(deleteBadge);

      thumbWrap.appendChild(thumbBtn);
      thumbWrap.appendChild(deleteCornerBtn);

      const proofActionsCol = document.createElement('div');
      proofActionsCol.className = 'proof-actions-col';

      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'action-btn action-photo';
      viewBtn.dataset.action = 'view-photo';
      viewBtn.dataset.orderId = order.id;
      viewBtn.textContent = 'Xem ảnh lớn';

      const downloadBtn = document.createElement('button');
      downloadBtn.type = 'button';
      downloadBtn.className = 'action-btn action-download-proof';
      downloadBtn.dataset.action = 'download-proof';
      downloadBtn.dataset.orderId = order.id;
      downloadBtn.textContent = '📥 Tải / Lưu ảnh';

      proofActionsCol.appendChild(viewBtn);
      proofActionsCol.appendChild(downloadBtn);

      proofRow.appendChild(thumbWrap);
      proofRow.appendChild(proofActionsCol);
      proofBox.appendChild(proofRow);
      expandedBody.appendChild(proofBox);
    }

    // Action Buttons Grid (One-Handed Mobile Priority Order)
    const actionsGrid = document.createElement('div');
    actionsGrid.className = 'card-actions-grid';

    // 1. Hoàn thành (Full-width Hero Primary CTA for pending orders, separated from Hủy đơn)
    if (!isHistory) {
      const completeBtn = document.createElement('button');
      completeBtn.type = 'button';
      completeBtn.className = 'action-btn action-complete action-hero';
      completeBtn.dataset.action = 'complete-order';
      completeBtn.dataset.orderId = order.id;
      completeBtn.appendChild(createSvgIcon(ICONS.check, 20));
      completeBtn.appendChild(document.createTextNode('Hoàn thành đơn'));
      actionsGrid.appendChild(completeBtn);
    }

    // 2. Gọi ngay (tel:)
    const telHref = sanitizePhoneHref(order.phone);
    if (telHref) {
      const callLink = document.createElement('a');
      callLink.className = 'action-btn action-call action-primary-pair';
      callLink.href = telHref;
      callLink.dataset.action = 'call';
      callLink.appendChild(createSvgIcon(ICONS.phone, 19));
      callLink.appendChild(document.createTextNode('Gọi ngay'));
      actionsGrid.appendChild(callLink);
    } else {
      const callDisabled = document.createElement('button');
      callDisabled.type = 'button';
      callDisabled.className = 'action-btn action-call action-primary-pair';
      callDisabled.disabled = true;
      callDisabled.setAttribute('aria-disabled', 'true');
      callDisabled.appendChild(createSvgIcon(ICONS.phone, 19));
      callDisabled.appendChild(document.createTextNode('Chưa có SĐT'));
      actionsGrid.appendChild(callDisabled);
    }

    // 3. Bản đồ
    if (order.address) {
      const mapLink = document.createElement('a');
      mapLink.className = 'action-btn action-map action-primary-pair';
      mapLink.href = buildMapUrl(order.address);
      mapLink.target = '_blank';
      mapLink.rel = 'noopener noreferrer';
      mapLink.dataset.action = 'map';
      mapLink.appendChild(createSvgIcon(ICONS.mapPin, 19));
      mapLink.appendChild(document.createTextNode('Bản đồ'));
      actionsGrid.appendChild(mapLink);
    } else {
      const mapDisabled = document.createElement('button');
      mapDisabled.type = 'button';
      mapDisabled.className = 'action-btn action-map action-primary-pair';
      mapDisabled.disabled = true;
      mapDisabled.setAttribute('aria-disabled', 'true');
      mapDisabled.appendChild(createSvgIcon(ICONS.mapPin, 19));
      mapDisabled.appendChild(document.createTextNode('Thiếu địa chỉ'));
      actionsGrid.appendChild(mapDisabled);
    }

    // 4. Sửa đơn (always preserves status & createdAt)
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'action-btn action-edit';
    editBtn.dataset.action = 'edit-order';
    editBtn.dataset.orderId = order.id;
    editBtn.appendChild(createSvgIcon(ICONS.edit, 18));
    editBtn.appendChild(document.createTextNode('Sửa đơn'));
    actionsGrid.appendChild(editBtn);

    // 5. Ảnh xác nhận (Quản lý & chụp ảnh)
    const photoBtn = document.createElement('button');
    photoBtn.type = 'button';
    photoBtn.className = 'action-btn action-photo';
    photoBtn.dataset.action = 'capture-photo';
    photoBtn.dataset.orderId = order.id;
    photoBtn.appendChild(createSvgIcon(ICONS.camera, 18));
    photoBtn.appendChild(
      document.createTextNode(order.proofImage ? 'Chụp lại ảnh' : 'Ảnh xác nhận')
    );
    actionsGrid.appendChild(photoBtn);

    // 6. Hủy đơn (separated safely below Edit/Photo away from Hoàn thành)
    if (!isHistory) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'action-btn action-cancel';
      cancelBtn.dataset.action = 'cancel-order';
      cancelBtn.dataset.orderId = order.id;
      cancelBtn.appendChild(createSvgIcon(ICONS.xCircle, 18));
      cancelBtn.appendChild(document.createTextNode('Hủy đơn'));
      actionsGrid.appendChild(cancelBtn);
    }

    // Collapse button
    if (state.settings.showCollapseButton) {
      const collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className =
        'action-btn action-collapse' + (isHistory ? ' action-collapse-full' : '');
      collapseBtn.dataset.action = 'toggle-expand';
      collapseBtn.dataset.orderId = order.id;
      collapseBtn.textContent = 'Thu gọn thẻ';
      actionsGrid.appendChild(collapseBtn);
    }

    expandedBody.appendChild(actionsGrid);
    card.appendChild(expandedBody);

    return card;
  }

  function applyCardSlideIn(card, enterIndex) {
    if (!state.settings.cardMotion) return;
    card.classList.add('card-slide-in');
    card.style.setProperty('--enter-index', String(Math.min(enterIndex, 8)));
    card.addEventListener(
      'animationend',
      function () {
        card.classList.remove('card-slide-in');
      },
      { once: true }
    );
  }

  /* ==========================================================================
     RENDERING: HEADER & HOME
     ========================================================================== */
  function renderHeaderContext() {
    const pendingCount = state.orders.filter(function (o) {
      return o.status === 'pending';
    }).length;
    dom.headerContext.textContent = pendingCount + ' đơn chờ giao';
  }

  function renderHome() {
    const pendingOrders = state.orders.filter(function (o) {
      return o.status === 'pending';
    });

    // Sort pending orders based on user setting ('newest' | 'oldest' | 'carryover')
    const sortMode = state.settings.orderSort;
    const sortedPending = pendingOrders.slice().sort(function (a, b) {
      if (sortMode === 'oldest') {
        return a.createdAt - b.createdAt;
      }
      if (sortMode === 'carryover') {
        const aCarry = isCarryoverOrder(a) ? 1 : 0;
        const bCarry = isCarryoverOrder(b) ? 1 : 0;
        if (aCarry !== bCarry) return bCarry - aCarry;
        return b.createdAt - a.createdAt;
      }
      return b.createdAt - a.createdAt;
    });

    const queryNorm = normalizeVietnamese(state.homeSearch);
    dom.homeSearchClear.hidden = state.homeSearch.length === 0;

    const filtered = queryNorm
      ? sortedPending.filter(function (o) {
          return normalizeVietnamese(o.name).indexOf(queryNorm) !== -1;
        })
      : sortedPending;

    const carryoverCount = pendingOrders.filter(isCarryoverOrder).length;

    dom.homeSummaryBar.innerHTML = '';
    const countSpan = document.createElement('span');
    countSpan.className = 'tabular-nums';
    countSpan.textContent = queryNorm
      ? 'Tìm thấy ' + filtered.length + ' / ' + pendingOrders.length + ' đơn chờ giao'
      : 'Tổng đang chờ giao: ' + pendingOrders.length + ' đơn';
    dom.homeSummaryBar.appendChild(countSpan);

    if (carryoverCount > 0 && state.settings.highlightCarryover) {
      const carrySpan = document.createElement('span');
      carrySpan.className = 'summary-carryover-note tabular-nums';
      carrySpan.textContent = 'Đơn tồn qua ngày: ' + carryoverCount;
      dom.homeSummaryBar.appendChild(carrySpan);
    }

    dom.ordersList.innerHTML = '';
    if (filtered.length === 0) {
      state.seenHomeCardIds.clear();
      dom.homeEmpty.hidden = false;
      if (pendingOrders.length === 0) {
        dom.homeEmptyTitle.textContent = 'Chưa có đơn hàng chờ giao';
        dom.homeEmptyDesc.textContent =
          'Nhấn nút dấu cộng (+) ở góc dưới bên phải để thêm nhiều đơn hàng cùng lúc.';
      } else {
        dom.homeEmptyTitle.textContent = 'Không tìm thấy khách hàng phù hợp';
        dom.homeEmptyDesc.textContent =
          'Không có đơn chờ giao nào khớp với "' + state.homeSearch.trim() + '".';
      }
      return;
    }

    dom.homeEmpty.hidden = true;
    const frag = document.createDocumentFragment();
    const nextSeen = new Set();
    let enterIdx = 0;
    for (let i = 0; i < filtered.length; i++) {
      const order = filtered[i];
      const card = buildOrderCard(order, 'home');
      if (!state.seenHomeCardIds.has(order.id)) {
        applyCardSlideIn(card, enterIdx);
        enterIdx++;
      }
      nextSeen.add(order.id);
      frag.appendChild(card);
    }
    state.seenHomeCardIds = nextSeen;
    dom.ordersList.appendChild(frag);
  }

  /* ==========================================================================
     RENDERING: STATISTICS (DAILY & WEEKLY MONDAY-SUNDAY)
     ========================================================================== */
  function createKpiCard(label, value, modifierClass) {
    const card = document.createElement('div');
    card.className = 'kpi-card' + (modifierClass ? ' ' + modifierClass : '');

    const lbl = document.createElement('span');
    lbl.className = 'kpi-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'kpi-value';
    val.textContent = String(value);

    card.appendChild(lbl);
    card.appendChild(val);
    return card;
  }

  function renderStats() {
    const isDay = state.statsMode === 'day';
    dom.statsModeDay.classList.toggle('active', isDay);
    dom.statsModeDay.setAttribute('aria-selected', isDay ? 'true' : 'false');
    dom.statsModeWeek.classList.toggle('active', !isDay);
    dom.statsModeWeek.setAttribute('aria-selected', !isDay ? 'true' : 'false');

    dom.statsDayControls.hidden = !isDay;
    dom.statsWeekControls.hidden = isDay;
    dom.statsChartPanel.hidden = isDay;

    if (isDay) {
      const targetKey = state.statsDate || currentDayKey;
      dom.statsDateInput.value = targetKey;

      let completedCount = 0;
      let cancelledCount = 0;
      let pendingCount = 0;

      for (let i = 0; i < state.orders.length; i++) {
        const o = state.orders[i];
        if (o.status === 'completed') {
          if (getLocalDateKey(o.completedAt || o.createdAt) === targetKey) {
            completedCount += 1;
          }
        } else if (o.status === 'cancelled') {
          if (getLocalDateKey(o.cancelledAt || o.createdAt) === targetKey) {
            cancelledCount += 1;
          }
        } else if (o.status === 'pending') {
          if (targetKey === currentDayKey) {
            // Today includes all active pending orders (including carryover)
            pendingCount += 1;
          } else if (getLocalDateKey(o.createdAt) === targetKey) {
            pendingCount += 1;
          }
        }
      }

      const totalCount = completedCount + pendingCount + cancelledCount;

      dom.statsKpiGrid.innerHTML = '';
      dom.statsKpiGrid.appendChild(createKpiCard('Tổng số đơn', totalCount, ''));
      dom.statsKpiGrid.appendChild(
        createKpiCard('Đã hoàn thành', completedCount, 'kpi-completed')
      );
      dom.statsKpiGrid.appendChild(
        createKpiCard('Đang chờ giao', pendingCount, 'kpi-pending')
      );
      dom.statsKpiGrid.appendChild(
        createKpiCard('Đã hủy', cancelledCount, 'kpi-cancelled')
      );
      return;
    }

    // Weekly Mode
    const isCalendarWeek = state.statsWeekType === 'calendar';
    dom.weekTypeCalendar.classList.toggle('active', isCalendarWeek);
    dom.weekTypeLast7.classList.toggle('active', !isCalendarWeek);
    dom.statsWeekPickerWrap.hidden = !isCalendarWeek;
    dom.statsWeekDate.value = state.statsWeekDate || currentDayKey;

    const days = isCalendarWeek
      ? getWeekDaysFromMonday(getMondayOfWeek(state.statsWeekDate || currentDayKey))
      : getLast7Days(currentDayKey);

    const dayKeysSet = new Set(days.map(function (d) { return d.key; }));
    const dailyCompletedMap = {};
    for (let i = 0; i < days.length; i++) {
      dailyCompletedMap[days[i].key] = 0;
    }

    let weekCompleted = 0;
    let weekCancelled = 0;
    let weekPending = 0;

    for (let i = 0; i < state.orders.length; i++) {
      const o = state.orders[i];
      if (o.status === 'completed') {
        const cKey = getLocalDateKey(o.completedAt || o.createdAt);
        if (dayKeysSet.has(cKey)) {
          weekCompleted += 1;
          dailyCompletedMap[cKey] += 1;
        }
      } else if (o.status === 'cancelled') {
        const xKey = getLocalDateKey(o.cancelledAt || o.createdAt);
        if (dayKeysSet.has(xKey)) {
          weekCancelled += 1;
        }
      } else if (o.status === 'pending') {
        // Count pending orders active in current view / created within week
        const pKey = getLocalDateKey(o.createdAt);
        if (dayKeysSet.has(pKey) || dayKeysSet.has(currentDayKey)) {
          weekPending += 1;
        }
      }
    }

    dom.statsWeekRangeLabel.textContent =
      (isCalendarWeek ? 'Tuần (Thứ 2 – Chủ nhật): ' : '7 ngày gần nhất: ') +
      formatDateSlash(days[0].dateObj.getTime()) +
      ' – ' +
      formatDateSlash(days[6].dateObj.getTime());

    const weekTotal = weekCompleted + weekPending + weekCancelled;

    dom.statsKpiGrid.innerHTML = '';
    dom.statsKpiGrid.appendChild(createKpiCard('Tổng số đơn', weekTotal, ''));
    dom.statsKpiGrid.appendChild(
      createKpiCard('Hoàn thành tuần', weekCompleted, 'kpi-completed')
    );
    dom.statsKpiGrid.appendChild(
      createKpiCard('Đang chờ giao', weekPending, 'kpi-pending')
    );
    dom.statsKpiGrid.appendChild(
      createKpiCard('Đã hủy', weekCancelled, 'kpi-cancelled')
    );

    // Pure HTML/CSS Bar Chart
    let maxVal = 1;
    for (let i = 0; i < days.length; i++) {
      const val = dailyCompletedMap[days[i].key];
      if (val > maxVal) maxVal = val;
    }

    dom.statsBarChart.innerHTML = '';
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const count = dailyCompletedMap[d.key];
      const pct = Math.round((count / maxVal) * 100);

      const col = document.createElement('div');
      col.className = 'bar-col' + (d.key === currentDayKey ? ' is-today' : '');

      const countEl = document.createElement('span');
      countEl.className = 'bar-count';
      countEl.textContent = String(count);

      const track = document.createElement('div');
      track.className = 'bar-track';

      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.height = (count > 0 ? Math.max(8, pct) : 0) + '%';
      track.appendChild(fill);

      const dayLbl = document.createElement('span');
      dayLbl.className = 'bar-day-label';
      dayLbl.textContent = d.label;

      const dateSub = document.createElement('span');
      dateSub.className = 'bar-date-sub';
      dateSub.textContent = d.shortDate;

      col.appendChild(countEl);
      col.appendChild(track);
      col.appendChild(dayLbl);
      col.appendChild(dateSub);

      dom.statsBarChart.appendChild(col);
    }
  }

  /* ==========================================================================
     RENDERING: HISTORY (ONLY COMPLETED ORDERS)
     ========================================================================== */
  function getCompletedOrdersFiltered() {
    // STRICTLY completed orders only
    const completed = state.orders.filter(function (o) {
      return o.status === 'completed';
    });

    // Date filter unless "Tất cả ngày" is active
    let dateFiltered = completed;
    if (!state.historyShowAll && state.historyDate) {
      dateFiltered = completed.filter(function (o) {
        return getLocalDateKey(o.completedAt || o.createdAt) === state.historyDate;
      });
    }

    // Real-time search by customer name (with/without diacritics)
    const queryNorm = normalizeVietnamese(state.historySearch);
    const searched = queryNorm
      ? dateFiltered.filter(function (o) {
          return normalizeVietnamese(o.name).indexOf(queryNorm) !== -1;
        })
      : dateFiltered;

    // Sort newest completed first
    return searched.slice().sort(function (a, b) {
      return (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt);
    });
  }

  function renderHistory() {
    dom.historyDateInput.value = state.historyDate || currentDayKey;
    dom.historyDateInput.disabled = state.historyShowAll;
    dom.historyAllDatesBtn.classList.toggle('active', state.historyShowAll);
    dom.historyAllDatesBtn.setAttribute(
      'aria-pressed',
      state.historyShowAll ? 'true' : 'false'
    );
    dom.historySearchClear.hidden = state.historySearch.length === 0;

    dom.exportScopeDay.classList.toggle('active', state.exportScope === 'day');
    dom.exportScopeWeek.classList.toggle('active', state.exportScope === 'week');

    const items = getCompletedOrdersFiltered();

    dom.historySummaryBar.innerHTML = '';
    const sumSpan = document.createElement('span');
    sumSpan.className = 'tabular-nums';
    if (state.historyShowAll) {
      sumSpan.textContent = 'Tổng tất cả ngày: ' + items.length + ' đơn đã giao';
    } else {
      const selectedDateObj = parseDateKeyToLocalDate(state.historyDate || currentDayKey);
      sumSpan.textContent =
        'Ngày ' +
        formatDateSlash(selectedDateObj.getTime()) +
        ': ' +
        items.length +
        ' đơn đã giao';
    }
    dom.historySummaryBar.appendChild(sumSpan);

    dom.historyList.innerHTML = '';
    if (items.length === 0) {
      state.seenHistoryCardIds.clear();
      dom.historyEmpty.hidden = false;
      if (state.historySearch.trim()) {
        dom.historyEmptyTitle.textContent = 'Không tìm thấy đơn trong lịch sử';
        dom.historyEmptyDesc.textContent =
          'Không có đơn hoàn thành nào khớp với "' +
          state.historySearch.trim() +
          '".';
      } else {
        dom.historyEmptyTitle.textContent = 'Chưa có đơn hoàn thành';
        dom.historyEmptyDesc.textContent = state.historyShowAll
          ? 'Khi bạn xác nhận Hoàn thành đơn hàng, đơn sẽ xuất hiện tại đây.'
          : 'Không có đơn hoàn thành nào trong ngày đã chọn. Thử chọn ngày khác hoặc bấm "Tất cả ngày".';
      }
      return;
    }

    dom.historyEmpty.hidden = true;
    const frag = document.createDocumentFragment();
    const nextSeen = new Set();
    let enterIdx = 0;
    for (let i = 0; i < items.length; i++) {
      const order = items[i];
      const card = buildOrderCard(order, 'history');
      if (!state.seenHistoryCardIds.has(order.id)) {
        applyCardSlideIn(card, enterIdx);
        enterIdx++;
      }
      nextSeen.add(order.id);
      frag.appendChild(card);
    }
    state.seenHistoryCardIds = nextSeen;
    dom.historyList.appendChild(frag);
  }

  /* ==========================================================================
     EXPORT HISTORY (TXT & PDF VIA @MEDIA PRINT)
     ========================================================================== */
  function getCompletedOrdersForExport() {
    const anchorKey = state.historyDate || currentDayKey;
    const completed = state.orders.filter(function (o) {
      return o.status === 'completed';
    });

    let scoped;
    if (state.exportScope === 'week') {
      const weekDays = getWeekDaysFromMonday(getMondayOfWeek(anchorKey));
      const keySet = new Set(weekDays.map(function (d) { return d.key; }));
      scoped = completed.filter(function (o) {
        return keySet.has(getLocalDateKey(o.completedAt || o.createdAt));
      });
    } else {
      scoped = completed.filter(function (o) {
        return getLocalDateKey(o.completedAt || o.createdAt) === anchorKey;
      });
    }

    return scoped.slice().sort(function (a, b) {
      return (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt);
    });
  }

  function formatOrderExportLine(order) {
    // Only include fields that actually have data; NEVER trailing dash
    const fields = [
      order.name,
      order.order,
      order.address,
      order.phone,
      order.note
    ];
    const nonEmpty = [];
    for (let i = 0; i < fields.length; i++) {
      const val = String(fields[i] || '').trim();
      if (val) nonEmpty.push(val);
    }
    return nonEmpty.join(' - ');
  }

  function buildExportPayload(orders) {
    const exportTime = formatExportTimestamp(Date.now());
    const lines = orders.map(formatOrderExportLine);
    return {
      brand: 'TOM SHIPPER',
      timeLine: 'Ngày giờ xuất: ' + exportTime,
      countLine: 'Tổng đơn: ' + orders.length,
      orderLines: lines
    };
  }

  function exportHistoryTxt() {
    const orders = getCompletedOrdersForExport();
    if (orders.length === 0) {
      showToast(
        'Không có đơn hoàn thành nào trong khoảng thời gian đã chọn để xuất.',
        'error'
      );
      return;
    }

    const payload = buildExportPayload(orders);
    const textContent =
      payload.brand +
      '\n' +
      payload.timeLine +
      '\n' +
      payload.countLine +
      '\n\n' +
      payload.orderLines.join('\n') +
      '\n';

    // UTF-8 with BOM so Vietnamese displays accurately on Windows Notepad & mobile editors
    const blob = new Blob(['\uFEFF' + textContent], {
      type: 'text/plain;charset=utf-8'
    });
    const scopeSlug =
      state.exportScope === 'week'
        ? 'tuan-' + (state.historyDate || currentDayKey)
        : 'ngay-' + (state.historyDate || currentDayKey);
    triggerBlobDownload(blob, 'tom-shipper-lich-su-' + scopeSlug + '.txt');
    showToast('Đã xuất tệp TXT (' + orders.length + ' đơn)!', 'success');
  }

  function exportHistoryPdf() {
    const orders = getCompletedOrdersForExport();
    if (orders.length === 0) {
      showToast(
        'Không có đơn hoàn thành nào trong khoảng thời gian đã chọn để xuất.',
        'error'
      );
      return;
    }

    const payload = buildExportPayload(orders);
    dom.printArea.innerHTML = '';

    const brandP = document.createElement('p');
    brandP.className = 'print-header-line print-brand';
    brandP.textContent = payload.brand;

    const timeP = document.createElement('p');
    timeP.className = 'print-header-line';
    timeP.textContent = payload.timeLine;

    const countP = document.createElement('p');
    countP.className = 'print-header-line';
    countP.textContent = payload.countLine;

    const listDiv = document.createElement('div');
    listDiv.className = 'print-list';
    for (let i = 0; i < payload.orderLines.length; i++) {
      const itemP = document.createElement('p');
      itemP.className = 'print-item';
      itemP.textContent = payload.orderLines[i];
      listDiv.appendChild(itemP);
    }

    dom.printArea.appendChild(brandP);
    dom.printArea.appendChild(timeP);
    dom.printArea.appendChild(countP);
    dom.printArea.appendChild(listDiv);

    window.print();
  }

  /* ==========================================================================
     RENDER DISPATCHER & TAB NAVIGATION
     ========================================================================== */
  function renderAll() {
    renderHeaderContext();
    if (state.activeTab === 'home') {
      renderHome();
    } else if (state.activeTab === 'stats') {
      renderStats();
    } else if (state.activeTab === 'history') {
      renderHistory();
    } else if (state.activeTab === 'profile') {
      renderProfile();
    } else if (state.activeTab === 'settings') {
      renderSettings();
    }
  }

  const TAB_ORDER = { home: 0, stats: 1, history: 2, profile: 3, settings: 4 };

  function switchTab(tabName) {
    if (!dom.pages[tabName]) return;
    const prevTab = state.activeTab;
    if (prevTab && dom.pages[prevTab] && !dom.pages[prevTab].hidden) {
      state.tabScrollPositions[prevTab] = window.scrollY || 0;
    }

    const dir =
      typeof TAB_ORDER[tabName] === 'number' && typeof TAB_ORDER[prevTab] === 'number'
        ? TAB_ORDER[tabName] >= TAB_ORDER[prevTab]
          ? 1
          : -1
        : 1;

    state.activeTab = tabName;

    Object.keys(dom.pages).forEach(function (key) {
      const isActive = key === tabName;
      if (isActive) {
        dom.pages[key].style.setProperty('--tab-dir', String(dir));
      }
      dom.pages[key].hidden = !isActive;
      dom.pages[key].classList.toggle('active', isActive);
    });

    dom.navItems.forEach(function (btn) {
      const isSelected = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-current', isSelected ? 'page' : 'false');
    });

    if (tabName === 'home') {
      state.seenHomeCardIds.clear();
    } else if (tabName === 'history') {
      state.seenHistoryCardIds.clear();
    }

    // FAB is ONLY visible on Trang chủ
    dom.fabAdd.hidden = tabName !== 'home';

    renderAll();
    const savedScroll = state.tabScrollPositions[tabName] || 0;
    window.scrollTo({ top: savedScroll, behavior: 'auto' });
  }

  /* ==========================================================================
     ORDER ACTIONS (COMPLETE, CANCEL, EDIT, PHOTO)
     ========================================================================== */
  function openEditOrderModal(orderId) {
    const order = findOrderById(orderId);
    if (!order) return;

    dom.editOrderId.value = order.id;
    dom.editName.value = order.name;
    dom.editPhone.value = order.phone;
    dom.editOrderDetail.value = order.order;
    dom.editAddress.value = order.address;
    dom.editNote.value = order.note;
    dom.editPayment.value = order.paymentMethod === 'transfer' ? 'transfer' : 'cash';
    dom.editErrorMsg.hidden = true;
    dom.editErrorMsg.textContent = '';

    openModal(dom.modalEdit);
    dom.editName.focus();
  }

  function handleCardDelegatedClick(e) {
    const actionTarget = e.target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;

    // External action links (tel: / maps) - stop propagation so card doesn't toggle
    if (action === 'call' || action === 'map') {
      e.stopPropagation();
      return;
    }

    const orderId = actionTarget.dataset.orderId;
    if (!orderId) return;

    if (action === 'toggle-expand') {
      if (state.expandedIds.has(orderId)) {
        state.expandedIds.delete(orderId);
      } else {
        if (state.settings.singleExpand) {
          state.expandedIds.clear();
        }
        state.expandedIds.add(orderId);
      }
      renderAll();
      return;
    }

    // Prevent bubbling for all internal card buttons
    e.stopPropagation();

    const order = findOrderById(orderId);
    if (!order) return;

    if (action === 'edit-order') {
      openEditOrderModal(orderId);
      return;
    }

    if (action === 'complete-order') {
      const executeComplete = function () {
        order.status = 'completed';
        order.completedAt = Date.now();
        state.expandedIds.delete(order.id);
        if (persistOrdersMeta()) {
          showToast('Đã hoàn thành đơn của ' + order.name + '!', 'success');
        }
        renderAll();
      };

      const needsPhotoWarn = Boolean(state.settings.warnMissingPhoto && !order.proofImage);

      if (!state.settings.confirmActions && !needsPhotoWarn) {
        executeComplete();
        return;
      }

      const confirmMsg = needsPhotoWarn
        ? 'Lưu ý: Đơn hàng của "' +
          order.name +
          '" chưa có ảnh xác nhận giao hàng. Bạn vẫn muốn hoàn thành ngay?'
        : 'Xác nhận đã giao xong đơn hàng của "' + order.name + '"?';

      openConfirmDialog({
        title: needsPhotoWarn ? 'Chưa có ảnh xác nhận' : 'Xác nhận hoàn thành',
        message: confirmMsg,
        okLabel: 'Hoàn thành',
        okClass: 'btn-success',
        onConfirm: executeComplete
      });
      return;
    }

    if (action === 'cancel-order') {
      const executeCancel = function () {
        order.status = 'cancelled';
        order.cancelledAt = Date.now();
        state.expandedIds.delete(order.id);
        if (persistOrdersMeta()) {
          showToast('Đã hủy đơn của ' + order.name + '.');
        }
        renderAll();
      };

      if (!state.settings.confirmActions) {
        executeCancel();
        return;
      }

      openConfirmDialog({
        title: 'Xác nhận hủy đơn',
        message: 'Bạn chắc chắn muốn hủy đơn hàng của "' + order.name + '"?',
        okLabel: 'Hủy đơn',
        okClass: 'btn-danger',
        onConfirm: executeCancel
      });
      return;
    }

    if (action === 'capture-photo') {
      state.pendingCameraOrderId = order.id;
      dom.cameraInput.value = '';
      dom.cameraInput.click();
      return;
    }

    if (action === 'view-photo') {
      if (!order.proofImage) return;
      state.activeImageOrderId = order.id;
      dom.modalImagePreview.src = order.proofImage;
      dom.modalImageCaption.textContent =
        order.name + (order.address ? ' — ' + order.address : '');
      openModal(dom.modalImage);
      return;
    }

    if (action === 'download-proof') {
      exportProofCanvas(order);
      return;
    }

    if (action === 'delete-photo') {
      openConfirmDialog({
        title: 'Xóa ảnh xác nhận',
        message: 'Xóa ảnh xác thực này?',
        okLabel: 'Xóa ảnh',
        okClass: 'btn-danger',
        onConfirm: function () {
          // Delete ONLY the photo data; preserve order, status, completedAt & fields
          order.proofImage = null;
          persistOrderProofImage(order.id, null);
          showToast('Đã xóa ảnh xác thực.');
          renderAll();
        }
      });
    }
  }

  /* ==========================================================================
     EVENT BINDING
     ========================================================================== */
  function bindEvents() {
    // Bottom Navigation
    dom.navItems.forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.dataset.tab);
      });
    });

    // FAB Add Orders
    dom.fabAdd.addEventListener('click', function () {
      dom.bulkOrdersInput.value = '';
      dom.addErrorMsg.hidden = true;
      dom.addErrorMsg.textContent = '';
      openModal(dom.modalAdd);
      dom.bulkOrdersInput.focus();
    });

    // Close modals via [data-close-modal]; prevent accidental outside-tap close on forms
    document.addEventListener('click', function (e) {
      const closeTarget = e.target.closest('[data-close-modal]');
      if (closeTarget) {
        const modalId = closeTarget.dataset.closeModal;
        closeModal(document.getElementById(modalId));
        return;
      }
      if (
        e.target.classList &&
        e.target.classList.contains('modal-overlay') &&
        e.target.id === 'modal-image'
      ) {
        closeModal(e.target);
      }
    });

    // Escape closes top-most open modal
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-overlay:not([hidden])');
        if (openModals.length > 0) {
          closeModal(openModals[openModals.length - 1]);
        }
      }
    });

    // Home Search
    dom.homeSearchInput.addEventListener('input', function () {
      state.homeSearch = dom.homeSearchInput.value;
      renderHome();
    });

    dom.homeSearchClear.addEventListener('click', function () {
      state.homeSearch = '';
      dom.homeSearchInput.value = '';
      renderHome();
      dom.homeSearchInput.focus();
    });

    // Delegated card actions on Home & History lists
    dom.ordersList.addEventListener('click', handleCardDelegatedClick);
    dom.historyList.addEventListener('click', handleCardDelegatedClick);

    // Add Orders Submit (Bulk only)
    dom.formAddOrders.addEventListener('submit', function (e) {
      e.preventDefault();
      const raw = dom.bulkOrdersInput.value;
      const result = parseBulkOrders(raw);

      if (result.errors.length > 0) {
        dom.addErrorMsg.textContent = result.errors[0];
        dom.addErrorMsg.hidden = false;
        return;
      }

      if (result.validOrders.length === 0) {
        dom.addErrorMsg.textContent =
          'Vui lòng nhập ít nhất một dòng đơn hàng theo định dạng: Tên khách - Đơn hàng.';
        dom.addErrorMsg.hidden = false;
        return;
      }

      // Prepend newest orders while keeping existing orders intact
      for (let i = result.validOrders.length - 1; i >= 0; i--) {
        state.orders.unshift(result.validOrders[i]);
      }

      if (state.settings.autoExpandNew && result.validOrders.length > 0) {
        if (state.settings.singleExpand) {
          state.expandedIds.clear();
        }
        state.expandedIds.add(result.validOrders[0].id);
      }

      if (persistOrdersMeta()) {
        closeModal(dom.modalAdd);
        dom.bulkOrdersInput.value = '';
        showToast(
          'Đã thêm ' + result.validOrders.length + ' đơn hàng mới!',
          'success'
        );
        renderAll();
      }
    });

    // Edit Order Submit (Dedicated Single-Order Form)
    dom.formEditOrder.addEventListener('submit', function (e) {
      e.preventDefault();
      const orderId = dom.editOrderId.value;
      const order = findOrderById(orderId);
      if (!order) {
        closeModal(dom.modalEdit);
        return;
      }

      const nextName = dom.editName.value.trim();
      const nextDetail = dom.editOrderDetail.value.trim();

      if (!nextName || !nextDetail) {
        dom.editErrorMsg.textContent =
          'Tên khách hàng và Chi tiết đơn hàng không được để trống.';
        dom.editErrorMsg.hidden = false;
        return;
      }

      // Update ONLY editable fields; preserve id, createdAt, status, completedAt, cancelledAt, proofImage
      order.name = nextName;
      order.phone = dom.editPhone.value.trim();
      order.order = nextDetail;
      order.address = dom.editAddress.value.trim();
      order.note = dom.editNote.value.trim();
      order.paymentMethod =
        dom.editPayment.value === 'transfer' ? 'transfer' : 'cash';

      if (persistOrdersMeta()) {
        closeModal(dom.modalEdit);
        showToast('Đã cập nhật đơn của ' + order.name + '!', 'success');
        renderAll();
      }
    });

    // Confirm Dialog Actions
    dom.confirmCancelBtn.addEventListener('click', function () {
      state.confirmCallback = null;
      closeModal(dom.modalConfirm);
    });

    dom.confirmOkBtn.addEventListener('click', function () {
      const cb = state.confirmCallback;
      state.confirmCallback = null;
      closeModal(dom.modalConfirm);
      if (cb) cb();
    });

    // Image Viewer Download Button
    dom.modalImageDownloadBtn.addEventListener('click', function () {
      if (!state.activeImageOrderId) return;
      const order = findOrderById(state.activeImageOrderId);
      if (order) {
        exportProofCanvas(order);
      }
    });

    // Camera Input Change (Capture & Compress Photo)
    dom.cameraInput.addEventListener('change', async function () {
      const file = dom.cameraInput.files && dom.cameraInput.files[0];
      const targetOrderId = state.pendingCameraOrderId;
      state.pendingCameraOrderId = null;
      dom.cameraInput.value = '';

      if (!file || !targetOrderId) return;
      const order = findOrderById(targetOrderId);
      if (!order) return;

      try {
        const compressedBase64 = await compressImageFile(file);
        if (persistOrderProofImage(order.id, compressedBase64)) {
          order.proofImage = compressedBase64;
          state.expandedIds.add(order.id);
          showToast('Đã lưu ảnh xác nhận giao hàng!', 'success');
          renderAll();
        }
      } catch (err) {
        showToast(
          (err && err.message) || 'Không thể xử lý ảnh đã chụp.',
          'error'
        );
      }
    });

    // Statistics Controls
    dom.statsModeDay.addEventListener('click', function () {
      state.statsMode = 'day';
      renderStats();
    });

    dom.statsModeWeek.addEventListener('click', function () {
      state.statsMode = 'week';
      renderStats();
    });

    dom.statsDateInput.addEventListener('change', function () {
      if (dom.statsDateInput.value) {
        state.statsDate = dom.statsDateInput.value;
        renderStats();
      }
    });

    dom.statsTodayBtn.addEventListener('click', function () {
      state.statsDate = currentDayKey;
      renderStats();
    });

    dom.weekTypeCalendar.addEventListener('click', function () {
      state.statsWeekType = 'calendar';
      renderStats();
    });

    dom.weekTypeLast7.addEventListener('click', function () {
      state.statsWeekType = 'last7';
      renderStats();
    });

    dom.statsWeekDate.addEventListener('change', function () {
      if (dom.statsWeekDate.value) {
        state.statsWeekDate = dom.statsWeekDate.value;
        renderStats();
      }
    });

    // History Controls
    dom.historySearchInput.addEventListener('input', function () {
      state.historySearch = dom.historySearchInput.value;
      renderHistory();
    });

    dom.historySearchClear.addEventListener('click', function () {
      state.historySearch = '';
      dom.historySearchInput.value = '';
      renderHistory();
      dom.historySearchInput.focus();
    });

    dom.historyDateInput.addEventListener('change', function () {
      if (dom.historyDateInput.value) {
        state.historyDate = dom.historyDateInput.value;
        state.historyShowAll = false;
        state.seenHistoryCardIds.clear();
        renderHistory();
      }
    });

    dom.historyAllDatesBtn.addEventListener('click', function () {
      state.historyShowAll = !state.historyShowAll;
      state.seenHistoryCardIds.clear();
      renderHistory();
    });

    dom.exportScopeDay.addEventListener('click', function () {
      state.exportScope = 'day';
      renderHistory();
    });

    dom.exportScopeWeek.addEventListener('click', function () {
      state.exportScope = 'week';
      renderHistory();
    });

    dom.btnExportTxt.addEventListener('click', exportHistoryTxt);
    dom.btnExportPdf.addEventListener('click', exportHistoryPdf);

    // Profile Controls
    if (dom.btnEditProfile) {
      dom.btnEditProfile.addEventListener('click', openEditProfileModal);
    }

    if (dom.btnEditProfileInline) {
      dom.btnEditProfileInline.addEventListener('click', openEditProfileModal);
    }

    const triggerAvatarPicker = function () {
      if (!dom.avatarInput) return;
      dom.avatarInput.value = '';
      dom.avatarInput.click();
    };

    if (dom.btnChangeAvatar) {
      dom.btnChangeAvatar.addEventListener('click', triggerAvatarPicker);
    }

    if (dom.btnUploadAvatar) {
      dom.btnUploadAvatar.addEventListener('click', triggerAvatarPicker);
    }

    if (dom.btnResetAvatar) {
      dom.btnResetAvatar.addEventListener('click', function () {
        if (!state.profile) return;
        state.profile.avatarImage = null;
        if (saveProfile()) {
          showToast('Đã khôi phục ảnh đại diện mặc định.', 'success');
        }
        renderProfile();
      });
    }

    if (dom.avatarInput) {
      dom.avatarInput.addEventListener('change', async function () {
        const file = dom.avatarInput.files && dom.avatarInput.files[0];
        dom.avatarInput.value = '';
        if (!file) return;
        try {
          const compressed = await compressImageFile(file, AVATAR_IMAGE_DIM);
          if (!state.profile) loadProfileFromStorage();
          state.profile.avatarImage = compressed;
          if (saveProfile()) {
            showToast('Đã cập nhật ảnh đại diện hồ sơ!', 'success');
          }
          renderProfile();
        } catch (err) {
          showToast((err && err.message) || 'Không thể tải ảnh đại diện.', 'error');
        }
      });
    }

    if (dom.formEditProfile) {
      dom.formEditProfile.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!state.profile) loadProfileFromStorage();
        state.profile.name = dom.profileInputName.value.trim();
        state.profile.hotline = dom.profileInputHotline.value.trim();
        state.profile.gmail = dom.profileInputGmail.value.trim();
        state.profile.zalo = dom.profileInputZalo.value.trim();
        state.profile.vehicle = dom.profileInputVehicle.value.trim();
        state.profile.area = dom.profileInputArea.value.trim();
        state.profile.bio = dom.profileInputBio.value.trim();

        if (saveProfile()) {
          closeModal(dom.modalProfile);
          showToast('Đã lưu thông tin hồ sơ tài xế!', 'success');
          renderProfile();
        }
      });
    }

    // Settings Controls
    if (dom.settingThemeGroup) {
      dom.settingThemeGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-theme-choice]');
        if (!btn) return;
        state.settings.theme = btn.dataset.themeChoice;
        saveSettings();
        applySettingsToDocument();
        renderSettings();
      });
    }

    if (dom.settingAccentGroup) {
      dom.settingAccentGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-accent-choice]');
        if (!btn) return;
        state.settings.accentColor = btn.dataset.accentChoice || 'blue';
        saveSettings();
        applySettingsToDocument();
        renderSettings();
      });
    }

    if (dom.settingBgGroup) {
      dom.settingBgGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-bg-choice]');
        if (!btn) return;
        state.settings.bgStyle = btn.dataset.bgChoice;
        saveSettings();
        applySettingsToDocument();
        renderSettings();
      });
    }

    if (dom.settingRadiusGroup) {
      dom.settingRadiusGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-radius-choice]');
        if (!btn) return;
        state.settings.uiRadius = btn.dataset.radiusChoice || 'soft';
        saveSettings();
        applySettingsToDocument();
        renderSettings();
      });
    }

    if (dom.settingStartTabGroup) {
      dom.settingStartTabGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-start-tab-choice]');
        if (!btn) return;
        state.settings.defaultStartTab = btn.dataset.startTabChoice || 'home';
        saveSettings();
        renderSettings();
      });
    }

    if (dom.settingBlurGroup) {
      dom.settingBlurGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-blur-choice]');
        if (!btn) return;
        state.settings.glassBlur = btn.dataset.blurChoice || 'medium';
        saveSettings();
        applySettingsToDocument();
        renderSettings();
      });
    }

    if (dom.settingSortGroup) {
      dom.settingSortGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-sort-choice]');
        if (!btn) return;
        state.settings.orderSort = btn.dataset.sortChoice || 'newest';
        saveSettings();
        renderSettings();
      });
    }

    if (dom.settingPaymentGroup) {
      dom.settingPaymentGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-payment-choice]');
        if (!btn) return;
        state.settings.defaultPayment =
          btn.dataset.paymentChoice === 'transfer' ? 'transfer' : 'cash';
        saveSettings();
        renderSettings();
      });
    }

    if (dom.settingMapGroup) {
      dom.settingMapGroup.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-map-choice]');
        if (!btn) return;
        state.settings.mapProvider = btn.dataset.mapChoice || 'auto';
        saveSettings();
        renderSettings();
      });
    }

    dom.settingToggleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const key = btn.dataset.settingToggle;
        if (!key || !(key in state.settings)) return;
        state.settings[key] = !state.settings[key];
        saveSettings();
        applySettingsToDocument();
        renderSettings();
      });
    });

    if (dom.btnBackupExport) {
      dom.btnBackupExport.addEventListener('click', exportBackupJson);
    }

    if (dom.btnBackupImport && dom.importBackupInput) {
      dom.btnBackupImport.addEventListener('click', function () {
        dom.importBackupInput.value = '';
        dom.importBackupInput.click();
      });

      dom.importBackupInput.addEventListener('change', function () {
        const file = dom.importBackupInput.files && dom.importBackupInput.files[0];
        dom.importBackupInput.value = '';
        if (file) {
          importBackupJsonFile(file);
        }
      });
    }

    if (dom.btnClearCancelled) {
      dom.btnClearCancelled.addEventListener('click', function () {
        const cancelledOrders = state.orders.filter(function (o) {
          return o.status === 'cancelled';
        });
        if (cancelledOrders.length === 0) return;

        openConfirmDialog({
          title: 'Dọn đơn đã hủy',
          message:
            'Xóa vĩnh viễn ' +
            cancelledOrders.length +
            ' đơn đã hủy khỏi bộ nhớ? Đơn chờ giao và lịch sử đã giao vẫn được giữ nguyên.',
          okLabel: 'Xóa đơn hủy',
          okClass: 'btn-danger',
          onConfirm: function () {
            cancelledOrders.forEach(function (o) {
              safeStorageRemove(STORAGE_IMG_PREFIX + o.id);
              state.expandedIds.delete(o.id);
            });
            state.orders = state.orders.filter(function (o) {
              return o.status !== 'cancelled';
            });
            if (persistOrdersMeta()) {
              showToast('Đã dọn ' + cancelledOrders.length + ' đơn đã hủy.', 'success');
            }
            renderAll();
          }
        });
      });
    }

    if (dom.btnClearAllOrders) {
      dom.btnClearAllOrders.addEventListener('click', function () {
        if (state.orders.length === 0) return;
        const total = state.orders.length;

        openConfirmDialog({
          title: 'Xóa toàn bộ đơn hàng',
          message:
            'Xóa vĩnh viễn tất cả ' +
            total +
            ' đơn hàng (chờ giao, đã giao, đã hủy) cùng ảnh xác nhận? Hành động này không thể hoàn tác.',
          okLabel: 'Xóa tất cả',
          okClass: 'btn-danger',
          onConfirm: function () {
            state.orders.forEach(function (o) {
              safeStorageRemove(STORAGE_IMG_PREFIX + o.id);
            });
            state.orders = [];
            state.expandedIds.clear();
            state.seenHomeCardIds.clear();
            state.seenHistoryCardIds.clear();
            if (persistOrdersMeta()) {
              showToast('Đã xóa toàn bộ ' + total + ' đơn hàng.', 'success');
            }
            renderAll();
          }
        });
      });
    }

    if (dom.btnResetSettings) {
      dom.btnResetSettings.addEventListener('click', function () {
        openConfirmDialog({
          title: 'Đặt lại cài đặt',
          message: 'Khôi phục tất cả cài đặt giao diện và Liquid Glass về mặc định?',
          okLabel: 'Đặt lại',
          okClass: 'btn-danger',
          onConfirm: function () {
            state.settings = Object.assign({}, DEFAULT_SETTINGS);
            saveSettings();
            applySettingsToDocument();
            renderSettings();
            showToast('Đã đặt lại cài đặt về mặc định.', 'success');
          }
        });
      });
    }

    // Midnight / Day Rollover Watcher (Carryover safety while tab stays open)
    setInterval(function () {
      const latestDay = getLocalDateKey(Date.now());
      if (latestDay !== currentDayKey) {
        const previousDay = currentDayKey;
        currentDayKey = latestDay;
        if (state.statsDate === previousDay) state.statsDate = latestDay;
        if (state.statsWeekDate === previousDay) state.statsWeekDate = latestDay;
        if (state.historyDate === previousDay) state.historyDate = latestDay;
        renderAll();
      }
    }, 60000);
  }

  /* ==========================================================================
     LIQUID TOUCH HIGHLIGHT (LIGHTWEIGHT POINTER-REACTIVE SPECULAR SHEEN)
     ========================================================================== */
  function initLiquidTouchHighlights() {
    const INTERACTIVE_SELECTOR =
      '.order-card, .fab, .nav-item, .action-btn, .btn, .seg-btn, .chip-btn, .btn-export, .btn-outline-sm, .modal-close, .search-box, .profile-edit-link, .profile-avatar-edit-btn, .profile-info-action';
    const RIPPLE_SELECTOR =
      '.fab, .nav-item, .action-btn, .btn, .seg-btn, .chip-btn, .btn-export, .btn-outline-sm, .card-compact-trigger, .profile-edit-link, .profile-avatar-edit-btn, .profile-info-action';
    let activeEl = null;
    let clearTimer = null;
    let rafPending = false;
    let lastMoveEvent = null;

    function isSystemReducedMotion() {
      return (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }

    function triggerLightHaptic() {
      if (!state.settings.hapticFeedback) return;
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(8);
        }
      } catch (_) {
        // Ignore on unsupported browsers
      }
    }

    function applyLightPosition(el, clientX, clientY) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const xPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      el.style.setProperty('--lx', xPct.toFixed(1) + '%');
      el.style.setProperty('--ly', yPct.toFixed(1) + '%');
    }

    function spawnLiquidRipple(el, clientX, clientY) {
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const size = Math.max(rect.width, rect.height) * 1.45;
      const ripple = document.createElement('span');
      ripple.className = 'liquid-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = (clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (clientY - rect.top - size / 2) + 'px';

      el.appendChild(ripple);
      const cleanup = function () {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      };
      ripple.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, 520);
    }

    function clearActiveLit() {
      if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
      }
      if (activeEl) {
        activeEl.classList.remove('is-lit');
        activeEl = null;
      }
    }

    document.addEventListener(
      'pointerdown',
      function (e) {
        if (e.pointerType !== 'mouse') {
          triggerLightHaptic();
        }
        if (!state.settings.touchRipple || isSystemReducedMotion()) {
          clearActiveLit();
          return;
        }

        const target = e.target && e.target.closest ? e.target.closest(INTERACTIVE_SELECTOR) : null;
        clearActiveLit();
        if (target) {
          activeEl = target;
          applyLightPosition(target, e.clientX, e.clientY);
          target.classList.add('is-lit');
          clearTimer = setTimeout(clearActiveLit, 420);
        }

        const rippleHost = e.target && e.target.closest ? e.target.closest(RIPPLE_SELECTOR) : null;
        if (rippleHost) {
          spawnLiquidRipple(rippleHost, e.clientX, e.clientY);
        }
      },
      { passive: true }
    );

    document.addEventListener(
      'pointermove',
      function (e) {
        if (!state.settings.touchRipple || isSystemReducedMotion()) return;
        if (e.pointerType !== 'mouse' && !activeEl) return;
        lastMoveEvent = e;
        if (rafPending) return;
        rafPending = true;
        window.requestAnimationFrame(function () {
          rafPending = false;
          if (!lastMoveEvent) return;
          const ev = lastMoveEvent;
          lastMoveEvent = null;
          const target =
            activeEl ||
            (ev.target && ev.target.closest ? ev.target.closest(INTERACTIVE_SELECTOR) : null);
          if (target) {
            applyLightPosition(target, ev.clientX, ev.clientY);
          }
        });
      },
      { passive: true }
    );

    document.addEventListener('pointerup', clearActiveLit, { passive: true });
    document.addEventListener('pointercancel', clearActiveLit, { passive: true });
  }

  /* ==========================================================================
     MOBILE KEYBOARD, VISUAL VIEWPORT & BOTTOM SHEET HANDLE UX
     ========================================================================== */
  function initMobileKeyboardUX() {
    const rootStyle = document.documentElement.style;
    const vv = window.visualViewport;
    let baseHeight = window.innerHeight || 0;

    function syncViewport() {
      const currentH = vv ? vv.height : window.innerHeight;
      if (currentH > baseHeight) {
        baseHeight = currentH;
      }
      rootStyle.setProperty('--viewport-height', Math.round(currentH) + 'px');
      const isKeyboardLikelyOpen = baseHeight > 0 && currentH < baseHeight * 0.78;
      document.body.classList.toggle('keyboard-open', isKeyboardLikelyOpen);
    }

    if (vv) {
      vv.addEventListener('resize', syncViewport);
      vv.addEventListener('scroll', syncViewport);
    }
    window.addEventListener('resize', syncViewport);
    syncViewport();

    // Scroll focused form control cleanly into view above virtual keyboard
    document.addEventListener('focusin', function (e) {
      const el = e.target;
      if (!el || !el.matches) return;
      if (!el.matches('input, textarea, select')) return;

      if (el.closest('.app-main')) {
        document.body.classList.add('keyboard-open');
      }

      if (el.closest('.modal-scroll-content')) {
        setTimeout(function () {
          try {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          } catch (_) {
            // Fallback for older mobile browsers
            el.scrollIntoView(false);
          }
        }, 220);
      }
    });

    document.addEventListener('focusout', function () {
      setTimeout(function () {
        const active = document.activeElement;
        const stillInMainInput =
          active &&
          active.matches &&
          active.matches('input, textarea, select') &&
          active.closest('.app-main');
        if (!stillInMainInput) {
          syncViewport();
        }
      }, 120);
    });

    // Optional intentional swipe-down on bottom-sheet handle / header to close
    const dragHandles = document.querySelectorAll('.modal-sheet .sheet-drag-handle, .modal-sheet .modal-header');
    dragHandles.forEach(function (handle) {
      let startY = 0;
      let tracking = false;

      handle.addEventListener(
        'touchstart',
        function (e) {
          if (e.target.closest('button')) return;
          if (e.touches && e.touches.length === 1) {
            startY = e.touches[0].clientY;
            tracking = true;
          }
        },
        { passive: true }
      );

      handle.addEventListener(
        'touchend',
        function (e) {
          if (!tracking) return;
          tracking = false;
          const endY =
            e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : startY;
          if (endY - startY > 72) {
            const modalOverlay = handle.closest('.modal-overlay');
            if (modalOverlay) {
              closeModal(modalOverlay);
            }
          }
        },
        { passive: true }
      );
    });
  }

  /* ==========================================================================
     BRAND LOGO OFFLINE FALLBACK
     ========================================================================== */
  function initBrandLogoFallback() {
    const footerLogo = document.getElementById('footer-dhn-logo');
    if (footerLogo) {
      footerLogo.addEventListener('error', function () {
        footerLogo.hidden = true;
      });
    }
  }

  /* ==========================================================================
     BOOTSTRAP
     ========================================================================== */
  function init() {
    loadSettingsFromStorage();
    applySettingsToDocument();
    loadProfileFromStorage();
    loadOrdersFromStorage();
    bindEvents();
    initLiquidTouchHighlights();
    initMobileKeyboardUX();
    initBrandLogoFallback();
    switchTab(state.settings.defaultStartTab || 'home');
  }

  init();
})();
