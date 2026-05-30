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
          <button
            class="nav-button"
            :class="{ active: activePage === 'statement' }"
            type="button"
            @click="activePage = 'statement'"
          >
            对帐单
          </button>
          <button
            v-if="isAdministrator"
            class="nav-button"
            :class="{ active: activePage === 'accounts' }"
            type="button"
            @click="activePage = 'accounts'"
          >
            账号管理
          </button>
        </div>

        <div class="nav-user">
          <span>当前登录：<strong>{{ currentDisplayName }}</strong></span>
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

      <section v-else-if="activePage === 'balance'" class="card form-card">
        <header class="page-header compact">
          <h1>尾款单生成</h1>
        </header>

        <form ref="balanceFormRef" class="receipt-form">
          <div class="row">
            <label>
              <span>客户名</span>
              <input v-model="balanceForm.customerName" required />
            </label>

            <label>
              <span>客户编号（不能有中文）</span>
              <input v-model="balanceForm.customerId" required />
            </label>
          </div>

          <div class="row">
            <label>
              <span>车型名</span>
              <input v-model="balanceForm.carModel" required />
            </label>

            <label>
              <span>订单编号（不能有中文）</span>
              <input v-model="balanceForm.orderId" required />
            </label>
          </div>

          <div class="field-block">
            <div class="calendar-row">
              <label>
                <span>开始用车时间</span>
                <input v-model="balancePickupAt" type="date" required />
              </label>

              <label>
                <span>收款时间</span>
                <input v-model="balanceReceivedAt" type="date" required />
              </label>
            </div>
          </div>

          <div class="row">
            <label>
              <span>用车方式</span>
              <select
                v-model="balanceForm.pickupDropoffMethod"
                required
              >
                <option value="" disabled>请选择用车方式</option>
                <option value="配驾服务">配驾服务</option>
                <option value="接送机">接送机</option>
              </select>
            </label>

            <label>
              <span>支付方式</span>
              <input v-model="balanceForm.paymentMethod" required />
            </label>
          </div>

          <div class="row">
            <label>
              <span>合计收款金额（只能是数字，可有小数点）</span>
              <input v-model="balanceForm.balanceAmount" inputmode="decimal" required />
            </label>

            <label>
              <span>单价</span>
              <input v-model="balanceForm.unitPrice" required />
            </label>
          </div>

          <div class="row">
            <label>
              <span>订单备注1（可以不填，不填的时候为空）</span>
              <input
                v-model="balanceForm.orderRemarkLine1"
              />
            </label>

            <label>
              <span>订单备注2（可以不填，不填的时候为空）</span>
              <input
                v-model="balanceForm.orderRemarkLine2"
              />
            </label>
          </div>

          <label>
            <span>经办人</span>
            <input v-model="balanceForm.operator" placeholder="不填默认当前登录显示名" />
          </label>

          <div class="form-actions">
            <button type="button" :disabled="isLoading" @click="generateBalanceReceipt">生成</button>
            <button class="secondary" type="button" :disabled="isLoading" @click="clearBalanceForm">清空</button>
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

      <section v-else-if="activePage === 'accounts'" class="account-page">
        <header class="section-title-row">
          <div>
            <h1>管理员账号</h1>
            <p>可增加账号、删除账号、修改密码，并查看当前保存的账号密码。</p>
          </div>
          <span class="count-badge">{{ users.length }} 个</span>
        </header>

        <section class="card account-create-card">
          <h2>添加账号</h2>
          <form class="receipt-form" @submit.prevent="createAccount">
            <div class="row">
              <label>
                <span>账号</span>
                <input v-model="accountForm.username" placeholder="例如：admin2" required />
              </label>

              <label>
                <span>姓名/显示名</span>
                <input v-model="accountForm.displayName" placeholder="可选" />
              </label>

              <label>
                <span>联系方式</span>
                <input v-model="accountForm.contact" placeholder="可选" />
              </label>

              <label>
                <span>权限</span>
                <select v-model="accountForm.permission">
                  <option value="personnel">工作人员</option>
                  <option value="administrator">管理员</option>
                </select>
              </label>
            </div>

            <label>
              <span>初始密码</span>
              <input
                v-model="accountForm.password"
                type="password"
                placeholder="至少 6 位"
                required
                minlength="6"
              />
            </label>

            <button type="submit" :disabled="isAccountLoading">添加账号</button>
          </form>
        </section>

        <div class="account-list">
          <article v-for="user in users" :key="user.id" class="account-item">
            <div class="account-info">
              <div class="account-title-line">
                <strong>{{ user.displayName || user.username }}</strong>
                <span class="status-pill">可用</span>
              </div>
              <p>
                账号：{{ user.username }}
                <template v-if="user.contact"> · 联系方式：{{ user.contact }}</template>
                · 权限：{{ permissionLabel(user.permission) }}
                · 创建：{{ formatDisplayDate(user.createTime) }}
              </p>
              <div class="password-line">
                <span>当前密码：</span>
                <code>{{ visiblePasswords[user.id] ? user.password : maskPassword(user.password) }}</code>
                <button class="eye-button" type="button" @click="togglePassword(user.id)">
                  {{ visiblePasswords[user.id] ? '隐藏' : '查看' }}
                </button>
              </div>
            </div>

            <div class="account-actions">
              <input
                v-model="newPasswords[user.id]"
                type="password"
                placeholder="输入新密码"
              />
              <button class="secondary" type="button" :disabled="isAccountLoading" @click="changeAccountPassword(user)">
                修改密码
              </button>
              <button class="danger" type="button" :disabled="isAccountLoading" @click="deleteAccount(user)">
                删除账号
              </button>
            </div>
          </article>
        </div>

        <p v-if="accountStatusText" class="status-text">{{ accountStatusText }}</p>
        <p v-if="accountErrorText" class="error-text">{{ accountErrorText }}</p>
      </section>

      <section v-else class="workspace-page"></section>
    </section>
  </main>

  <div v-if="isPreviewOpen" class="modal-backdrop" @click.self="closePreview">
    <section class="preview-modal" aria-modal="true" role="dialog">
      <header class="modal-header">
        <h2>{{ previewTitle }}</h2>
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
            :alt="previewTitle"
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

