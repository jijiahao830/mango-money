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
            class="nav-button"
            :class="{ active: activePage === 'history' }"
            type="button"
            @click="activePage = 'history'"
          >
            历史图片
          </button>
          <button
            v-if="isAdministrator"
            class="nav-button"
            :class="{ active: activePage === 'push' }"
            type="button"
            @click="activePage = 'push'"
          >
            推送
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
            <input v-model="form.customerName" name="customerName" />
          </label>

          <label>
            <span>客户编号（不能有中文）</span>
            <input v-model="form.customerId" name="customerId" />
          </label>
        </div>

        <div class="row">
          <label>
            <span>车型名</span>
            <input v-model="form.carModel" name="carModel" />
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
              <input v-model="pickupAt" type="date" />
            </label>

            <label>
              <span>还车时间</span>
              <input v-model="dropoffAt" type="date" />
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
            />
          </label>

          <label>
            <span>尾款金额（只能是数字）</span>
            <input
              v-model="form.balanceAmount"
              name="balanceAmount"
              inputmode="decimal"
            />
          </label>
        </div>

        <label>
          <span>保留截止时间</span>
          <input
            v-model="holdUntilAt"
            type="datetime-local"
            name="holdUntil"
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
              <input v-model="balanceForm.customerName" />
            </label>

            <label>
              <span>客户编号（不能有中文）</span>
              <input v-model="balanceForm.customerId" />
            </label>
          </div>

          <div class="row">
            <label>
              <span>车型名</span>
              <input v-model="balanceForm.carModel" />
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
                <input v-model="balancePickupAt" type="date" />
              </label>

              <label>
                <span>收款时间</span>
                <input v-model="balanceReceivedAt" type="date" />
              </label>
            </div>
          </div>

          <div class="row">
            <label>
              <span>用车方式</span>
              <select
                v-model="balanceForm.pickupDropoffMethod"
              >
                <option value="" disabled>请选择用车方式</option>
                <option value="配驾服务">配驾服务</option>
                <option value="接送机">接送机</option>
              </select>
            </label>

            <label>
              <span>支付方式</span>
              <input v-model="balanceForm.paymentMethod" />
            </label>
          </div>

          <div class="row">
            <label>
              <span>合计收款金额（只能是数字，可有小数点）</span>
              <input v-model="balanceForm.balanceAmount" inputmode="decimal" />
            </label>

            <label>
              <span>单价</span>
              <input v-model="balanceForm.unitPrice" />
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

      <section v-else-if="activePage === 'statement'" class="card form-card">
        <header class="page-header compact">
          <h1>对帐单生成</h1>
        </header>

        <form ref="statementFormRef" class="receipt-form">
          <div class="form-section">
            <h2>基础信息</h2>
            <div class="row">
              <label>
                <span>客户姓名</span>
                <input v-model="statementForm.customerName" />
              </label>

              <label>
                <span>订单编号（不能有中文）</span>
                <input v-model="statementForm.orderId" required />
              </label>
            </div>
          </div>

          <div class="form-section">
            <h2>本次结算结果</h2>
            <div class="row">
              <label>
                <span>已收金额</span>
                <input v-model="statementForm.receivedAmount" inputmode="decimal" />
              </label>
              <label>
                <span>实际消费</span>
                <input v-model="statementForm.actualConsumption" inputmode="decimal" />
              </label>
              <label>
                <span>应退金额</span>
                <input v-model="statementForm.refundableDeposit" inputmode="decimal" />
              </label>
            </div>
          </div>

          <div class="form-section">
            <h2>消费明细</h2>
            <div class="row">
              <label>
                <span>车辆租金-说明</span>
                <input v-model="statementForm.carRentalDesc" />
              </label>
              <label>
                <span>车辆租金-金额</span>
                <input v-model="statementForm.carRentalAmount" inputmode="decimal" />
              </label>
            </div>
            <div class="row">
              <label>
                <span>超时费用-说明（可以不填，不填显示——）</span>
                <input v-model="statementForm.overtimeDesc" />
              </label>
              <label>
                <span>超时费用-金额</span>
                <input v-model="statementForm.overtimeAmount" inputmode="decimal" />
              </label>
            </div>
            <div class="row">
              <label>
                <span>补油费用-说明（可以不填，不填显示——）</span>
                <input v-model="statementForm.fuelDesc" />
              </label>
              <label>
                <span>补油费用-金额</span>
                <input v-model="statementForm.fuelAmount" inputmode="decimal" />
              </label>
            </div>
            <div class="row">
              <label>
                <span>其他费用-说明（可以不填，不填显示——）</span>
                <input v-model="statementForm.otherDesc" />
              </label>
              <label>
                <span>其他费用-金额</span>
                <input v-model="statementForm.otherAmount" inputmode="decimal" />
              </label>
            </div>
          </div>

          <div class="form-section">
            <h2>消费说明</h2>
            <div v-for="index in 6" :key="`statement-note-${index}`" class="row">
              <label>
                <span>消费说明{{ index }}（可以不填）</span>
                <input v-model="statementForm[`consumptionNote${index}`]" />
              </label>
              <label>
                <span>消费说明{{ index }}-金额（可以不填，不填显示——）</span>
                <input v-model="statementForm[`consumptionNote${index}Amount`]" />
              </label>
            </div>
          </div>

          <div class="form-section">
            <h2>用车记录</h2>
            <div class="row">
              <label><span>车型</span><input v-model="statementForm.carModel" /></label>
              <label><span>车牌</span><input v-model="statementForm.plateNumber" /></label>
            </div>
            <div class="row">
              <label><span>出车时间</span><input v-model="statementForm.startAt" /></label>
              <label><span>回车时间</span><input v-model="statementForm.returnAt" /></label>
            </div>
            <div class="row">
              <label><span>用车天数</span><input v-model="statementForm.useDays" /></label>
              <label><span>出车公里</span><input v-model="statementForm.startMileage" /></label>
            </div>
            <div class="row">
              <label><span>回车公里</span><input v-model="statementForm.returnMileage" /></label>
              <label><span>实际行驶</span><input v-model="statementForm.actualMileage" /></label>
            </div>
            <div class="row">
              <label><span>出车油量</span><input v-model="statementForm.startFuel" /></label>
              <label><span>回车油量</span><input v-model="statementForm.returnFuel" /></label>
              <label><span>补油量</span><input v-model="statementForm.refuelAmount" /></label>
            </div>
          </div>

          <div class="form-section">
            <h2>车辆检查结果</h2>
            <div class="row">
              <label>
                <span>有无新增磕碰</span>
                <select v-model="statementForm.checkScratch">
                  <option value="无">无</option>
                  <option value="有">有</option>
                </select>
              </label>
              <label>
                <span>有无新增划痕</span>
                <select v-model="statementForm.checkMark">
                  <option value="无">无</option>
                  <option value="有">有</option>
                </select>
              </label>
              <label>
                <span>有无事故记录</span>
                <select v-model="statementForm.checkAccident">
                  <option value="无">无</option>
                  <option value="有">有</option>
                </select>
              </label>
            </div>
            <div class="row">
              <label>
                <span>有无超公里费用</span>
                <select v-model="statementForm.checkOverMileage">
                  <option value="无">无</option>
                  <option value="有">有</option>
                </select>
              </label>
              <label>
                <span>有无超时费用</span>
                <select v-model="statementForm.checkOvertime">
                  <option value="无">无</option>
                  <option value="有">有</option>
                </select>
              </label>
            </div>
          </div>

          <div class="form-section">
            <h2>异常说明</h2>
            <div v-for="index in 9" :key="`statement-abnormal-${index}`" class="row">
              <label>
                <span>异常说明{{ index }}（可以不填）</span>
                <input v-model="statementForm[`abnormalNote${index}`]" />
              </label>
            </div>
          </div>

          <div class="form-section">
            <h2>押金信息</h2>
            <div class="row">
              <label>
                <span>车辆押金</span>
                <input v-model="statementForm.vehicleDeposit" inputmode="decimal" />
              </label>
              <label>
                <span>违章押金</span>
                <input v-model="statementForm.violationDeposit" inputmode="decimal" />
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" :disabled="isLoading" @click="generateStatementReceipt">生成</button>
            <button class="secondary" type="button" :disabled="isLoading" @click="clearStatementForm">清空</button>
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

      <section v-else-if="activePage === 'history'" class="account-page">
        <header class="section-title-row">
          <div>
            <h1>历史图片</h1>
            <p>按生成类型查看已保存的图片。</p>
          </div>
          <button class="secondary refresh-button" type="button" :disabled="isHistoryLoading" @click="loadHistoryImages">
            刷新
          </button>
        </header>

        <div v-if="isHistoryLoading" class="card account-create-card">
          <p class="empty-text">正在读取历史图片...</p>
        </div>

        <div v-else class="history-groups">
          <section v-for="group in historyGroups" :key="group.type" class="card history-group">
            <header class="history-group-header">
              <h2>{{ group.label }}</h2>
              <span class="count-badge">{{ group.count }} 张</span>
            </header>

            <div v-if="group.dateGroups?.length" class="history-date-list">
              <details v-for="dateGroup in group.dateGroups" :key="`${group.type}-${dateGroup.date}`" class="history-date-group">
                <summary>
                  <span>{{ dateGroup.date }}</span>
                  <strong>{{ dateGroup.count }} 张</strong>
                </summary>

                <div class="history-grid">
                  <article v-for="image in dateGroup.items" :key="image.url" class="history-item">
                    <button class="history-thumb" type="button" @click="previewHistoryImage(image)">
                      <img :src="image.apiUrl || image.url" :alt="image.name" loading="lazy" />
                    </button>
                    <div class="history-meta">
                      <strong>{{ image.name }}</strong>
                      <span>{{ formatFileSize(image.size) }}</span>
                    </div>
                    <div class="history-actions">
                      <button class="secondary" type="button" @click="previewHistoryImage(image)">预览</button>
                      <a class="download-link" :href="image.apiUrl || image.url" :download="image.name">下载</a>
                    </div>
                  </article>
                </div>
              </details>
            </div>

            <p v-else class="empty-text">暂无图片</p>
          </section>
        </div>

        <p v-if="historyErrorText" class="error-text">{{ historyErrorText }}</p>
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

      <section v-else-if="activePage === 'push'" class="account-page">
        <header class="section-title-row">
          <div>
            <h1>推送配置</h1>
            <p>配置企业微信群机器人 Webhook，生成图片后可直接推送完整图片到群里。</p>
          </div>
        </header>

        <section class="card account-create-card">
          <h2>企业微信机器人</h2>
          <form class="receipt-form" @submit.prevent="savePushConfig">
            <label>
              <span>Webhook 地址</span>
              <input
                v-model="pushConfig.webhook"
                placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
              />
            </label>
            <button type="submit" :disabled="isPushConfigLoading">保存配置</button>
          </form>
        </section>

        <p v-if="pushConfigStatusText" class="status-text">{{ pushConfigStatusText }}</p>
        <p v-if="pushConfigErrorText" class="error-text">{{ pushConfigErrorText }}</p>
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
        <button v-if="!result.history" class="secondary push-button" type="button" :disabled="isPushLoading" @click="pushCurrentImage">
          {{ isPushLoading ? '推送中' : '推送' }}
        </button>
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

