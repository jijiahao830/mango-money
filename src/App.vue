<template>
  <div class="site-background" aria-hidden="true"></div>
  <main class="container app-shell">
    <section v-if="!currentUser" class="card login-card">
      <header class="page-header">
        <img class="top-logo" :src="topLogo" alt="芒果租车" />
        <h1>芒果租车 财务系统登录</h1>
      </header>

      <form class="receipt-form" @submit.prevent="login">
        <div class="row">
          <label>
            <span>账号</span>
            <input v-model="loginForm.username" autocomplete="username" required />
          </label>

          <label>
            <span>密码</span>
            <input
              v-model="loginForm.password"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>
        </div>

        <hr />

        <button type="submit" :disabled="isLoginLoading">登录</button>
      </form>

      <p v-if="loginError" class="error-text">{{ loginError }}</p>
    </section>

    <section v-else class="workspace">
      <header class="workspace-header">
        <img class="top-logo" :src="topLogo" alt="芒果租车" />
      </header>

      <nav class="workspace-nav" aria-label="财务系统导航">
        <div class="nav-actions">
          <button
            class="nav-button"
            :class="{ active: activePage === 'home' }"
            type="button"
            @click="activePage = 'home'"
          >
            首页
          </button>
          <button
            class="nav-button"
            :class="{ active: activePage === 'deposit' }"
            type="button"
            @click="activePage = 'deposit'"
          >
            定金单
          </button>
          <button
            class="nav-button"
            :class="{ active: activePage === 'balance' }"
            type="button"
            @click="activePage = 'balance'"
          >
            尾款单
          </button>
        </div>

        <div class="nav-user">
          <span>当前登录：<strong>{{ currentUser.username }}</strong></span>
          <button class="secondary nav-logout" type="button" :disabled="isLoading" @click="logout">退出登录</button>
        </div>
      </nav>

      <section v-if="activePage === 'home'" class="workspace-page"></section>

      <section v-else-if="activePage === 'deposit'" class="card form-card">
        <header class="page-header compact">
          <h1>定金单生成</h1>
        </header>

        <form ref="receiptForm" class="receipt-form">
        <div class="row">
          <label>
            <span>客户名</span>
            <input v-model="form.customerName" name="customerName" required />
          </label>

          <label>
            <span>客户编号（不能有中文）</span>
            <input v-model="form.customerId" name="customerId" required />
          </label>
        </div>

        <div class="row">
          <label>
            <span>车型名</span>
            <input v-model="form.carModel" name="carModel" required />
          </label>

          <label>
            <span>订单编号（不能有中文）</span>
            <input v-model="form.orderId" name="orderId" required />
          </label>
        </div>

        <div class="field-block">
          <div class="calendar-row">
            <label>
              <span>取车时间</span>
              <input v-model="pickupAt" type="date" required />
            </label>

            <label>
              <span>还车时间</span>
              <input v-model="dropoffAt" type="date" required />
            </label>
          </div>
        </div>

        <label>
          <span>取还车方式（默认为昆明 · 到店取车，不填的时候就是默认）</span>
          <input
            v-model="form.pickupDropoffMethod"
            name="pickupDropoffMethod"
            placeholder="昆明 · 到店取车"
          />
        </label>

        <div class="row">
          <label>
            <span>定金金额（只能是数字）</span>
            <input
              v-model="form.depositAmount"
              name="depositAmount"
              inputmode="decimal"
              required
            />
          </label>

          <label>
            <span>尾款金额（只能是数字）</span>
            <input
              v-model="form.balanceAmount"
              name="balanceAmount"
              inputmode="decimal"
              required
            />
          </label>
        </div>

        <label>
          <span>保留截止时间</span>
          <input
            v-model="holdUntilAt"
            type="datetime-local"
            name="holdUntil"
            required
          />
        </label>

        <div class="form-actions">
          <button type="button" :disabled="isLoading" @click="generateReceipt">生成</button>
          <button class="secondary" type="button" :disabled="isLoading" @click="clearForm">清空</button>
        </div>
        </form>

        <div v-if="isLoading" class="progress-wrap" aria-label="正在生成">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            <img class="progress-logo" :src="orangeLogo" alt="" :style="progressLogoStyle" />
            <span class="progress-percent">{{ progress }}%</span>
          </div>
        </div>

        <p v-if="statusText" class="status-text">{{ statusText }}</p>
        <p v-if="errorText" class="error-text">{{ errorText }}</p>
      </section>

      <section v-else class="workspace-page"></section>
    </section>
  </main>

  <div v-if="isPreviewOpen" class="modal-backdrop" @click.self="closePreview">
    <section class="preview-modal" aria-modal="true" role="dialog">
      <header class="modal-header">
        <h2>定金单预览</h2>
        <button class="icon-button" type="button" aria-label="关闭预览" @click="closePreview">×</button>
      </header>

      <div class="preview-toolbar">
        <button class="tool-button" type="button" @click="zoomOut">缩小</button>
        <button class="tool-button" type="button" @click="zoomIn">放大</button>
        <button class="tool-button" type="button" @click="resetView">重置</button>
      </div>

      <div class="preview-stage">
        <div class="preview-canvas">
          <img
            :src="result.imageUrl"
            alt="定金单预览图"
            :style="previewImageStyle"
          />
        </div>
      </div>

      <footer class="modal-footer">
        <button class="download-button" type="button" @click="downloadImage">下载图片</button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import orangeLogo from './assets/logo.webp';