const balanceForm = reactive({
  customerName: '',
  customerId: '',
  carModel: '',
  rentalTime: '',
  pickupDropoffMethod: '',
  balanceAmount: '',
  unitPrice: '',
  paymentMethod: '',
  orderRemarkLine1: '',
  orderRemarkLine2: '',
  receivedAt: '',
  orderId: '',
  operator: ''
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
const accountForm = reactive({
  username: '',
  displayName: '',
  contact: '',
  password: '',
  permission: 'personnel'
});
const users = ref([]);
const visiblePasswords = reactive({});
const newPasswords = reactive({});
const isAccountLoading = ref(false);
const accountStatusText = ref('');
const accountErrorText = ref('');
const pickupAt = ref('');
const dropoffAt = ref('');
const holdUntilAt = ref('');
const balancePickupAt = ref('');
const balanceReceivedAt = ref('');
const receiptForm = ref(null);
const balanceFormRef = ref(null);
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
  recordSaved: false,
  type: 'deposit'
});

const previewImageStyle = computed(() => ({
  transform: `scale(${scale.value})`
}));

const progressLogoStyle = computed(() => ({
  left: `${progress.value}%`
}));

const isAdministrator = computed(() => currentUser.value?.permission === 'administrator');
const currentDisplayName = computed(() => currentUser.value?.displayName || currentUser.value?.username || '');

const previewTitle = computed(() => (result.type === 'balance' ? '尾款单预览' : '定金单预览'));

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

const balanceRentalTime = computed(() => {
  if (!balancePickupAt.value) return '';
  return formatDate(balancePickupAt.value);
});

watch(balanceRentalTime, (value) => {
  balanceForm.rentalTime = value;
});

watch(balanceReceivedAt, (value) => {
  balanceForm.receivedAt = value ? formatDate(value) : '';
});