const statementForm = reactive({
  customerName: '',
  orderId: '',
  receivedAmount: '',
  actualConsumption: '',
  refundableDeposit: '',
  carRentalDesc: '',
  carRentalAmount: '',
  overtimeDesc: '',
  overtimeAmount: '',
  fuelDesc: '',
  fuelAmount: '',
  otherDesc: '',
  otherAmount: '',
  consumptionNote1: '',
  consumptionNote1Amount: '',
  consumptionNote2: '',
  consumptionNote2Amount: '',
  consumptionNote3: '',
  consumptionNote3Amount: '',
  consumptionNote4: '',
  consumptionNote4Amount: '',
  consumptionNote5: '',
  consumptionNote5Amount: '',
  consumptionNote6: '',
  consumptionNote6Amount: '',
  carModel: '',
  plateNumber: '',
  startAt: '',
  returnAt: '',
  useDays: '',
  startMileage: '',
  returnMileage: '',
  actualMileage: '',
  startFuel: '',
  returnFuel: '',
  refuelAmount: '',
  checkScratch: '无',
  checkMark: '无',
  checkAccident: '无',
  checkOverMileage: '无',
  checkOvertime: '无',
  abnormalNote1: '',
  abnormalNote2: '',
  abnormalNote3: '',
  abnormalNote4: '',
  abnormalNote5: '',
  abnormalNote6: '',
  abnormalNote7: '',
  abnormalNote8: '',
  abnormalNote9: '',
  vehicleDeposit: '',
  violationDeposit: ''
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
const pushConfig = reactive({
  webhook: ''
});
const users = ref([]);
const visiblePasswords = reactive({});
const newPasswords = reactive({});
const isAccountLoading = ref(false);
const accountStatusText = ref('');
const accountErrorText = ref('');
const isPushConfigLoading = ref(false);
const isPushLoading = ref(false);
const pushConfigStatusText = ref('');
const pushConfigErrorText = ref('');
const historyGroups = ref([]);
const isHistoryLoading = ref(false);
const historyErrorText = ref('');
const pickupAt = ref('');
const dropoffAt = ref('');
const holdUntilAt = ref('');
const balancePickupAt = ref('');
const balanceReceivedAt = ref('');
const receiptForm = ref(null);
const balanceFormRef = ref(null);
const statementFormRef = ref(null);
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
  fileDate: '',
  recordSaved: false,
  pushed: false,
  history: false,
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

const previewTitle = computed(() => {
  if (result.type === 'balance') return '尾款单预览';
  if (result.type === 'statement') return '对帐单预览';
  return '定金单预览';
});

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

  if (value === 'push') {
    if (!isAdministrator.value) {
      activePage.value = 'home';
      return;
    }
    loadPushConfig();
  }

  if (value === 'history') {
    loadHistoryImages();
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

function getStatementPayload() {
  return Object.fromEntries(
    Object.entries(statementForm).map(([key, value]) => [key, String(value ?? '').trim()])
  );
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
  clearStatementForm();
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

async function generateStatementReceipt() {
  const validationError = validateStatementFormValues();
  if (validationError) {
    errorText.value = validationError;
    statusText.value = '';
    return;
  }

  await renderWithSkill('/api/generate-statement', '正在生成图片。。。', getStatementPayload(), 'statement', statementFormRef.value);
}

function validateFormValues() {
  const errors = [];
  const chinesePattern = /[\u3400-\u9fff]/;
  const digitsOnlyPattern = /^\d+$/;

  if (String(form.orderId ?? '').trim() === '') {
    errors.push('订单编号不能为空');
  }

  if (chinesePattern.test(form.customerId)) {
    errors.push('客户编号不能包含中文');
  }

  if (chinesePattern.test(form.orderId)) {
    errors.push('订单编号不能包含中文');
  }

  if (String(form.depositAmount).trim() && !digitsOnlyPattern.test(String(form.depositAmount).trim())) {
    errors.push('定金金额只能是数字');
  }

  if (String(form.balanceAmount).trim() && !digitsOnlyPattern.test(String(form.balanceAmount).trim())) {
    errors.push('尾款金额只能是数字');
  }

  return errors.join('\n');
}

function validateBalanceFormValues() {
  const errors = [];
  const chinesePattern = /[\u3400-\u9fff]/;
  const moneyPattern = /^\d+(\.\d+)?$/;

  if (String(balanceForm.orderId ?? '').trim() === '') {
    errors.push('订单编号不能为空');
  }

  if (chinesePattern.test(balanceForm.customerId)) {
    errors.push('客户编号不能包含中文');
  }

  if (chinesePattern.test(balanceForm.orderId)) {
    errors.push('订单编号不能包含中文');
  }

  if (String(balanceForm.balanceAmount).trim() && !moneyPattern.test(String(balanceForm.balanceAmount).trim())) {
    errors.push('合计收款金额只能是数字，可有小数点');
  }

  return errors.join('\n');
}

function validateStatementFormValues() {
  const errors = [];
  const chinesePattern = /[\u3400-\u9fff]/;

  if (String(statementForm.orderId ?? '').trim() === '') {
    errors.push('订单编号不能为空');
  }

  if (chinesePattern.test(statementForm.orderId)) {
    errors.push('订单编号不能包含中文');
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
    result.fileDate = getHeaderValue(response, 'X-File-Date');
    result.recordSaved = false;
    result.pushed = false;
    result.history = false;
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
    if (!result.history) {
      if (result.type === 'statement') {
        await saveZdRecord();
      } else if (result.type === 'balance') {
        await saveWkdRecord();
      } else {
        await saveDjdRecord();
      }
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

async function loadPushConfig() {
  pushConfigErrorText.value = '';
  pushConfigStatusText.value = '';
  isPushConfigLoading.value = true;

  try {
    const response = await fetch('/api/push-config');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '读取推送配置失败');
    pushConfig.webhook = data.webhook || '';
  } catch (error) {
    pushConfigErrorText.value = error?.message || String(error);
  } finally {
    isPushConfigLoading.value = false;
  }
}

async function savePushConfig() {
  pushConfigErrorText.value = '';
  pushConfigStatusText.value = '';
  isPushConfigLoading.value = true;

  try {
    const response = await fetch('/api/push-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pushConfig)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '保存推送配置失败');
    pushConfigStatusText.value = '推送配置已保存';
  } catch (error) {
    pushConfigErrorText.value = error?.message || String(error);
  } finally {
    isPushConfigLoading.value = false;
  }
}

async function loadHistoryImages() {
  historyErrorText.value = '';
  isHistoryLoading.value = true;

  try {
    const response = await fetch('/api/history-images');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '读取历史图片失败');
    historyGroups.value = data.groups || [];
  } catch (error) {
    historyErrorText.value = error?.message || String(error);
  } finally {
    isHistoryLoading.value = false;
  }
}

function previewHistoryImage(image) {
  revokePreviewObjectUrl();
  result.imageUrl = image.apiUrl || image.url;
  result.webpName = image.name;
  result.fileDate = `${image.label}/${image.date}`;
  result.recordSaved = true;
  result.pushed = false;
  result.history = true;
  result.type = image.type;
  statusText.value = '';
  errorText.value = '';
  resetView();
  isPreviewOpen.value = true;
}

async function pushCurrentImage() {
  if (!result.webpName || !result.fileDate) {
    errorText.value = '请先生成图片后再推送';
    return;
  }

  isPushLoading.value = true;
  errorText.value = '';
  statusText.value = '正在推送图片...';

  try {
    if (result.type === 'statement') {
      await saveZdRecord();
    } else if (result.type === 'balance') {
      await saveWkdRecord();
    } else {
      await saveDjdRecord();
    }

    const response = await fetch('/api/push-wecom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: result.webpName,
        fileDate: result.fileDate
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '推送失败');
    result.pushed = true;
    statusText.value = '已推送到企业微信群';
  } catch (error) {
    errorText.value = error?.message || String(error);
    statusText.value = '';
  } finally {
    isPushLoading.value = false;
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
  pushConfig.webhook = '';
  pushConfigStatusText.value = '';
  pushConfigErrorText.value = '';
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

async function saveZdRecord() {
  const response = await fetch('/api/zd-record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...getStatementPayload(),
      createUser: currentUser.value?.username || ''
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '记录对帐单失败');
  }
}

function getFilenameFromResponse(response) {
  const raw = response.headers.get('X-Filename');
  return raw ? decodeURIComponent(raw) : '';
}

function getHeaderValue(response, name) {
  const raw = response.headers.get(name);
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
  result.fileDate = '';
  result.recordSaved = false;
  result.pushed = false;
  result.history = false;
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
  result.fileDate = '';
  result.recordSaved = false;
  result.pushed = false;
  result.history = false;
  result.type = 'balance';
  statusText.value = '';
  errorText.value = '';
  progress.value = 0;
  stopProgress();
  isPreviewOpen.value = false;
  resetView();
}

function clearStatementForm() {
  for (const key of Object.keys(statementForm)) {
    statementForm[key] = key.startsWith('check') ? '无' : '';
  }
  revokePreviewObjectUrl();
  result.imageUrl = '';
  result.webpName = '';
  result.fileDate = '';
  result.recordSaved = false;
  result.pushed = false;
  result.history = false;
  result.type = 'statement';
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

function formatFileSize(size) {
  const value = Number(size || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function permissionLabel(permission) {
  return permission === 'administrator' ? '管理员' : '工作人员';
}
</script>