import topLogo from './assets/top-logo.webp';

const form = reactive({
  customerName: '',
  customerId: '',
  carModel: '',
  rentalTime: '',
  pickupDropoffMethod: '',
  depositAmount: '',
  balanceAmount: '',
  holdUntil: '',
  orderId: ''
});

const DEFAULT_PICKUP_DROPOFF_METHOD = '昆明 · 到店取车';
const STORED_USER_KEY = 'mango_finance_user';

const currentUser = ref(readStoredUser());
const activePage = ref('home');
const isLoginLoading = ref(false);
const loginError = ref('');
const loginForm = reactive({
  username: '',
  password: ''
});
const pickupAt = ref('');
const dropoffAt = ref('');
const holdUntilAt = ref('');
const receiptForm = ref(null);
const isLoading = ref(false);
const isPreviewOpen = ref(false);
const statusText = ref('');
const errorText = ref('');
const scale = ref(1);
const progress = ref(0);
let progressTimer = null;
let previewObjectUrl = '';
const result = reactive({
  imageUrl: '',
  webpName: '',
  recordSaved: false
});

const previewImageStyle = computed(() => ({
  transform: `scale(${scale.value})`
}));

const progressLogoStyle = computed(() => ({
  left: `${progress.value}%`
}));

const rentalTime = computed(() => {
  if (!pickupAt.value || !dropoffAt.value) return '';
  return `${formatDate(pickupAt.value)} - ${formatDate(dropoffAt.value)}`;
});

watch(rentalTime, (value) => {
  form.rentalTime = value;
});

watch(holdUntilAt, (value) => {
  form.holdUntil = value ? formatDateTime(value) : '';
});

function getPayload() {
  return {
    ...form,
    pickupDropoffMethod:
      form.pickupDropoffMethod.trim() || DEFAULT_PICKUP_DROPOFF_METHOD
  };
}

async function login() {
  loginError.value = '';
  isLoginLoading.value = true;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '登录失败');
    }

    currentUser.value = data.user;
    localStorage.setItem(STORED_USER_KEY, JSON.stringify(data.user));
    loginForm.password = '';
  } catch (error) {
    loginError.value = error?.message || String(error);
  } finally {
    isLoginLoading.value = false;
  }
}