watch(activePage, (value) => {
  if (value === 'accounts') {
    if (!isAdministrator.value) {
      activePage.value = 'home';
      return;
    }
    loadUsers();
  }
});

function getPayload() {
  return {
    ...form,
    pickupDropoffMethod:
      form.pickupDropoffMethod.trim() || DEFAULT_PICKUP_DROPOFF_METHOD
  };
}

function getBalancePayload() {
  return {
    ...balanceForm,
    pickupDropoffMethod: balanceForm.pickupDropoffMethod.trim(),
    balanceAmount: normalizeMoneyInput(balanceForm.balanceAmount),
    unitPrice: balanceForm.unitPrice.trim(),
    paymentMethod: balanceForm.paymentMethod.trim(),
    orderRemarkLine1: balanceForm.orderRemarkLine1.trim(),
    orderRemarkLine2: balanceForm.orderRemarkLine2.trim(),
    operator: balanceForm.operator.trim() || currentDisplayName.value
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
  clearBalanceForm();
  clearAccountState();
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

  await renderWithSkill('/api/generate', '正在生成图片。。。', getPayload(), 'deposit', receiptForm.value);
}

async function generateBalanceReceipt() {
  const validationError = validateBalanceFormValues();
  if (validationError) {
    errorText.value = validationError;
    statusText.value = '';
    return;
  }

  await renderWithSkill('/api/generate-balance', '正在生成图片。。。', getBalancePayload(), 'balance', balanceFormRef.value);
}

function validateFormValues() {
  const errors = [];
  const chinesePattern = /[\u3400-\u9fff]/;
  const digitsOnlyPattern = /^\d+$/;
  const requiredFields = [
    ['客户名', form.customerName],
    ['客户编号', form.customerId],
    ['车型名', form.carModel],
    ['订单编号', form.orderId],
    ['取车时间', pickupAt.value],
    ['还车时间', dropoffAt.value],
    ['定金金额', form.depositAmount],
    ['尾款金额', form.balanceAmount],
    ['保留截止时间', holdUntilAt.value]
  ];

  for (const [label, value] of requiredFields) {
    if (String(value ?? '').trim() === '') {
      errors.push(`${label}不能为空`);
    }
  }

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

function validateBalanceFormValues() {
  const errors = [];
  const chinesePattern = /[\u3400-\u9fff]/;
  const moneyPattern = /^\d+(\.\d+)?$/;
  const requiredFields = [
    ['客户名', balanceForm.customerName],
    ['客户编号', balanceForm.customerId],
    ['车型名', balanceForm.carModel],
    ['订单编号', balanceForm.orderId],
    ['开始用车时间', balancePickupAt.value],
    ['收款时间', balanceReceivedAt.value],
    ['用车方式', balanceForm.pickupDropoffMethod],
    ['支付方式', balanceForm.paymentMethod],
    ['合计收款金额', balanceForm.balanceAmount],
    ['单价', balanceForm.unitPrice]
  ];

  for (const [label, value] of requiredFields) {
    if (String(value ?? '').trim() === '') {
      errors.push(`${label}不能为空`);
    }
  }

  if (chinesePattern.test(balanceForm.customerId)) {
    errors.push('客户编号不能包含中文');
  }

  if (chinesePattern.test(balanceForm.orderId)) {
    errors.push('订单编号不能包含中文');
  }

  if (!moneyPattern.test(String(balanceForm.balanceAmount).trim())) {
    errors.push('合计收款金额只能是数字，可有小数点');
  }

  return errors.join('\n');
}

function normalizeMoneyInput(value) {
  return String(value).trim().replace(/,/g, '');
}

async function renderWithSkill(url, loadingText, payload, type, formElement) {
  if (formElement && !formElement.reportValidity()) return;

  isLoading.value = true;
  startProgress();
  statusText.value = loadingText;
  errorText.value = '';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || '生成失败');
    }

    const blob = await response.blob();
    revokePreviewObjectUrl();
    previewObjectUrl = URL.createObjectURL(blob);
    result.imageUrl = previewObjectUrl;
    result.webpName = getFilenameFromResponse(response) || `${type}.webp`;
    result.recordSaved = false;
    result.type = type;
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
      if (result.type === 'balance') {
        await saveWkdRecord();
      } else {
        await saveDjdRecord();
      }
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

async function loadUsers() {
  accountErrorText.value = '';
  accountStatusText.value = '';
  isAccountLoading.value = true;

  try {
    const response = await fetch('/api/users');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '读取账号失败');
    users.value = data.users || [];
  } catch (error) {
    accountErrorText.value = error?.message || String(error);
  } finally {
    isAccountLoading.value = false;
  }
}

