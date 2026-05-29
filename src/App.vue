<template>
  <div class="site-background" aria-hidden="true"></div>
  <main class="container app-shell">
    <section class="card form-card">
      <header class="page-header">
        <img class="top-logo" :src="topLogo" alt="芒果租车" />
        <h1>芒果租车 · 定金单生成</h1>
      </header>
      <form ref="receiptForm" class="receipt-form">
        <div class="row">
          <label>
            <span>客户名</span>
            <input v-model="form.customerName" name="customerName" required />
          </label>

          <label>
            <span>客户编号</span>
            <input v-model="form.customerId" name="customerId" required />
          </label>
        </div>

        <div class="row">
          <label>
            <span>车型名</span>
            <input v-model="form.carModel" name="carModel" required />
          </label>

          <label>
            <span>订单编号</span>
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
            <span>定金金额</span>
            <input
              v-model="form.depositAmount"
              name="depositAmount"
              inputmode="decimal"
              required
            />
          </label>

          <label>
            <span>尾款金额</span>
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
const result = reactive({
  imageUrl: '',
  webpName: ''
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

async function generateReceipt() {
  await renderWithSkill('/api/generate', '正在生成图片。。。');
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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '生成失败');
    }

    result.imageUrl = data.imageUrl;
    result.webpName = data.webpName;
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
    const response = await fetch(result.imageUrl);
    if (!response.ok) throw new Error('download failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.webpName || 'deposit.webp';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    errorText.value = '下载图片失败，请重新生成后再试';
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
  result.imageUrl = '';
  result.webpName = '';
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