function logout() {
  localStorage.removeItem(STORED_USER_KEY);
  currentUser.value = null;
  clearForm();
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORED_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

async function generateReceipt() {
  const validationError = validateFormValues();
  if (validationError) {
    errorText.value = validationError;
    statusText.value = '';
    return;
  }

  await renderWithSkill('/api/generate', '正在生成图片。。。');
}

function validateFormValues() {
  const errors = [];
  const chinesePattern = /[\u3400-\u9fff]/;
  const digitsOnlyPattern = /^\d+$/;

  if (chinesePattern.test(form.customerId)) {
    errors.push('客户编号不能包含中文');
  }

  if (chinesePattern.test(form.orderId)) {
    errors.push('订单编号不能包含中文');
  }

  if (!digitsOnlyPattern.test(String(form.depositAmount).trim())) {
    errors.push('定金金额只能是数字');
  }

  if (!digitsOnlyPattern.test(String(form.balanceAmount).trim())) {
    errors.push('尾款金额只能是数字');
  }

  return errors.join('\n');
}

async function renderWithSkill(url, loadingText) {
  if (receiptForm.value && !receiptForm.value.reportValidity()) return;

  isLoading.value = true;
  startProgress();
  statusText.value = loadingText;
  errorText.value = '';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getPayload())
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || '生成失败');
    }

    const blob = await response.blob();
    revokePreviewObjectUrl();
    previewObjectUrl = URL.createObjectURL(blob);
    result.imageUrl = previewObjectUrl;
    result.webpName = getFilenameFromResponse(response) || 'deposit.webp';
    result.recordSaved = false;
    finishProgress();
    statusText.value = '已生成';
    resetView();
    isPreviewOpen.value = true;
  } catch (error) {
    errorText.value = error?.message || String(error);
    statusText.value = '';
  } finally {
    stopProgress();
    isLoading.value = false;
  }
}

function closePreview() {
  isPreviewOpen.value = false;
}

function zoomIn() {
  scale.value = Math.min(2.5, Number((scale.value + 0.1).toFixed(2)));
}

function zoomOut() {
  scale.value = Math.max(0.3, Number((scale.value - 0.1).toFixed(2)));
}

function resetView() {
  scale.value = 1;
}

async function downloadImage() {
  if (!result.imageUrl) return;

  try {
    if (!result.recordSaved) {
      await saveDjdRecord();
      result.recordSaved = true;
    }

    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = result.webpName || 'deposit.webp';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch {
    errorText.value = '下载图片失败，请重新生成后再试';
  }
}

async function saveDjdRecord() {
  const response = await fetch('/api/djd-record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...getPayload(),
      createUser: currentUser.value?.username || ''
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '记录定金单失败');
  }
}

function getFilenameFromResponse(response) {
  const raw = response.headers.get('X-Filename');
  return raw ? decodeURIComponent(raw) : '';
}

function revokePreviewObjectUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = '';
  }
}

function startProgress() {
  progress.value = 0;
  stopProgress();
  progressTimer = window.setInterval(() => {
    if (progress.value < 95) {
      progress.value += Math.max(1, Math.round((95 - progress.value) * 0.12));
    }
  }, 180);
}

function finishProgress() {
  progress.value = 100;
}

function stopProgress() {
  if (progressTimer) {
    window.clearInterval(progressTimer);
    progressTimer = null;
  }
}

function clearForm() {
  form.customerName = '';
  form.customerId = '';
  form.carModel = '';
  form.rentalTime = '';
  form.pickupDropoffMethod = '';
  form.depositAmount = '';
  form.balanceAmount = '';
  form.holdUntil = '';
  form.orderId = '';
  pickupAt.value = '';
  dropoffAt.value = '';
  holdUntilAt.value = '';
  revokePreviewObjectUrl();
  result.imageUrl = '';
  result.webpName = '';
  result.recordSaved = false;
  statusText.value = '';
  errorText.value = '';
  progress.value = 0;
  stopProgress();
  isPreviewOpen.value = false;
  resetView();
}

function formatDate(value) {
  return value.replaceAll('-', '.');
}

function formatDateTime(value) {
  const [date = '', time = ''] = value.split('T');
  return `${formatDate(date)} ${time}`;
}
</script>