async function createAccount() {
  accountErrorText.value = '';
  accountStatusText.value = '';
  isAccountLoading.value = true;

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountForm)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '添加账号失败');

    accountForm.username = '';
    accountForm.displayName = '';
    accountForm.contact = '';
    accountForm.password = '';
    accountForm.permission = 'personnel';
    accountStatusText.value = '账号已添加';
    await loadUsers();
  } catch (error) {
    accountErrorText.value = error?.message || String(error);
  } finally {
    isAccountLoading.value = false;
  }
}

async function changeAccountPassword(user) {
  const password = String(newPasswords[user.id] || '');
  accountErrorText.value = '';
  accountStatusText.value = '';

  if (!password) {
    accountErrorText.value = '新密码不能为空';
    return;
  }

  isAccountLoading.value = true;
  try {
    const response = await fetch(`/api/users/${user.id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '修改密码失败');

    newPasswords[user.id] = '';
    accountStatusText.value = '密码已修改';
    await loadUsers();
  } catch (error) {
    accountErrorText.value = error?.message || String(error);
  } finally {
    isAccountLoading.value = false;
  }
}

async function deleteAccount(user) {
  accountErrorText.value = '';
  accountStatusText.value = '';

  if (!window.confirm(`确认删除账号 ${user.username}？`)) return;

  isAccountLoading.value = true;
  try {
    const response = await fetch(`/api/users/${user.id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '删除账号失败');

    accountStatusText.value = '账号已删除';
    await loadUsers();
  } catch (error) {
    accountErrorText.value = error?.message || String(error);
  } finally {
    isAccountLoading.value = false;
  }
}

function togglePassword(id) {
  visiblePasswords[id] = !visiblePasswords[id];
}

function maskPassword(password) {
  return '*'.repeat(Math.max(6, String(password || '').length));
}

function clearAccountState() {
  users.value = [];
  accountForm.username = '';
  accountForm.displayName = '';
  accountForm.contact = '';
  accountForm.password = '';
  accountForm.permission = 'personnel';
  accountStatusText.value = '';
  accountErrorText.value = '';
  for (const key of Object.keys(visiblePasswords)) delete visiblePasswords[key];
  for (const key of Object.keys(newPasswords)) delete newPasswords[key];
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

async function saveWkdRecord() {
  const response = await fetch('/api/wkd-record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...getBalancePayload(),
      createUser: currentUser.value?.username || ''
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '记录尾款单失败');
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
  result.type = 'deposit';
  statusText.value = '';
  errorText.value = '';
  progress.value = 0;
  stopProgress();
  isPreviewOpen.value = false;
  resetView();
}

function clearBalanceForm() {
  balanceForm.customerName = '';
  balanceForm.customerId = '';
  balanceForm.carModel = '';
  balanceForm.rentalTime = '';
  balanceForm.pickupDropoffMethod = '';
  balanceForm.balanceAmount = '';
  balanceForm.unitPrice = '';
  balanceForm.paymentMethod = '';
  balanceForm.orderRemarkLine1 = '';
  balanceForm.orderRemarkLine2 = '';
  balanceForm.receivedAt = '';
  balanceForm.orderId = '';
  balanceForm.operator = '';
  balancePickupAt.value = '';
  balanceReceivedAt.value = '';
  revokePreviewObjectUrl();
  result.imageUrl = '';
  result.webpName = '';
  result.recordSaved = false;
  result.type = 'balance';
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

function formatDisplayDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
}

function permissionLabel(permission) {
  return permission === 'administrator' ? '管理员' : '工作人员';
}
</script>
