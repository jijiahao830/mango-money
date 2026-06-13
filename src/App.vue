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
            @click="navigatePage('home')"
          >
            首页
          </button>
          <button
            class="nav-button"
            :class="{ active: activePage === 'middle' }"
            type="button"
            @click="navigatePage('middle')"
          >
            中台
          </button>
          <button
            class="nav-button"
            :class="{ active: activePage === 'deposit' }"
            type="button"
            @click="navigatePage('deposit')"
          >
            定金单
          </button>
          <button
            class="nav-button"
            :class="{ active: activePage === 'balance' }"
            type="button"
            @click="navigatePage('balance')"
          >
            尾款单
          </button>
          <button
            class="nav-button"
            :class="{ active: activePage === 'statement' }"
            type="button"
            @click="navigatePage('statement')"
          >
            对帐单
          </button>
          <button
            class="nav-button"
            :class="{ active: activePage === 'history' }"
            type="button"
            @click="navigatePage('history')"
          >
            历史图片
          </button>
          <button
            v-if="isAdministrator"
            class="nav-button"
            :class="{ active: activePage === 'push' }"
            type="button"
            @click="navigatePage('push')"
          >
            推送
          </button>
          <button
            v-if="isAdministrator"
            class="nav-button"
            :class="{ active: activePage === 'accounts' }"
            type="button"
            @click="navigatePage('accounts')"
          >
            账号管理
          </button>
          <button
            v-if="isAdministrator"
            class="nav-button"
            :class="{ active: activePage === 'tableManagement' }"
            type="button"
            @click="navigatePage('tableManagement')"
          >
            表格管理
          </button>
        </div>

        <div class="nav-user">
          <span>当前登录：<strong>{{ currentDisplayName }}</strong></span>
          <button class="secondary nav-logout" type="button" :disabled="isLoading" @click="logout">退出登录</button>
        </div>
      </nav>

      <section v-if="activePage === 'home'" class="workspace-page">
        <div v-if="isAdministrator" class="account-page">
          <header class="section-title-row">
            <div>
              <h1>系统健康</h1>
              <p>检查当前财务系统运行环境和核心配置。</p>
            </div>
            <button class="secondary refresh-button" type="button" :disabled="isHealthLoading" @click="loadHealthStatus">
              刷新
            </button>
          </header>

          <section class="card account-create-card">
            <div v-if="isHealthLoading" class="empty-text">正在检查系统状态...</div>
            <div v-else-if="healthStatus" class="health-panel">
              <div class="health-summary">
                <span class="health-dot" :class="{ ok: healthStatus.ok, bad: !healthStatus.ok }"></span>
                <strong>{{ healthStatus.ok ? '系统正常' : '系统存在异常' }}</strong>
                <span>{{ healthStatus.service }} · {{ healthStatus.host }}:{{ healthStatus.port }}</span>
              </div>

              <div class="health-grid">
                <article v-for="item in healthItems" :key="item.key" class="health-item">
                  <div>
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.detail }}</span>
                  </div>
                  <span class="health-status" :class="{ ok: item.ok, warn: item.warn, bad: !item.ok && !item.warn }">
                    {{ item.status }}
                  </span>
                </article>
              </div>
            </div>
            <p v-else class="empty-text">暂无健康检查结果</p>
          </section>

          <p v-if="healthErrorText" class="error-text">{{ healthErrorText }}</p>
        </div>
      </section>

      <section v-else-if="activePage === 'middle'" class="middle-platform-page">
        <aside class="middle-sidebar" :style="middleSidebarStyle" aria-label="中台表列表">
          <label class="table-sidebar-search">
            <span>搜索表格</span>
            <input v-model="middleTableSearchText" placeholder="输入表名或显示名" />
          </label>
          <div class="sidebar-scroll-list">
            <button
              v-for="table in filteredMiddleTables"
              :key="table.key"
              class="middle-table-tab"
              :class="{ active: activeMiddleTable === table.key }"
              type="button"
              @click="selectMiddleTable(table.key)"
            >
              <span>{{ table.label }}</span>
            </button>
          </div>
        </aside>

        <section ref="middleContentRef" class="middle-content">
          <header class="middle-toolbar">
            <div>
              <h1>{{ selectedMiddleTable?.label || '中台' }}</h1>
              <p v-if="selectedMiddleTable">
                数据表：{{ selectedMiddleTable.databaseName }} · 共 {{ selectedMiddleTable.rows.length }} 条
              </p>
            </div>
            <div class="middle-toolbar-actions">
              <button class="secondary refresh-button" type="button" :disabled="isMiddleLoading" @click="loadMiddlePlatform">
                刷新
              </button>
              <button type="button" :disabled="isMiddleSaving || !middleDirtyCount" @click="saveMiddleTableChanges">
                {{ isMiddleSaving ? '保存中' : `保存${middleDirtyCount ? `（${middleDirtyCount}）` : ''}` }}
              </button>
            </div>
          </header>

          <div v-if="isMiddleLoading" class="card account-create-card">
            <p class="empty-text">正在读取中台数据...</p>
          </div>

          <p v-else-if="middleErrorText" class="error-text">{{ middleErrorText }}</p>

          <template v-else-if="selectedMiddleTable">
            <section class="middle-controls" aria-label="表格筛选">
              <label>
                <span>搜索</span>
                <input v-model="middleSearchText" placeholder="输入关键词" />
              </label>
              <label>
                <span>筛选字段</span>
                <select v-model="middleFilterField">
                  <option value="">不筛选</option>
                  <option v-for="column in middleFilterColumns" :key="column.key" :value="column.key">
                    {{ column.label }}
                  </option>
                </select>
              </label>
              <label class="middle-filter-value-control">
                <span>筛选值</span>
                <template v-if="isMiddleMultiFilter">
                  <button
                    class="middle-filter-value-button"
                    type="button"
                    :disabled="!middleFilterField"
                    @click="openMiddleMultiFilter"
                  >
                    {{ middleMultiFilterButtonText }}
                  </button>
                  <div v-if="isMiddleMultiFilterOpen" class="middle-filter-popover">
                    <header>
                      <strong>{{ middleFilterColumn?.label || '筛选值' }}</strong>
                      <button type="button" class="middle-filter-close" @click="closeMiddleMultiFilter">关闭</button>
                    </header>
                    <div class="middle-filter-option-list">
                      <label v-for="option in middleFilterOptions" :key="option" class="middle-filter-option">
                        <input v-model="middleFilterDraftValues" type="checkbox" :value="option" />
                        <span>{{ option }}</span>
                      </label>
                    </div>
                  </div>
                </template>
                <select v-else v-model="middleFilterValue" :disabled="!middleFilterField">
                  <option v-if="!middleFilterField" value="">请先选择筛选字段</option>
                  <option value="">全部</option>
                  <option v-for="option in middleFilterOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </label>
              <button class="secondary middle-reset-button" type="button" @click="clearMiddleFilters">清空筛选</button>
            </section>

            <div class="middle-table-summary">
              <strong>当前显示 {{ selectedMiddleRows.length }} 条</strong>
              <span>筛选不会修改数据库，只影响当前看板显示。</span>
            </div>

            <div ref="middleTableWrapRef" class="middle-table-wrap">
              <table class="middle-data-table">
                <thead>
                  <tr>
                    <th class="row-index">ID</th>
                    <th v-for="column in selectedMiddleDisplayColumns" :key="column.key">
                      {{ column.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, rowIndex) in pagedMiddleRows"
                    :key="getMiddleRowRenderKey(row, rowIndex)"
                    :data-row-key="getMiddleRowRenderKey(row, rowIndex)"
                    :class="{ selected: middleSelectedRowKey === getMiddleRowRenderKey(row, rowIndex), pendingDelete: row.__pendingDelete }"
                    @click="selectMiddleRow(row, rowIndex)"
                  >
	                    <td class="row-index">{{ getMiddleRowPrimaryValue(row) || rowIndex + 1 }}</td>
	                    <td v-for="column in selectedMiddleDisplayColumns" :key="column.key">
		                      <input
		                        v-if="isMiddleFormulaColumn(column) && column.isEditable"
		                        class="middle-cell-input"
		                        :class="{ changed: isMiddleCellDirty(row, column.key), calculated: isMiddleFormulaCalculated(row, column) }"
		                        :type="middleInputType(column)"
		                        :value="getMiddleDisplayCellValue(row, column)"
		                        @input="updateMiddleFormulaCell(row, column, $event.target.value)"
		                      />
		                      <span
		                        v-else-if="isMiddleFormulaColumn(column)"
		                        class="middle-formula-value"
		                        :class="{ calculated: isMiddleFormulaCalculated(row, column) }"
		                      >
		                        {{ formatMiddleValue(column.key, getMiddleDisplayCellValue(row, column)) }}
		                      </span>
	                      <div
	                        v-else-if="column.isEditable && isMiddleMultiSelectColumn(column)"
	                        class="middle-cell-multi-wrap"
	                      >
                        <button
                          class="middle-cell-input middle-cell-multi-button"
                          :class="{ changed: isMiddleCellDirty(row, column.key) }"
                          type="button"
                          @click.stop="openMiddleCellMultiSelect(row, rowIndex, column, $event)"
                        >
                          <span>{{ formatMiddleMultiCellValue(row[column.key]) || '空' }}</span>
                        </button>
                        <div
                          v-if="isMiddleCellMultiSelectOpen(row, rowIndex, column)"
                          class="middle-filter-popover middle-cell-popover"
                          @click.stop
                        >
                          <header>
                            <strong>{{ column.label }}</strong>
                            <div class="middle-cell-popover-actions">
                              <button type="button" class="middle-filter-close" @click="saveMiddleCellMultiSelect">
                                保存
                              </button>
                              <button type="button" class="middle-filter-close" @click="closeMiddleCellMultiSelect">
                                关闭
                              </button>
                            </div>
                          </header>
                          <div class="middle-filter-option-list">
                            <label v-for="option in column.selectOptions" :key="option" class="middle-filter-option">
                              <input v-model="middleCellMultiDraftValues" type="checkbox" :value="option" />
                              <span>{{ option }}</span>
                            </label>
                          </div>
	                        </div>
                      </div>
                      <button
                        v-else-if="isMiddleFileLikeColumn(column)"
                        class="middle-cell-input middle-file-cell-button"
                        :class="{ changed: isMiddleCellDirty(row, column.key) }"
                        type="button"
                        @click.stop="openMiddleFileCellModal(row, rowIndex, column)"
                      >
                        {{ getMiddleFileCellText(row, column) }}
                      </button>
	                      <select
	                        v-else-if="column.isEditable && isMiddleSingleSelectColumn(column)"
	                        v-model="row[column.key]"
	                        class="middle-cell-input"
	                        :class="{ changed: isMiddleCellDirty(row, column.key) }"
	                        @change="markMiddleCellDirty(row, column.key)"
	                      >
	                        <option value="">空</option>
	                        <option v-for="option in getMiddleSingleSelectOptions(column)" :key="option" :value="option">{{ option }}</option>
	                      </select>
                      <input
                        v-else-if="column.isEditable"
                        v-model="row[column.key]"
                        class="middle-cell-input"
                        :class="{ changed: isMiddleCellDirty(row, column.key) }"
                        :type="middleInputType(column)"
                        @input="markMiddleCellDirty(row, column.key)"
                      />
                      <span
                        v-else-if="isMiddleTagColumn(column.key) && row[column.key]"
                        class="middle-tag"
                        :class="middleTagClass(column.key, row[column.key])"
                      >
                        {{ formatMiddleValue(column.key, row[column.key]) }}
                      </span>
                      <span v-else>{{ formatMiddleValue(column.key, row[column.key]) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="middle-row-tools" aria-label="行操作">
                <button class="middle-row-tool" type="button" title="添加一行" @click="addMiddleRow">+</button>
                <button class="middle-row-tool" type="button" title="删除一行" @click="removeMiddleRow">−</button>
                <div class="middle-pagination" aria-label="分页">
                  <button class="middle-page-arrow" type="button" :disabled="middleCurrentPage <= 1" @click="goMiddlePage(-1)">←</button>
                  <input
                    v-model="middlePageInput"
                    class="middle-page-input"
                    :aria-label="`当前第 ${middleCurrentPage} 页，共 ${middleTotalPages} 页`"
                    @focus="middlePageInput = String(middleCurrentPage)"
                    @keydown.enter.prevent="jumpMiddlePage"
                    @blur="middlePageInput = middlePageLabel"
                  />
                  <span class="middle-page-total">/ {{ middleTotalPages }}</span>
                  <button class="middle-page-arrow" type="button" :disabled="middleCurrentPage >= middleTotalPages" @click="goMiddlePage(1)">→</button>
                </div>
              </div>
              <p v-if="!selectedMiddleRows.length" class="empty-text middle-empty">没有符合筛选条件的数据</p>
            </div>
            <p v-if="middleSaveStatusText" class="status-text">{{ middleSaveStatusText }}</p>
          </template>

          <p v-else class="empty-text">暂无中台表数据</p>
        </section>
      </section>

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
              <label><span>出车时间</span><input v-model="statementForm.startAt" type="datetime-local" /></label>
              <label><span>回车时间</span><input v-model="statementForm.returnAt" type="datetime-local" /></label>
            </div>
            <div class="row">
              <label><span>用车天数（只需要输入数字，系统会自动补充单位：天）</span><input v-model="statementForm.useDays" inputmode="decimal" /></label>
              <label><span>出车公里（只需要输入数字，系统会自动补充单位：km）</span><input v-model="statementForm.startMileage" inputmode="decimal" /></label>
            </div>
            <div class="row">
              <label><span>回车公里（只需要输入数字，系统会自动补充单位：km）</span><input v-model="statementForm.returnMileage" inputmode="decimal" /></label>
              <label><span>实际公里（只需要输入数字，系统会自动补充单位：km）</span><input v-model="statementForm.actualMileage" inputmode="decimal" /></label>
            </div>
            <div class="row">
              <label><span>出车油量（只需要输入数字，系统会自动补充单位：%）</span><input v-model="statementForm.startFuel" inputmode="decimal" /></label>
              <label><span>回车油量（只需要输入数字，系统会自动补充单位：%）</span><input v-model="statementForm.returnFuel" inputmode="decimal" /></label>
              <label><span>补油量（只需要输入数字，系统会自动补充单位：%）</span><input v-model="statementForm.refuelAmount" inputmode="decimal" /></label>
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
              <div class="history-title">
                <h2>{{ group.label }}</h2>
                <label class="history-date-picker">
                  <span>选择日期</span>
                  <input
                    v-model="historyDateFilters[group.type]"
                    type="date"
                    @change="openHistoryDate(group.type)"
                  />
                </label>
              </div>
              <span class="count-badge">{{ group.count }} 张</span>
            </header>

            <div v-if="getVisibleHistoryDateGroups(group).length" class="history-date-list">
              <details
                v-for="dateGroup in getVisibleHistoryDateGroups(group)"
                :key="`${group.type}-${dateGroup.date}`"
                class="history-date-group"
                :open="isHistoryDateOpen(group.type, dateGroup.date)"
                @toggle="syncHistoryDateOpen(group.type, dateGroup.date, $event)"
              >
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
                <span>部门</span>
                <input v-model="accountForm.department" placeholder="例如：财务部" />
              </label>

              <label>
                <span>联系方式</span>
                <input v-model="accountForm.contact" placeholder="可选" />
              </label>

              <label>
                <span>权限</span>
                <select v-model="accountForm.permission">
                  <option v-for="option in permissionOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
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
                <template v-if="user.department"> · 部门：{{ user.department }}</template>
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

      <section v-else-if="activePage === 'tableManagement'" class="account-page">
        <header class="section-title-row">
          <div>
            <h1>表格管理</h1>
            <p>配置哪些数据库表显示在中台，以及每张表显示哪些字段。</p>
          </div>
          <button class="secondary refresh-button" type="button" :disabled="isTableConfigLoading" @click="loadTableManagement">
            刷新
          </button>
        </header>

        <div v-if="isTableConfigLoading" class="card account-create-card">
          <p class="empty-text">正在读取表格配置...</p>
        </div>

        <div v-else class="table-management-layout">
          <aside class="table-management-sidebar">
            <label class="table-sidebar-search">
              <span>搜索表格</span>
              <input v-model="tableConfigSearchText" placeholder="输入表名或显示名" />
            </label>
            <div class="sidebar-scroll-list">
              <button
                v-for="table in filteredTableConfigItems"
                :key="table.tableName"
                class="middle-table-tab"
                :class="{ active: activeTableConfigName === table.tableName }"
                type="button"
                @click="selectTableConfig(table.tableName)"
              >
                <span>{{ table.tableLabel || table.tableName }}</span>
                <strong v-if="table.isVisible">显示</strong>
              </button>
              <button
                class="middle-table-tab table-directory-tab"
                type="button"
                @click="toggleTableConfigDirectory"
              >
                <span>{{ tableConfigDirectoryLabel }}</span>
                <strong>{{ tableConfigDirectoryCount }}</strong>
              </button>
            </div>
          </aside>

          <section v-if="selectedTableConfig" class="card table-management-panel">
            <header class="table-config-header">
              <div>
                <h2>
                  <span>{{ selectedTableConfig.tableLabel || selectedTableConfig.tableName }}</span>
                  <button class="secondary field-config-button" type="button" @click="openTablePropertyConfig(selectedTableConfig)">
                    配置
                  </button>
                </h2>
                <p>{{ selectedTableConfig.tableName }} · {{ selectedTableConfigVisibleColumns.length }} 个字段</p>
              </div>
              <label class="toggle-line">
                <input v-model="selectedTableConfig.isVisible" type="checkbox" />
                <span>在中台显示</span>
              </label>
            </header>

            <div class="row">
              <label>
                <span>中台显示名称</span>
                <input v-model="selectedTableConfig.tableLabel" />
              </label>
              <label>
                <span>显示排序（数字越小，表格越靠前，0最小）</span>
                <input v-model.number="selectedTableConfig.sortOrder" type="number" min="0" />
              </label>
            </div>

            <div class="field-picker-header">
              <strong>显示字段</strong>
              <div class="field-picker-actions">
                <button class="secondary tool-button" type="button" @click="selectAllTableFields(selectedTableConfig)">全选</button>
                <button class="secondary tool-button" type="button" @click="clearTableFields(selectedTableConfig)">清空</button>
              </div>
            </div>

            <div class="field-picker-grid">
              <label v-for="column in selectedTableConfigVisibleColumns" :key="column.key" class="field-check">
                <input
                  :checked="selectedTableConfig.visibleFields.includes(column.key)"
                  type="checkbox"
                  @change="toggleTableField(selectedTableConfig, column.key)"
                />
	                <span class="field-check-body">
		                  <span class="field-check-title">{{ column.label }}</span>
		                  <small>
		                    {{ column.key }}
	                    <button
	                      v-if="shouldShowFieldKindTag(column)"
	                      class="field-kind-tag"
	                      type="button"
	                      @click.prevent.stop="openFieldKindMenu(selectedTableConfig, column, $event)"
	                    >
	                      {{ getFieldKindLabel(column) }}
	                    </button>
		                  </small>
	                </span>
	                <span class="field-check-actions">
		                  <button
		                    v-if="shouldShowFormulaButton(column)"
		                    class="secondary field-config-button"
		                    type="button"
		                    @click.prevent.stop="openFormulaConfig(selectedTableConfig, column)"
		                  >
		                    公式
		                  </button>
		                  <button
		                    v-if="shouldShowFieldOptionButton(column)"
		                    class="secondary field-config-button"
	                    type="button"
	                    @click.prevent.stop="openFieldOptionConfig(selectedTableConfig, column)"
	                  >
	                    配置
	                  </button>
	                </span>
	              </label>
            </div>

            <div class="form-actions">
              <button type="button" :disabled="isTableConfigSaving" @click="saveTableManagement">
                {{ isTableConfigSaving ? '保存中' : '保存配置' }}
              </button>
            </div>
          </section>

          <p v-else class="empty-text">暂无可配置表</p>
        </div>

        <p v-if="tableConfigStatusText" class="status-text">{{ tableConfigStatusText }}</p>
        <p v-if="tableConfigErrorText" class="error-text">{{ tableConfigErrorText }}</p>
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

	  <div
	    v-if="fieldKindMenu.isOpen"
	    class="field-kind-menu"
	    :style="fieldKindMenuStyle"
	    @click.stop
	  >
	    <button
	      v-for="option in fieldKindOptions"
	      :key="option.value"
	      type="button"
	      :class="{ active: option.value === fieldKindMenu.currentKind }"
	      @click="selectFieldKind(option.value)"
	    >
	      <span>{{ option.value === fieldKindMenu.currentKind ? '✓' : '' }}</span>
	      {{ option.label }}
	    </button>
	  </div>

	  <div v-if="tablePropertyConfig.isOpen" class="modal-backdrop confirm-backdrop">
	    <section class="confirm-modal table-property-modal" role="dialog" aria-modal="true">
	      <header class="modal-header">
	        <div>
	          <h2>{{ tablePropertyConfig.tableLabel }}</h2>
	          <p>{{ tablePropertyConfig.tableName }} · 表配置</p>
	        </div>
	        <button class="secondary tool-button" type="button" @click="closeTablePropertyConfig">关闭</button>
	      </header>

	      <section class="table-property-section">
	        <div class="table-property-section-title">
	          <strong>部门可见配置</strong>
	        </div>
	        <div class="department-choice-list">
	          <label v-for="department in tableDepartmentOptions" :key="department" class="department-choice">
	            <input
	              type="checkbox"
	              :checked="tablePropertyConfig.visibleDepartments.includes(department)"
	              @change="toggleTableVisibleDepartment(department)"
	            />
	            <span>{{ department }}</span>
	          </label>
	        </div>
	      </section>

	      <section class="table-property-section">
	        <div class="table-property-section-title">
	          <strong>字段属性配置</strong>
	        </div>
	        <div class="field-property-list">
	          <div v-for="column in tablePropertyColumns" :key="column.key" class="field-property-row">
	            <div class="field-property-name">
	              <strong>{{ column.label }}</strong>
	              <small>{{ column.key }}</small>
	            </div>
	            <div class="field-property-tag-options">
	              <label>
	                <input v-model="getTableFieldProperty(column).tagged" type="radio" :value="false" />
	                <span>无标签</span>
	              </label>
	              <label>
	                <input v-model="getTableFieldProperty(column).tagged" type="radio" :value="true" />
	                <span>有标签</span>
	              </label>
	            </div>
	          </div>
	        </div>
	      </section>

	      <footer class="modal-footer">
	        <button class="secondary" type="button" @click="resetTablePropertyConfig">重置</button>
	        <button type="button" @click="applyTablePropertyConfig">确定</button>
	      </footer>
	    </section>
	  </div>

	  <div v-if="middleFileModal.isOpen" class="modal-backdrop confirm-backdrop middle-file-modal-backdrop">
	    <section class="confirm-modal middle-file-modal" role="dialog" aria-modal="true">
	      <header class="modal-header">
	        <div>
	          <h2>{{ middleFileModal.columnLabel }}</h2>
	          <p>{{ middleFileModal.tableLabel }} · {{ middleFileModal.kindLabel }}</p>
	        </div>
	        <button class="secondary tool-button middle-file-close-button" type="button" @click="closeMiddleFileCellModal">关闭</button>
	      </header>

	      <input
	        ref="middleFileInputRef"
	        class="middle-file-hidden-input"
	        type="file"
	        :accept="middleFileModal.accept"
	        :multiple="true"
	        @change="handleMiddleFileUpload"
	      />

	      <div class="middle-file-list">
	        <button
	          v-for="(file, index) in middleFileModal.files"
	          :key="`${file.name || 'file'}-${index}`"
	          class="middle-file-item"
	          :class="{ active: middleFileModal.selectedIndex === index }"
	          type="button"
	          @click="selectMiddleFileItem(file, index)"
	        >
	          <span v-if="isMiddleImageFile(file)" class="middle-file-thumb">
	            <img :src="file.dataUrl || file.url" :alt="file.name || '图片'" />
	          </span>
	          <span v-else class="middle-file-icon">FILE</span>
	          <span class="middle-file-info">
	            <strong>{{ file.name || '未命名文件' }}</strong>
	            <small>{{ formatMiddleFileSize(file.size) }}</small>
	          </span>
	        </button>
	        <p v-if="!middleFileModal.files.length" class="empty-text middle-file-empty">暂无文件</p>
	      </div>

	      <p v-if="middleFileModal.errorText" class="error-text">{{ middleFileModal.errorText }}</p>

	      <div class="modal-footer middle-file-footer">
	        <button type="button" :disabled="!middleFileModal.isEditable" @click="triggerMiddleFileUpload">上传</button>
	        <button class="secondary" type="button" :disabled="!middleFileModal.files.length" @click="downloadSelectedMiddleFile">下载</button>
	        <button class="secondary" type="button" :disabled="!middleFileModal.isEditable || middleFileModal.selectedIndex < 0" @click="deleteSelectedMiddleFile">删除</button>
	        <button type="button" :disabled="!middleFileModal.isEditable" @click="saveMiddleFileCellModal">保存</button>
	      </div>
	    </section>
	  </div>

	  <div v-if="middleFilePreviewModal.isOpen" class="modal-backdrop middle-file-preview-backdrop">
	    <section class="confirm-modal middle-file-preview-modal" role="dialog" aria-modal="true">
	      <header class="modal-header">
	        <h2>{{ middleFilePreviewModal.title }}</h2>
	        <button class="icon-button" type="button" aria-label="关闭文件预览" @click="closeMiddleFilePreview">×</button>
	      </header>

	      <div class="middle-file-preview-stage">
	        <div
	          v-if="middleFilePreviewModal.previewKind === 'excel' && middleFilePreviewModal.excelRows.length"
	          class="middle-excel-preview"
	        >
	          <table>
	            <tbody>
	              <tr v-for="(row, rowIndex) in middleFilePreviewModal.excelRows" :key="rowIndex">
	                <td
	                  v-for="(cell, cellIndex) in row"
	                  :key="`${rowIndex}-${cellIndex}`"
	                  :class="{ header: rowIndex === 0 }"
	                >
	                  {{ cell }}
	                </td>
	              </tr>
	            </tbody>
	          </table>
	        </div>
	        <iframe
	          v-else-if="middleFilePreviewModal.canPreview && middleFilePreviewModal.url"
	          :src="middleFilePreviewModal.url"
	          :title="middleFilePreviewModal.title"
	        ></iframe>
	        <div v-else class="middle-file-preview-empty">
	          <strong>{{ middleFilePreviewModal.errorText || '当前文件类型暂不支持在线预览' }}</strong>
	          <span v-if="middleFilePreviewModal.url">请下载后查看原文件。</span>
	          <span v-else>当前文件没有可预览地址。</span>
	        </div>
	      </div>

	      <footer class="modal-footer middle-file-footer">
	        <button class="download-button" type="button" @click="downloadMiddleFilePreview">下载文件</button>
	      </footer>
	    </section>
	  </div>

	  <div v-if="fieldOptionConfig.isOpen" class="modal-backdrop confirm-backdrop" @click.self="closeFieldOptionConfig">
	    <section class="confirm-modal field-option-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div>
          <h2>{{ fieldOptionConfig.columnLabel }}</h2>
          <p>{{ fieldOptionConfig.tableLabel }} · {{ fieldOptionConfig.typeLabel }}</p>
        </div>
        <button class="secondary tool-button" type="button" @click="closeFieldOptionConfig">关闭</button>
      </header>

	      <div class="field-option-mode">
	        <label>
	          <input v-model="fieldOptionConfig.mode" type="radio" value="static" />
	          <span>固定选项</span>
	        </label>
	        <label>
	          <input v-model="fieldOptionConfig.mode" type="radio" value="table" />
	          <span>从数据表读取</span>
	        </label>
	        <label>
	          <input v-model="fieldOptionConfig.mode" type="radio" value="lookup" />
	          <span>根据数据表获取</span>
	        </label>
	      </div>

	      <label v-if="fieldOptionConfig.mode === 'static'" class="field-option-editor">
	        <span>选项值（一行一个）</span>
	        <textarea v-model="fieldOptionConfig.optionText" rows="10" placeholder="每行填写一个选项"></textarea>
	      </label>

	      <div v-else-if="fieldOptionConfig.mode === 'table'" class="field-option-table-source">
	        <label>
	          <span>来源表</span>
	          <select v-model="fieldOptionConfig.sourceTableName">
	            <option value="">选择表</option>
	            <option
	              v-for="table in fieldOptionSourceTables"
	              :key="table.tableName"
	              :value="table.tableName"
	            >
	              {{ table.tableLabel || table.tableName }}
	            </option>
	          </select>
	        </label>
	        <label>
	          <span>来源字段</span>
	          <select v-model="fieldOptionConfig.sourceColumnName" :disabled="!fieldOptionConfig.sourceTableName">
	            <option value="">选择字段</option>
	            <option
	              v-for="column in fieldOptionSourceColumns"
	              :key="column.key"
	              :value="column.key"
	            >
	              {{ column.label }}（{{ column.key }}）
	            </option>
	          </select>
	        </label>
	      </div>

	      <div v-else class="field-lookup-config">
	        <div class="formula-builder-grid">
	          <label>
	            <span>要引用的表</span>
	            <select v-model="fieldOptionConfig.lookupSourceTableName">
	              <option value="">选择表</option>
	              <option
	                v-for="table in fieldOptionSourceTables"
	                :key="table.tableName"
	                :value="table.tableName"
	              >
	                {{ table.tableLabel || table.tableName }}
	              </option>
	            </select>
	          </label>
	          <label>
	            <span>要引用的字段</span>
	            <select v-model="fieldOptionConfig.lookupResultColumnName" :disabled="!fieldOptionConfig.lookupSourceTableName">
	              <option value="">选择字段</option>
	              <option
	                v-for="column in fieldOptionLookupSourceColumns"
	                :key="column.key"
	                :value="column.key"
	              >
	                {{ column.label }}（{{ column.key }}）
	              </option>
	            </select>
	          </label>
	        </div>

	        <div class="lookup-condition-panel">
	          <div class="lookup-condition-header">
	            <span>按条件查找</span>
	            <strong>满足以下条件</strong>
	          </div>
	          <div
	            v-for="(condition, index) in fieldOptionConfig.lookupConditions"
	            :key="condition.id"
	            class="formula-builder-grid lookup-condition-grid"
	            :class="{ 'no-current-field': !isLookupConditionNeedsCurrentField(condition) }"
	          >
	            <label>
	              <span>来源表字段</span>
	              <select v-model="condition.sourceMatchColumnName" :disabled="!fieldOptionConfig.lookupSourceTableName">
	                <option value="">选择字段</option>
	                <option
	                  v-for="column in fieldOptionLookupSourceColumns"
	                  :key="column.key"
	                  :value="column.key"
	                >
	                  {{ column.label }}（{{ column.key }}）
	                </option>
	              </select>
	            </label>
	            <label>
	              <span>条件</span>
	              <select v-model="condition.conditionOperator" @change="handleLookupConditionOperatorChange(condition)">
	                <option
	                  v-for="option in fieldLookupConditionOptions"
	                  :key="option.value"
	                  :value="option.value"
	                >
	                  {{ option.label }}
	                </option>
	              </select>
	            </label>
	            <label v-if="isLookupConditionNeedsCurrentField(condition)">
	              <span>本表字段</span>
	              <select v-model="condition.currentMatchColumnName">
	                <option value="">选择字段</option>
	                <option
	                  v-for="column in fieldOptionCurrentColumns"
	                  :key="column.key"
	                  :value="column.key"
	                >
	                  {{ column.label }}（{{ column.key }}）
	                </option>
	              </select>
	            </label>
	            <button
	              class="secondary tool-button lookup-remove-button"
	              type="button"
	              :disabled="fieldOptionConfig.lookupConditions.length <= 1"
	              @click="removeLookupCondition(index)"
	            >
	              删除
	            </button>
	          </div>
	          <button class="secondary lookup-add-button" type="button" @click="addLookupCondition">
	            + 添加条件
	          </button>
	        </div>

	        <label class="field-option-editor">
	          <span>统计方式</span>
	          <select v-model="fieldOptionConfig.lookupAggregate">
	            <option
	              v-for="option in fieldLookupAggregateOptions"
	              :key="option.value"
	              :value="option.value"
	            >
	              {{ option.label }}
	            </option>
	          </select>
	        </label>
	      </div>

      <div class="modal-footer">
        <button type="button" @click="applyFieldOptionConfig">保存字段配置</button>
        <button class="secondary" type="button" @click="resetFieldOptionConfig">恢复当前值</button>
      </div>
	    </section>
	  </div>

	  <div v-if="formulaConfig.isOpen" class="modal-backdrop confirm-backdrop" @click.self="closeFormulaConfig">
	    <section class="confirm-modal field-option-modal formula-config-modal" role="dialog" aria-modal="true">
	      <header class="modal-header">
	        <div>
	          <h2>{{ formulaConfig.columnLabel }}</h2>
	          <p>{{ formulaConfig.tableLabel }} · 公式字段</p>
	        </div>
	        <button class="secondary tool-button" type="button" @click="closeFormulaConfig">关闭</button>
	      </header>

	      <div class="formula-builder-grid">
	        <label>
	          <span>本表字段</span>
	          <select v-model="formulaConfig.currentFieldKey">
	            <option value="">选择本表字段</option>
	            <option
	              v-for="column in formulaCurrentColumns"
	              :key="column.key"
	              :value="column.key"
	            >
	              {{ column.label }}（{{ column.key }}）
	            </option>
	          </select>
	        </label>
	        <button class="secondary tool-button formula-insert-button" type="button" @click="insertCurrentFormulaField">
	          插入
	        </button>
	      </div>

	      <div class="formula-builder-grid formula-builder-grid-wide">
	        <label>
	          <span>其他表</span>
	          <select v-model="formulaConfig.foreignTableName">
	            <option value="">选择表</option>
	            <option
	              v-for="table in formulaForeignTables"
	              :key="table.tableName"
	              :value="table.tableName"
	            >
	              {{ table.tableLabel || table.tableName }}
	            </option>
	          </select>
	        </label>
	        <label>
	          <span>字段</span>
	          <select v-model="formulaConfig.foreignColumnKey" :disabled="!formulaConfig.foreignTableName">
	            <option value="">选择字段</option>
	            <option
	              v-for="column in formulaForeignColumns"
	              :key="column.key"
	              :value="column.key"
	            >
	              {{ column.label }}（{{ column.key }}）
	            </option>
	          </select>
	        </label>
	        <label>
	          <span>取值方式</span>
	          <select v-model="formulaConfig.aggregate">
	            <option value="sum">合计</option>
	            <option value="avg">平均</option>
	            <option value="count">数量</option>
	            <option value="max">最大</option>
	            <option value="min">最小</option>
	            <option value="first">最新一条</option>
	          </select>
	        </label>
	        <button class="secondary tool-button formula-insert-button" type="button" @click="insertForeignFormulaField">
	          插入
	        </button>
	      </div>

	      <label class="field-option-editor">
	        <span>公式表达式</span>
	        <textarea
	          v-model="formulaConfig.expression"
	          rows="8"
	          placeholder="{this.amount} - {this.cost} + {cw_srmxb.je.sum}"
	        ></textarea>
	      </label>

	      <div class="formula-help">
	        <span>支持数字、括号、加减乘除。</span>
	        <span>本表字段格式：{this.字段名}</span>
	        <span>其他表字段格式：{表名.字段名.取值方式}</span>
	        <span>可粘贴企业微信公式后转换。</span>
	      </div>

	      <div class="modal-footer">
	        <button class="secondary" type="button" @click="convertCurrentWecomFormula">转换企业微信公式</button>
	        <button type="button" @click="applyFormulaConfig">保存公式配置</button>
	        <button class="secondary" type="button" @click="resetFormulaConfig">恢复当前值</button>
	        <button class="secondary" type="button" @click="clearFormulaConfig">清除公式</button>
	      </div>
	    </section>
	  </div>

	  <div v-if="isPreviewOpen" class="modal-backdrop preview-backdrop" @click.self="closePreview">
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

  <div v-if="confirmDialog.open" class="modal-backdrop confirm-backdrop" @click.self="cancelConfirmDialog">
    <section class="confirm-modal" aria-modal="true" role="dialog">
      <header class="modal-header">
        <h2>{{ confirmDialog.title }}</h2>
        <button class="icon-button" type="button" aria-label="关闭确认弹窗" @click="cancelConfirmDialog">×</button>
      </header>

      <p class="confirm-message">{{ confirmDialog.message }}</p>
      <p v-if="confirmDialog.detail" class="confirm-detail">{{ confirmDialog.detail }}</p>

      <footer class="modal-footer confirm-footer">
        <button class="secondary" type="button" @click="cancelConfirmDialog">
          {{ confirmDialog.cancelText }}
        </button>
        <button class="danger-button" type="button" @click="acceptConfirmDialog">
          {{ confirmDialog.confirmText }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pageRoutes } from './router';
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

const confirmDialog = reactive({
  open: false,
  title: '',
  message: '',
  detail: '',
  confirmText: '确认',
  cancelText: '取消'
});
let confirmDialogResolver = null;

const DEFAULT_PICKUP_DROPOFF_METHOD = '昆明 · 到店取车';
const STORED_USER_KEY = 'mango_finance_user';
const DEFAULT_LOGIN_EXPIRE_HOURS = 8;
const permissionOptions = [
  { value: 'finance', label: '财务' },
  { value: 'sales', label: '销售' },
  { value: 'fleet_manager', label: '车队长' },
  { value: 'administrator', label: '管理员' }
];
const defaultDepartmentOptions = ['财务部', '销售部', '业务部', '车队', '新媒体', '测试'];
const fieldKindOptions = [
  { value: 'single', label: '单选' },
  { value: 'multi', label: '多选' },
  { value: 'image', label: '图片' },
  { value: 'file', label: '文件' },
  { value: 'relation', label: '关联' },
  { value: 'calc', label: '计算' }
];
const MIDDLE_IMAGE_WEBP_MAX_SIDE = 1600;
const MIDDLE_IMAGE_WEBP_QUALITY = 0.82;
const MIDDLE_XLSX_SCRIPT_URL = '/vendor/xlsx.full.min.js';
let middleXlsxLibraryPromise = null;

const currentUser = ref(readStoredUser());
const route = useRoute();
const router = useRouter();
const activePage = computed(() => route.meta?.page || 'home');
const isLoginLoading = ref(false);
const loginError = ref('');
const loginForm = reactive({
  username: '',
  password: ''
});
const accountForm = reactive({
  username: '',
  displayName: '',
  department: '',
  contact: '',
  password: '',
  permission: 'finance'
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
const historyDateFilters = reactive({});
const historyOpenDates = reactive({});
const healthStatus = ref(null);
const isHealthLoading = ref(false);
const healthErrorText = ref('');
const middleTables = ref([]);
const activeMiddleTable = ref('cw_cxcsb');
const middleContentRef = ref(null);
const middleTableWrapRef = ref(null);
const middleSidebarHeight = ref('');
const isMiddleLoading = ref(false);
const isMiddleSaving = ref(false);
const middleErrorText = ref('');
const middleSaveStatusText = ref('');
const middleTableSearchText = ref('');
const middleSearchText = ref('');
const middleFilterField = ref('');
const middleFilterValue = ref('');
const middleFilterValues = ref([]);
const middleFilterDraftValues = ref([]);
const middleRowsPerPage = 500;
const middleCurrentPage = ref(1);
const middlePageInput = ref('1');
const isMiddleMultiFilterOpen = ref(false);
const middleCellMultiSelect = reactive({
  rowKey: '',
  field: '',
  row: null
});
const middleCellMultiDraftValues = ref([]);
const middleFileInputRef = ref(null);
const middleFileModal = reactive({
  isOpen: false,
  tableLabel: '',
  columnKey: '',
  columnLabel: '',
  kind: 'file',
  kindLabel: '文件字段',
  accept: '',
  row: null,
  isEditable: false,
  files: [],
  selectedIndex: -1,
  errorText: ''
});
const middleFilePreviewModal = reactive({
  isOpen: false,
  title: '',
  url: '',
  type: '',
  file: null,
  previewKind: '',
  excelRows: [],
  canPreview: false,
  errorText: ''
});
const middleDirtyRows = reactive({});
const middlePendingDeletes = reactive({});
const middleSelectedRowKey = ref('');
let middleDraftRowIndex = 0;
const tableConfigItems = ref([]);
const activeTableConfigName = ref('');
const tableConfigDirectory = ref('visible');
const tableConfigSearchText = ref('');
const isTableConfigLoading = ref(false);
const isTableConfigSaving = ref(false);
const tableConfigStatusText = ref('');
const tableConfigErrorText = ref('');
const tablePropertyConfig = reactive({
  isOpen: false,
  tableName: '',
  tableLabel: '',
  visibleDepartments: [],
  originalVisibleDepartments: [],
  fieldProperties: {},
  originalFieldProperties: {}
});
const fieldOptionConfig = reactive({
  isOpen: false,
  tableName: '',
  tableLabel: '',
  columnKey: '',
  columnLabel: '',
  typeLabel: '',
  optionText: '',
  originalOptionText: '',
  mode: 'static',
  originalMode: 'static',
  sourceTableName: '',
  originalSourceTableName: '',
  sourceColumnName: '',
  originalSourceColumnName: '',
  lookupSourceTableName: '',
  originalLookupSourceTableName: '',
  lookupResultColumnName: '',
  originalLookupResultColumnName: '',
  lookupConditions: [],
  originalLookupConditions: [],
  lookupAggregate: 'raw',
  originalLookupAggregate: 'raw'
});
const fieldLookupConditionOptions = [
  { value: 'contains', label: '包含' },
  { value: 'notContains', label: '不包含' },
  { value: 'eq', label: '等于' },
  { value: 'ne', label: '不等于' },
  { value: 'empty', label: '为空' },
  { value: 'notEmpty', label: '不为空' }
];
const fieldLookupAggregateOptions = [
  { value: 'raw', label: '原样引用' },
  { value: 'distinct', label: '去重引用' },
  { value: 'sum', label: '求和' },
  { value: 'count', label: '计数' },
  { value: 'countDistinct', label: '去重计数' },
  { value: 'avg', label: '平均值' },
  { value: 'max', label: '最大值' },
  { value: 'min', label: '最小值' }
];
const fieldKindMenu = reactive({
  isOpen: false,
  tableName: '',
  columnKey: '',
  currentKind: '',
  left: 0,
  top: 0
});
const formulaConfig = reactive({
  isOpen: false,
  tableName: '',
  tableLabel: '',
  columnKey: '',
  columnLabel: '',
  expression: '',
  originalExpression: '',
  currentFieldKey: '',
  foreignTableName: '',
  foreignColumnKey: '',
  aggregate: 'sum'
});
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
let middleResizeObserver = null;
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
const middleSidebarStyle = computed(() => (
  middleSidebarHeight.value ? { height: middleSidebarHeight.value } : {}
));
const selectedMiddleTable = computed(() =>
  filteredMiddleTables.value.find(table => table.key === activeMiddleTable.value) || filteredMiddleTables.value[0] || null
);
const filteredMiddleTables = computed(() => {
  const keyword = middleTableSearchText.value.trim().toLowerCase();
  if (!keyword) return middleTables.value;
  return middleTables.value.filter(table =>
    [table.key, table.label, table.databaseName]
      .some(value => String(value || '').toLowerCase().includes(keyword))
  );
});
const middleDirtyCount = computed(() => {
  const newRows = selectedMiddleTable.value?.rows.filter(row => row.__isNew).length || 0;
  return Object.keys(middleDirtyRows).length + Object.keys(middlePendingDeletes).length + newRows;
});
const selectedTableConfig = computed(() =>
  filteredTableConfigItems.value.find(table => table.tableName === activeTableConfigName.value) || filteredTableConfigItems.value[0] || null
);
const selectedTableConfigVisibleColumns = computed(() =>
  (selectedTableConfig.value?.columns || []).filter(column => !isHiddenTableConfigColumn(column.key))
);
const formulaCurrentColumns = computed(() =>
  (selectedTableConfig.value?.columns || [])
    .filter(column => !isHiddenTableConfigColumn(column.key) && column.key !== formulaConfig.columnKey)
);
const formulaForeignTables = computed(() =>
  tableConfigItems.value.filter(table => table.tableName !== formulaConfig.tableName)
);
const formulaForeignColumns = computed(() => {
  const table = tableConfigItems.value.find(item => item.tableName === formulaConfig.foreignTableName);
  return (table?.columns || []).filter(column => !isHiddenTableConfigColumn(column.key));
});
const fieldOptionSourceTables = computed(() => tableConfigItems.value);
const fieldOptionSourceColumns = computed(() => {
  const table = tableConfigItems.value.find(item => item.tableName === fieldOptionConfig.sourceTableName);
  return (table?.columns || []).filter(column => !isHiddenTableConfigColumn(column.key));
});
const fieldOptionLookupSourceColumns = computed(() => {
  const table = tableConfigItems.value.find(item => item.tableName === fieldOptionConfig.lookupSourceTableName);
  return (table?.columns || []).filter(column => !isHiddenTableConfigColumn(column.key));
});
const fieldOptionCurrentColumns = computed(() => {
  const table = tableConfigItems.value.find(item => item.tableName === fieldOptionConfig.tableName);
  return (table?.columns || [])
    .filter(column => !isHiddenTableConfigColumn(column.key) && column.key !== fieldOptionConfig.columnKey);
});
const fieldKindMenuStyle = computed(() => ({
  left: `${fieldKindMenu.left}px`,
  top: `${fieldKindMenu.top}px`
}));
const visibleTableConfigItems = computed(() => sortTableConfigItems(tableConfigItems.value.filter(table => table.isVisible)));
const hiddenTableConfigItems = computed(() => sortTableConfigItems(tableConfigItems.value.filter(table => !table.isVisible)));
const displayedTableConfigItems = computed(() =>
  tableConfigDirectory.value === 'hidden' ? hiddenTableConfigItems.value : visibleTableConfigItems.value
);
const filteredTableConfigItems = computed(() => {
  const keyword = tableConfigSearchText.value.trim().toLowerCase();
  if (!keyword) return displayedTableConfigItems.value;
  return displayedTableConfigItems.value.filter(table =>
    [table.tableName, table.tableLabel, table.tableComment]
      .some(value => String(value || '').toLowerCase().includes(keyword))
  );
});
const tableConfigDirectoryLabel = computed(() =>
  tableConfigDirectory.value === 'hidden' ? '显示表格' : '隐藏表格'
);
const tableConfigDirectoryCount = computed(() =>
  tableConfigDirectory.value === 'hidden' ? visibleTableConfigItems.value.length : hiddenTableConfigItems.value.length
);
const tableDepartmentOptions = computed(() => uniqueClientStrings([
  ...users.value.map(user => user.department),
  ...tableConfigItems.value.flatMap(table => table.visibleDepartments || []),
  ...defaultDepartmentOptions
]));
const tablePropertyColumns = computed(() => {
  const table = tableConfigItems.value.find(item => item.tableName === tablePropertyConfig.tableName);
  return (table?.columns || []).filter(column => !isHiddenTableConfigColumn(column.key));
});
const selectedMiddleRows = computed(() => {
  const table = selectedMiddleTable.value;
  if (!table) return [];

  const keyword = middleSearchText.value.trim().toLowerCase();
  return table.rows.filter((row) => {
    if (!matchesMiddleFieldFilter(row)) return false;
    if (!keyword) return true;

    return Object.values(row)
      .flatMap(value => parseMiddleFilterValues(value))
      .some(value => String(value || '').toLowerCase().includes(keyword));
  });
});
const middleTotalPages = computed(() => Math.max(1, Math.ceil(selectedMiddleRows.value.length / middleRowsPerPage)));
const middlePageLabel = computed(() => String(middleCurrentPage.value));
const pagedMiddleRows = computed(() => {
  const currentPage = Math.min(Math.max(1, middleCurrentPage.value), middleTotalPages.value);
  const start = (currentPage - 1) * middleRowsPerPage;
  return selectedMiddleRows.value.slice(start, start + middleRowsPerPage);
});
const selectedMiddleDisplayColumns = computed(() => {
  const primaryKey = getMiddlePrimaryColumn();
  return (selectedMiddleTable.value?.columns || []).filter(column => column.key !== primaryKey);
});
const middleFilterColumns = computed(() =>
  (selectedMiddleTable.value?.columns || [])
    .filter(column => !['id', 'create_time', 'update_time'].includes(column.key))
    .filter(column => !isMiddleFileLikeColumn(column))
    .filter(column => isMiddleSingleFilterColumn(column) || isMiddleMultiFilterColumn(column))
);
const middleFilterColumn = computed(() =>
  middleFilterColumns.value.find(column => column.key === middleFilterField.value) || null
);
const isMiddleMultiFilter = computed(() => isMiddleMultiFilterColumn(middleFilterColumn.value));
const middleFilterOptions = computed(() => {
  const column = middleFilterColumn.value;
	  if (!column) return [];
	  if (isMiddleMultiSelectColumn(column)) return [...column.selectOptions];
	  if (isMiddleSingleSelectColumn(column)) return getMiddleSingleSelectOptions(column);
	  return getUniqueMiddleValues(column.key);
	});
const middleMultiFilterButtonText = computed(() => {
  if (!middleFilterField.value) return '请先选择筛选字段';
  if (!middleFilterValues.value.length) return '全部';
  if (middleFilterValues.value.length <= 2) return middleFilterValues.value.join('、');
  return `已选择 ${middleFilterValues.value.length} 项`;
});
const middleDashboardCards = computed(() => {
  const rows = selectedMiddleTable.value?.rows || [];
  const countBy = (key, value) => rows.filter(row => row[key] === value).length;
  const validRentRows = rows.filter(row => Number(row.rzdj));
  const totalDailyRent = validRentRows.reduce((sum, row) => sum + Number(row.rzdj || 0), 0);
  const averageDailyRent = validRentRows.length ? Math.round(totalDailyRent / validRentRows.length) : 0;

  return [
    { key: 'total', label: '车辆总数', value: rows.length, detail: '车型参数表记录' },
    { key: 'inStock', label: '在库车辆', value: countBy('clzt', '在库'), detail: '可关注可用车辆' },
    { key: 'out', label: '出车车辆', value: countBy('clzt', '出车'), detail: '当前业务占用' },
    { key: 'maintenance', label: '维修/备用', value: countBy('clzt', '维修中') + countBy('clzt', '备用/不上架'), detail: '暂不正常上架' },
    { key: 'partner', label: '同行/挂靠', value: countBy('ly', '同行') + countBy('ly', '挂靠'), detail: '合作车辆来源' },
    { key: 'avgRent', label: '平均日租', value: averageDailyRent ? `¥${averageDailyRent.toLocaleString('zh-CN')}` : '-', detail: '按已填日租计算' }
  ];
});

const healthItems = computed(() => {
  const checks = healthStatus.value?.checks || {};
  const items = [];

  const addItem = (key, label, check, detail = '') => {
    if (!check) return;
    items.push({
      key,
      label,
      ok: check.ok !== false,
      warn: false,
      status: check.ok === false ? '异常' : '正常',
      detail
    });
  };

  addItem('build', '前端构建', checks.build, checks.build?.path || 'build');
  addItem('appConfig', '配置文件', checks.appConfig, 'app_config.json');
  addItem(
    'mysqlConfig',
    'MySQL 配置',
    checks.mysqlConfig,
    checks.mysqlConfig?.database
      ? `${checks.mysqlConfig.host}:${checks.mysqlConfig.port} / ${checks.mysqlConfig.database}`
      : '未读取到数据库配置'
  );

  if (checks.wecomConfig) {
    items.push({
      key: 'wecomConfig',
      label: '企业微信推送',
      ok: true,
      warn: !checks.wecomConfig.configured,
      status: checks.wecomConfig.configured ? '已配置' : '未配置',
      detail: checks.wecomConfig.configured ? 'Webhook 已配置' : '不影响基础功能，可在推送页面配置'
    });
  }

  for (const [type, check] of Object.entries(checks.skills || {})) {
    addItem(`skill-${type}`, `${receiptTypeLabel(type)} Skill`, check, check.file || '');
  }

  for (const [type, check] of Object.entries(checks.createFileDirs || {})) {
    addItem(`dir-${type}`, `${receiptTypeLabel(type)}目录`, check, check.path || '');
  }

  addItem('runtime', '运行缓存目录', checks.runtime, checks.runtime?.path || '.runtime');
  addItem('chrome', 'Chrome/Chromium', checks.chrome, checks.chrome?.ok ? '可用于图片渲染' : '未检测到可执行浏览器');
  addItem('webpConverter', 'WebP 转换工具', checks.webpConverter, checks.webpConverter?.ok ? 'cwebp 可用' : '未检测到 cwebp');

  return items;
});

const previewTitle = computed(() => {
  if (result.history && result.webpName) return result.webpName;
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

onMounted(() => {
  window.addEventListener('resize', syncMiddleSidebarHeight);
  window.addEventListener('click', closeFieldKindMenu);
  nextTick(observeMiddleContentHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncMiddleSidebarHeight);
  window.removeEventListener('click', closeFieldKindMenu);
  middleResizeObserver?.disconnect();
});

watch(activePage, (value) => {
  if (value === 'home' && isAdministrator.value) {
    loadHealthStatus();
  }

  if (value === 'middle') {
    loadMiddlePlatform();
  }

  if (value === 'accounts') {
    if (!isAdministrator.value) {
      navigatePage('home');
      return;
    }
    loadUsers();
  }

  if (value === 'tableManagement') {
    if (!isAdministrator.value) {
      navigatePage('home');
      return;
    }
    loadUsers();
    loadTableManagement();
  }

  if (value === 'push') {
    if (!isAdministrator.value) {
      navigatePage('home');
      return;
    }
    loadPushConfig();
  }

  if (value === 'history') {
    loadHistoryImages();
  }
  nextTick(observeMiddleContentHeight);
}, { immediate: true });

watch(filteredTableConfigItems, (items) => {
  if (activePage.value !== 'tableManagement') return;
  if (!items.some(table => table.tableName === activeTableConfigName.value)) {
    activeTableConfigName.value = items[0]?.tableName || '';
  }
});

watch(filteredMiddleTables, (tables) => {
  if (activePage.value !== 'middle') return;
  if (!tables.some(table => table.key === activeMiddleTable.value)) {
    activeMiddleTable.value = tables[0]?.key || '';
  }
});

watch(middleFilterField, () => {
  middleFilterValue.value = '';
  middleFilterValues.value = [];
  middleFilterDraftValues.value = [];
  isMiddleMultiFilterOpen.value = false;
  clearMiddleCellMultiSelect();
  resetMiddlePagination();
});

watch([activeMiddleTable, middleSearchText, middleFilterValue], () => {
  resetMiddlePagination();
});

watch(middleFilterValues, () => {
  resetMiddlePagination();
}, { deep: true });

watch(middleTotalPages, (total) => {
  if (middleCurrentPage.value > total) middleCurrentPage.value = total;
  middlePageInput.value = String(middleCurrentPage.value);
});

watch(middleCurrentPage, (page) => {
  middlePageInput.value = String(page);
});

watch(currentUser, (value) => {
  if (value?.permission === 'administrator' && activePage.value === 'home') {
    loadHealthStatus();
  } else {
    healthStatus.value = null;
    healthErrorText.value = '';
  }
});

function navigatePage(page) {
  const target = pageRoutes[page] || pageRoutes.home;
  if (route.path !== target) {
    router.push(target);
  }
}

function observeMiddleContentHeight() {
  middleResizeObserver?.disconnect();
  middleResizeObserver = null;

  if (activePage.value !== 'middle' || !middleContentRef.value) {
    middleSidebarHeight.value = '';
    return;
  }

  middleResizeObserver = new ResizeObserver(syncMiddleSidebarHeight);
  middleResizeObserver.observe(middleContentRef.value);
  syncMiddleSidebarHeight();
}

function syncMiddleSidebarHeight() {
  if (activePage.value !== 'middle' || !middleContentRef.value) return;
  middleSidebarHeight.value = `${middleContentRef.value.offsetHeight}px`;
}

function selectMiddleTable(key) {
  activeMiddleTable.value = key;
  clearMiddleFilters();
  clearMiddleDirtyRows();
  middleSaveStatusText.value = '';
  middleErrorText.value = '';
}

async function loadMiddlePlatform() {
  middleErrorText.value = '';
  middleSaveStatusText.value = '';
  isMiddleLoading.value = true;

  try {
    const params = new URLSearchParams({
      department: currentUser.value?.department || '',
      permission: currentUser.value?.permission || ''
    });
    const response = await fetch(`/api/middle-platform/tables?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '读取中台数据失败');
    middleTables.value = normalizeMiddleTables(data.tables || []);
    if (!filteredMiddleTables.value.some(table => table.key === activeMiddleTable.value)) {
      activeMiddleTable.value = filteredMiddleTables.value[0]?.key || '';
    }
    clearMiddleDirtyRows();
  } catch (error) {
    middleErrorText.value = error?.message || String(error);
  } finally {
    isMiddleLoading.value = false;
  }
}

function uniqueClientStrings(values) {
  const result = [];
  const seen = new Set();
  for (const value of values || []) {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function clearMiddleFilters() {
  middleSearchText.value = '';
  middleFilterField.value = '';
  middleFilterValue.value = '';
  middleFilterValues.value = [];
  middleFilterDraftValues.value = [];
  isMiddleMultiFilterOpen.value = false;
  clearMiddleCellMultiSelect();
}

function clearMiddleCellMultiSelect() {
  middleCellMultiSelect.rowKey = '';
  middleCellMultiSelect.field = '';
  middleCellMultiSelect.row = null;
  middleCellMultiDraftValues.value = [];
}

function clearMiddleDirtyRows() {
  for (const key of Object.keys(middleDirtyRows)) delete middleDirtyRows[key];
  for (const key of Object.keys(middlePendingDeletes)) delete middlePendingDeletes[key];
  middleSelectedRowKey.value = '';
}

function openMiddleMultiFilter() {
  if (!isMiddleMultiFilter.value || !middleFilterField.value) return;
  middleFilterDraftValues.value = [...middleFilterValues.value];
  isMiddleMultiFilterOpen.value = true;
}

function closeMiddleMultiFilter() {
  middleFilterValues.value = middleFilterDraftValues.value
    .filter(value => middleFilterOptions.value.includes(value));
  isMiddleMultiFilterOpen.value = false;
}

function resetMiddlePagination() {
  middleCurrentPage.value = 1;
  middlePageInput.value = '1';
}

function goMiddlePage(delta) {
  const nextPage = Math.min(Math.max(1, middleCurrentPage.value + delta), middleTotalPages.value);
  middleCurrentPage.value = nextPage;
  scrollMiddleTableToTop();
}

function jumpMiddlePage() {
  const page = Number.parseInt(middlePageInput.value, 10);
  if (!Number.isFinite(page)) {
    middlePageInput.value = String(middleCurrentPage.value);
    return;
  }
  middleCurrentPage.value = Math.min(Math.max(1, page), middleTotalPages.value);
  scrollMiddleTableToTop();
}

async function scrollMiddleTableToTop() {
  await nextTick();
  const wrap = middleTableWrapRef.value;
  if (!wrap) return;
  wrap.scrollTo({ top: 0, left: wrap.scrollLeft, behavior: 'smooth' });
}

function normalizeMiddleTables(tables) {
  return tables.map(table => {
    const multiColumns = (table.columns || []).filter(column => isMiddleMultiSelectColumn(column));
    if (!multiColumns.length) return table;
    return {
      ...table,
      rows: (table.rows || []).map(row => {
        const next = { ...row };
        for (const column of multiColumns) {
          next[column.key] = parseMiddleFilterValues(next[column.key])
            .filter(value => column.selectOptions.includes(value));
        }
        return next;
      })
    };
  });
}

function getMiddlePrimaryColumn() {
  return selectedMiddleTable.value?.primaryKey || selectedMiddleTable.value?.columns.find(column => column.columnKey === 'PRI')?.key || 'id';
}

function getMiddleRowPrimaryValue(row) {
  const primaryKey = getMiddlePrimaryColumn();
  const value = row?.[primaryKey];
  return value === undefined || value === null || value === '' ? '' : value;
}

function getMiddleRowRenderKey(row, rowIndex = 0) {
  if (row?.__draftId) return row.__draftId;
  const primaryKey = getMiddlePrimaryColumn();
  const primaryValue = row?.[primaryKey];
  return primaryValue === undefined || primaryValue === null || primaryValue === ''
    ? `row-${rowIndex}`
    : String(primaryValue);
}

function getMiddleRowDirtyKey(row) {
  if (row?.__draftId) return row.__draftId;
  const primaryKey = getMiddlePrimaryColumn();
  const primaryValue = row?.[primaryKey];
  return `${selectedMiddleTable.value?.key || ''}::${primaryKey}::${primaryValue}`;
}

function selectMiddleRow(row, rowIndex) {
  middleSelectedRowKey.value = getMiddleRowRenderKey(row, rowIndex);
}

function markMiddleCellDirty(row, field) {
  const table = selectedMiddleTable.value;
  if (!table) return;
  if (row.__isNew) {
    middleSaveStatusText.value = '';
    return;
  }
  const primaryKey = getMiddlePrimaryColumn();
  const primaryValue = row?.[primaryKey];
  if (primaryValue === undefined || primaryValue === null || primaryValue === '') {
    middleErrorText.value = '当前行缺少主键，不能保存';
    return;
  }

  const key = getMiddleRowDirtyKey(row);
  if (!middleDirtyRows[key]) {
    middleDirtyRows[key] = {
      primaryKey: { key: primaryKey, value: primaryValue },
      changes: {}
    };
  }
  middleDirtyRows[key].changes[field] = row[field];
  middleSaveStatusText.value = '';
}

function isMiddleCellDirty(row, field) {
  if (row?.__isNew) return String(row[field] ?? '').trim() !== '';
  const dirty = middleDirtyRows[getMiddleRowDirtyKey(row)];
  return Boolean(dirty?.changes && Object.prototype.hasOwnProperty.call(dirty.changes, field));
}

function formatMiddleMultiCellValue(value) {
  return parseMiddleFilterValues(value).join('、');
}

function openMiddleCellMultiSelect(row, rowIndex, column, event) {
  const rowKey = getMiddleRowRenderKey(row, rowIndex);
  middleCellMultiSelect.rowKey = rowKey;
  middleCellMultiSelect.field = column.key;
  middleCellMultiSelect.row = row;
  middleCellMultiDraftValues.value = parseMiddleFilterValues(row[column.key])
    .filter(value => column.selectOptions.includes(value));
  slideMiddleTableToShowCellPopover(event?.currentTarget);
}

function isMiddleCellMultiSelectOpen(row, rowIndex, column) {
  return middleCellMultiSelect.rowKey === getMiddleRowRenderKey(row, rowIndex)
    && middleCellMultiSelect.field === column.key;
}

function saveMiddleCellMultiSelect() {
  const row = middleCellMultiSelect.row;
  const field = middleCellMultiSelect.field;
  const column = selectedMiddleTable.value?.columns?.find(item => item.key === field);
  if (row && field && column) {
    row[field] = middleCellMultiDraftValues.value.filter(value => column.selectOptions.includes(value));
    markMiddleCellDirty(row, field);
  }
  clearMiddleCellMultiSelect();
}

function closeMiddleCellMultiSelect() {
  clearMiddleCellMultiSelect();
}

function getMiddleFileKind(column) {
  return column?.fieldKind === 'image' ? 'image' : 'file';
}

function getMiddleFileCellText(row, column) {
  const files = parseMiddleFileItems(row?.[column.key]);
  if (!files.length) return getMiddleFileKind(column) === 'image' ? '点击上传图片' : '点击上传文件';
  const unit = getMiddleFileKind(column) === 'image' ? '张图片' : '个文件';
  return `${files.length} ${unit}`;
}

function openMiddleFileCellModal(row, rowIndex, column) {
  selectMiddleRow(row, rowIndex);
  const kind = getMiddleFileKind(column);
  middleFileModal.isOpen = true;
  middleFileModal.tableLabel = selectedMiddleTable.value?.label || selectedMiddleTable.value?.databaseName || '';
  middleFileModal.columnKey = column.key;
  middleFileModal.columnLabel = column.label || column.key;
  middleFileModal.kind = kind;
  middleFileModal.kindLabel = kind === 'image' ? '图片字段' : '文件字段';
  middleFileModal.accept = kind === 'image' ? 'image/*' : '';
  middleFileModal.row = row;
  middleFileModal.isEditable = Boolean(column.isEditable);
  middleFileModal.files = parseMiddleFileItems(row?.[column.key]);
  middleFileModal.selectedIndex = middleFileModal.files.length ? 0 : -1;
  middleFileModal.errorText = '';
}

function closeMiddleFileCellModal() {
  middleFileModal.isOpen = false;
  middleFileModal.row = null;
  middleFileModal.files = [];
  middleFileModal.selectedIndex = -1;
  middleFileModal.errorText = '';
  if (middleFileInputRef.value) middleFileInputRef.value.value = '';
}

function triggerMiddleFileUpload() {
  if (!middleFileModal.isEditable) return;
  middleFileInputRef.value?.click();
}

function selectMiddleFileItem(file, index) {
  middleFileModal.selectedIndex = index;
  if (middleFileModal.kind === 'image' && isMiddleImageFile(file)) {
    previewMiddleFileImage(file);
    return;
  }
  if (middleFileModal.kind === 'file') {
    previewMiddleFile(file);
  }
}

function previewMiddleFileImage(file) {
  const href = file?.dataUrl || file?.url || file?.value || '';
  if (!href) {
    middleFileModal.errorText = '当前图片没有可预览地址';
    return;
  }
  revokePreviewObjectUrl();
  result.imageUrl = href;
  result.webpName = toWebpFileName(file.name || file.originalName || 'image');
  result.fileDate = middleFileModal.columnLabel || '';
  result.recordSaved = true;
  result.pushed = false;
  result.history = true;
  result.type = 'middle-file';
  statusText.value = '';
  errorText.value = '';
  resetView();
  isPreviewOpen.value = true;
}

async function previewMiddleFile(file) {
  const href = getMiddleFileHref(file);
  if (!href) {
    middleFileModal.errorText = '当前文件没有可预览地址';
    return;
  }
  const isExcel = isMiddleExcelFile(file);
  const canPreview = canPreviewMiddleFile(file);
  middleFilePreviewModal.isOpen = true;
  middleFilePreviewModal.title = file?.name || '文件预览';
  middleFilePreviewModal.url = href;
  middleFilePreviewModal.type = file?.type || '';
  middleFilePreviewModal.file = file;
  middleFilePreviewModal.previewKind = isExcel ? 'excel' : '';
  middleFilePreviewModal.excelRows = [];
  middleFilePreviewModal.canPreview = !isExcel && canPreview;
  middleFilePreviewModal.errorText = isExcel ? '正在读取 Excel 文件...' : (canPreview ? '' : '当前文件类型暂不支持在线预览');
  if (isExcel) {
    try {
      middleFilePreviewModal.excelRows = await readMiddleExcelPreviewRows(file);
      middleFilePreviewModal.errorText = middleFilePreviewModal.excelRows.length ? '' : 'Excel 文件中没有可显示的数据';
    } catch (error) {
      middleFilePreviewModal.errorText = error?.message || 'Excel 文件解析失败';
    }
  }
}

function closeMiddleFilePreview() {
  middleFilePreviewModal.isOpen = false;
  middleFilePreviewModal.title = '';
  middleFilePreviewModal.url = '';
  middleFilePreviewModal.type = '';
  middleFilePreviewModal.file = null;
  middleFilePreviewModal.previewKind = '';
  middleFilePreviewModal.excelRows = [];
  middleFilePreviewModal.canPreview = false;
  middleFilePreviewModal.errorText = '';
}

function downloadMiddleFilePreview() {
  if (!middleFilePreviewModal.file) return;
  downloadMiddleFileItem(middleFilePreviewModal.file, {
    fallbackName: middleFilePreviewModal.title || 'download'
  });
}

async function handleMiddleFileUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  middleFileModal.errorText = '';
  const validationError = validateMiddleUploadFiles(files);
  if (validationError) {
    middleFileModal.errorText = validationError;
    event.target.value = '';
    return;
  }
  try {
    const uploaded = await Promise.all(files.map(file =>
      middleFileModal.kind === 'image' ? readMiddleImageAsWebpItem(file) : readMiddleFileAsItem(file)
    ));
    middleFileModal.files = [...middleFileModal.files, ...uploaded];
    middleFileModal.selectedIndex = middleFileModal.files.length - 1;
  } catch (error) {
    middleFileModal.errorText = error?.message || '文件读取失败';
  } finally {
    event.target.value = '';
  }
}

function validateMiddleUploadFiles(files) {
  if (middleFileModal.kind === 'image') {
    const invalid = files.filter(file => !String(file.type || '').startsWith('image/'));
    if (invalid.length) return `图片字段只能上传图片类型：${invalid.map(file => file.name).join('、')}`;
    return '';
  }

  const imageFiles = files.filter(file => String(file.type || '').startsWith('image/'));
  if (imageFiles.length) return `文件字段不能上传图片类型，请改用图片字段：${imageFiles.map(file => file.name).join('、')}`;
  return '';
}

function readMiddleFileAsItem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: String(reader.result || ''),
      uploadedAt: new Date().toISOString()
    });
    reader.onerror = () => reject(new Error(`${file.name} 读取失败`));
    reader.readAsDataURL(file);
  });
}

function readMiddleImageAsWebpItem(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`${file.name} 不是图片文件`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`${file.name} 读取失败`));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error(`${file.name} 图片解析失败`));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const scale = Math.min(1, MIDDLE_IMAGE_WEBP_MAX_SIDE / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('浏览器不支持图片转换'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error(`${file.name} 转换 WebP 失败`));
            return;
          }
          const webpReader = new FileReader();
          webpReader.onerror = () => reject(new Error(`${file.name} WebP 读取失败`));
          webpReader.onload = () => resolve({
            name: toWebpFileName(file.name),
            originalName: file.name,
            type: 'image/webp',
            size: blob.size,
            dataUrl: String(webpReader.result || ''),
            uploadedAt: new Date().toISOString()
          });
          webpReader.readAsDataURL(blob);
        }, 'image/webp', MIDDLE_IMAGE_WEBP_QUALITY);
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function toWebpFileName(name) {
  const base = String(name || 'image').replace(/\.[^.]+$/, '') || 'image';
  return `${base}.webp`;
}

function downloadSelectedMiddleFile() {
  const file = middleFileModal.files[middleFileModal.selectedIndex] || middleFileModal.files[0];
  if (!file) return;
  downloadMiddleFileItem(file, {
    forceWebp: middleFileModal.kind === 'image',
    fallbackName: 'download'
  });
}

function downloadMiddleFileItem(file, options = {}) {
  const href = getMiddleFileHref(file);
  if (!href) {
    middleFileModal.errorText = '当前文件没有可下载地址';
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = options.forceWebp
    ? toWebpFileName(file.name || file.originalName || 'image')
    : file.name || options.fallbackName || 'download';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function getMiddleFileHref(file) {
  return file?.dataUrl || file?.url || file?.value || file?.image_url || '';
}

function isMiddleExcelFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || file?.url || '').toLowerCase();
  return [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.ms-excel.sheet.macroenabled.12'
  ].includes(type) || ['.xlsx', '.xls', '.xlsm', '.csv'].some(ext => name.endsWith(ext));
}

async function readMiddleExcelPreviewRows(file) {
  const href = getMiddleFileHref(file);
  const xlsx = await loadMiddleXlsxLibrary();
  const buffer = href.startsWith('data:')
    ? dataUrlToArrayBuffer(href)
    : await fetch(href).then(response => {
        if (!response.ok) throw new Error('Excel 文件下载失败');
        return response.arrayBuffer();
      });
  const workbook = xlsx.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    blankrows: false,
    defval: ''
  });
  const normalizedRows = rows
    .slice(0, 200)
    .map(row => row.map(cell => formatMiddleExcelCell(cell)));
  const maxColumns = Math.min(50, normalizedRows.reduce((max, row) => Math.max(max, row.length), 0));
  return normalizedRows.map(row => Array.from({ length: maxColumns }, (_, index) => row[index] ?? ''));
}

function loadMiddleXlsxLibrary() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (middleXlsxLibraryPromise) return middleXlsxLibraryPromise;

  middleXlsxLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = MIDDLE_XLSX_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX);
        return;
      }
      reject(new Error('Excel 预览组件加载失败'));
    };
    script.onerror = () => reject(new Error('Excel 预览组件加载失败'));
    document.head.appendChild(script);
  });

  return middleXlsxLibraryPromise;
}

function dataUrlToArrayBuffer(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function formatMiddleExcelCell(value) {
  if (value instanceof Date) return value.toLocaleDateString('zh-CN');
  if (value === null || value === undefined) return '';
  return String(value);
}

function canPreviewMiddleFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || file?.url || '').toLowerCase();
  const href = getMiddleFileHref(file).toLowerCase();
  if (type === 'application/pdf' || name.endsWith('.pdf') || href.startsWith('data:application/pdf')) return true;
  if (type.startsWith('text/')) return true;
  if (['application/json', 'application/xml', 'image/svg+xml'].includes(type)) return true;
  return ['.txt', '.csv', '.json', '.xml', '.md', '.markdown', '.html', '.htm', '.svg'].some(ext => name.endsWith(ext));
}

function deleteSelectedMiddleFile() {
  const index = middleFileModal.selectedIndex;
  if (!middleFileModal.isEditable || index < 0) return;
  middleFileModal.files = middleFileModal.files.filter((_, itemIndex) => itemIndex !== index);
  middleFileModal.selectedIndex = middleFileModal.files.length ? Math.min(index, middleFileModal.files.length - 1) : -1;
}

function saveMiddleFileCellModal() {
  const row = middleFileModal.row;
  const field = middleFileModal.columnKey;
  if (!row || !field || !middleFileModal.isEditable) return;
  row[field] = middleFileModal.files.map(file => ({ ...file }));
  markMiddleCellDirty(row, field);
  closeMiddleFileCellModal();
}

function parseMiddleFileItems(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map(normalizeMiddleFileItem).filter(Boolean);
  if (typeof value === 'object') return [normalizeMiddleFileItem(value)].filter(Boolean);

  const raw = String(value).trim();
  if (!raw) return [];
  if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
    try {
      return parseMiddleFileItems(JSON.parse(raw));
    } catch {}
  }
  return [{ name: raw.split('/').pop() || raw, url: raw, size: 0, type: '' }];
}

function normalizeMiddleFileItem(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    return { name: item.split('/').pop() || item, url: item, size: 0, type: '' };
  }
  const url = item.dataUrl || item.url || item.value || '';
  return {
    name: item.name || item.title || item.label || (url ? String(url).split('/').pop() : '未命名文件'),
    type: item.type || '',
    size: Number(item.size || 0),
    dataUrl: item.dataUrl || '',
    url: item.url || '',
    uploadedAt: item.uploadedAt || ''
  };
}

function isMiddleImageFile(file) {
  return String(file?.type || '').startsWith('image/') || String(file?.dataUrl || file?.url || '').startsWith('data:image/');
}

function formatMiddleFileSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return '未知大小';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function slideMiddleTableToShowCellPopover(trigger) {
  await nextTick();
  const wrap = middleTableWrapRef.value || trigger?.closest?.('.middle-table-wrap');
  const popover = trigger?.closest?.('.middle-cell-multi-wrap')?.querySelector?.('.middle-cell-popover');
  if (!wrap || !popover) return;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const wrapRect = wrap.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const rightOverflow = popoverRect.right - wrapRect.right + 14;
    if (rightOverflow <= 0) return;

    const nextLeft = Math.min(
      wrap.scrollLeft + rightOverflow,
      wrap.scrollWidth - wrap.clientWidth
    );
    if (nextLeft <= wrap.scrollLeft) return;
    wrap.scrollLeft = nextLeft;
    await nextTick();
  }
}

async function addMiddleRow() {
  const table = selectedMiddleTable.value;
  if (!table) return;
  clearMiddleFilters();
  const row = {
    __isNew: true,
    __draftId: `draft-${Date.now()}-${middleDraftRowIndex++}`
  };
  for (const column of table.columns) {
    row[column.key] = '';
  }
  table.rows.push(row);
  middleSelectedRowKey.value = row.__draftId;
  middleSaveStatusText.value = '';
  middleErrorText.value = '';
  middleCurrentPage.value = middleTotalPages.value;
  await scrollMiddleTableToBottom();
}

async function scrollMiddleTableToBottom() {
  await nextTick();
  const wrap = middleTableWrapRef.value;
  if (!wrap) return;
  wrap.scrollTo({
    top: wrap.scrollHeight,
    left: wrap.scrollLeft,
    behavior: 'smooth'
  });
}

async function revealSavedMiddleRow(data) {
  const insertedId = data?.insertedIds?.[data.insertedIds.length - 1];
  if (insertedId === undefined || insertedId === null || insertedId === '') return;
  clearMiddleFilters();
  middleSelectedRowKey.value = String(insertedId);
  await nextTick();
  const rowIndex = selectedMiddleRows.value.findIndex(row => String(getMiddleRowPrimaryValue(row)) === String(insertedId));
  if (rowIndex >= 0) {
    middleCurrentPage.value = Math.floor(rowIndex / middleRowsPerPage) + 1;
    await nextTick();
  }
  const wrap = middleTableWrapRef.value;
  const selector = `[data-row-key="${CSS.escape(String(insertedId))}"]`;
  const rowElement = wrap?.querySelector?.(selector);
  if (!rowElement) return;
  rowElement.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
}

async function removeMiddleRow() {
  const table = selectedMiddleTable.value;
  if (!table || !pagedMiddleRows.value.length) return;
  const fallbackRow = pagedMiddleRows.value[pagedMiddleRows.value.length - 1];
  const targetKey = middleSelectedRowKey.value || getMiddleRowRenderKey(fallbackRow, pagedMiddleRows.value.length - 1);
  const row = table.rows.find((item, index) => getMiddleRowRenderKey(item, index) === targetKey)
    || fallbackRow;
  if (!row) return;

  const label = row.cxmc || row.cph || row.cx || row.cp || row.order_id || row.username || getMiddleRowRenderKey(row);
  const confirmed = await openConfirmDialog({
    title: '删除这一行',
    message: '确认删除当前选中的这一行吗？',
    detail: label,
    confirmText: '删除'
  });
  if (!confirmed) return;

  const rowKey = getMiddleRowRenderKey(row);
  table.rows = table.rows.filter((item, index) => getMiddleRowRenderKey(item, index) !== rowKey);
  if (row.__isNew) {
    delete middleDirtyRows[row.__draftId];
  } else {
    const primaryKey = getMiddlePrimaryColumn();
    const primaryValue = row[primaryKey];
    if (primaryValue !== undefined && primaryValue !== null && primaryValue !== '') {
      middlePendingDeletes[rowKey] = {
        primaryKey: { key: primaryKey, value: primaryValue }
      };
      delete middleDirtyRows[getMiddleRowDirtyKey(row)];
    }
  }
  middleSelectedRowKey.value = '';
  middleSaveStatusText.value = '';
}

function openConfirmDialog(options = {}) {
  confirmDialog.open = true;
  confirmDialog.title = options.title || '确认操作';
  confirmDialog.message = options.message || '确认继续吗？';
  confirmDialog.detail = options.detail || '';
  confirmDialog.confirmText = options.confirmText || '确认';
  confirmDialog.cancelText = options.cancelText || '取消';

  return new Promise(resolve => {
    confirmDialogResolver = resolve;
  });
}

function closeConfirmDialog(result) {
  confirmDialog.open = false;
  const resolver = confirmDialogResolver;
  confirmDialogResolver = null;
  if (resolver) resolver(result);
}

function acceptConfirmDialog() {
  closeConfirmDialog(true);
}

function cancelConfirmDialog() {
  closeConfirmDialog(false);
}

function middleInputType(column) {
  if (getFieldKind(column) === 'date') return 'date';
  if (['int', 'bigint', 'smallint', 'mediumint', 'tinyint', 'decimal', 'float', 'double'].includes(column.dataType)) return 'number';
  if (column.dataType === 'date') return 'date';
  return 'text';
}

function validateMiddleChanges() {
  const table = selectedMiddleTable.value;
  if (!table) return '没有选择表格';
  const columnsByKey = new Map(table.columns.map(column => [column.key, column]));
  const errors = [];
  const validateField = (field, value, prefix = '') => {
    const column = columnsByKey.get(field);
    if (!column) {
      errors.push(`${prefix}字段 ${field} 不存在`);
      return;
    }
    if (!column.isEditable) {
      errors.push(`${prefix}${column.label} 不允许编辑`);
      return;
    }

    if (column.isRequired && (Array.isArray(value) ? !value.length : String(value ?? '').trim() === '')) {
      errors.push(`${prefix}${column.label} 必填`);
      return;
    }

    if (isMiddleMultiSelectColumn(column)) {
      const values = Array.isArray(value) ? value : parseMiddleFilterValues(value);
      const invalid = values.filter(item => !column.selectOptions.includes(item));
      if (invalid.length) {
        errors.push(`${prefix}${column.label} 只能选择：${column.selectOptions.join('、')}`);
      }
      return;
    }

    const raw = String(value ?? '').trim();
    if (!raw) return;
	    if (isMiddleSingleSelectColumn(column) && !getMiddleSingleSelectOptions(column).includes(raw)) {
	      errors.push(`${prefix}${column.label} 只能选择：${getMiddleSingleSelectOptions(column).join('、')}`);
	    }
    if (['int', 'bigint', 'smallint', 'mediumint', 'tinyint'].includes(column.dataType) && !/^-?\d+$/.test(raw)) {
      errors.push(`${prefix}${column.label} 只能填写整数`);
    }
    if (['decimal', 'float', 'double'].includes(column.dataType) && !/^-?\d+(\.\d+)?$/.test(raw)) {
      errors.push(`${prefix}${column.label} 只能填写数字`);
    }
    if (column.dataType === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      errors.push(`${prefix}${column.label} 日期格式必须是 YYYY-MM-DD`);
    }
  };

  const newRows = table.rows.filter(row => row.__isNew);
  const requiredColumns = (table.columns || []).filter(column => column.isRequired && column.isEditable);
  for (let index = 0; index < newRows.length; index += 1) {
    const row = newRows[index];
    const changes = getMiddleInsertChanges(row);
    if (!Object.keys(changes).length) {
      errors.push(`新增第 ${index + 1} 行至少填写一个字段`);
      continue;
    }
    for (const column of requiredColumns) {
      const value = changes[column.key] ?? row[column.key];
      if (Array.isArray(value) ? !value.length : String(value ?? '').trim() === '') {
        errors.push(`新增第 ${index + 1} 行 ${column.label} 必填`);
      }
    }
    for (const [field, value] of Object.entries(changes)) {
      validateField(field, value, `新增第 ${index + 1} 行 `);
    }
  }

  for (const dirty of Object.values(middleDirtyRows)) {
    for (const [field, value] of Object.entries(dirty.changes || {})) {
      validateField(field, value);
    }
  }

  return errors.join('\n');
}

function getMiddleInsertChanges(row) {
  const changes = {};
  for (const column of selectedMiddleTable.value?.columns || []) {
    if (!column.isEditable && !isMiddleFormulaColumn(column)) continue;
    const value = isMiddleFormulaColumn(column) ? getMiddleDisplayCellValue(row, column) : row[column.key];
    if (Array.isArray(value) ? value.length > 0 : String(value ?? '').trim() !== '') {
      changes[column.key] = value;
    }
  }
  return changes;
}

function getMiddleFormulaUpdates() {
  const table = selectedMiddleTable.value;
  const primaryKey = getMiddlePrimaryColumn();
  const formulaColumns = (table?.columns || []).filter(column => isMiddleFormulaColumn(column) && column.isEditable);
  if (!table || !primaryKey || !formulaColumns.length) return [];
  const dirtyPrimaryValues = new Set(
    Object.values(middleDirtyRows)
      .map(item => String(item?.primaryKey?.value ?? ''))
      .filter(Boolean)
  );

  return (table.rows || [])
    .filter(row => !row.__isNew && !row.__pendingDelete)
    .map(row => {
      const primaryValue = row[primaryKey];
      if (primaryValue === undefined || primaryValue === null || String(primaryValue) === '') return null;
      if (!dirtyPrimaryValues.has(String(primaryValue))) return null;
      const changes = {};
      for (const column of formulaColumns) {
        const dirty = middleDirtyRows[getMiddleRowDirtyKey(row)];
        if (dirty?.changes && Object.prototype.hasOwnProperty.call(dirty.changes, column.key)) continue;
        if (hasMiddleRawFormulaValue(row, column)) continue;
        const value = getMiddleDisplayCellValue(row, column);
        if (String(value ?? '').trim() !== '') changes[column.key] = value;
      }
      if (!Object.keys(changes).length) return null;
      return { primaryKey: { key: primaryKey, value: primaryValue }, changes };
    })
    .filter(Boolean);
}

function mergeMiddleUpdates(updates, formulaUpdates) {
  const merged = new Map();
  const addUpdate = update => {
    const key = String(update?.primaryKey?.value ?? '');
    if (!key) return;
    if (!merged.has(key)) {
      merged.set(key, { primaryKey: update.primaryKey, changes: {} });
    }
    Object.assign(merged.get(key).changes, update.changes || {});
  };
  updates.forEach(addUpdate);
  formulaUpdates.forEach(addUpdate);
  return [...merged.values()].filter(update => Object.keys(update.changes || {}).length);
}

async function saveMiddleTableChanges() {
  const validationError = validateMiddleChanges();
  middleErrorText.value = '';
  middleSaveStatusText.value = '';

  if (validationError) {
    middleErrorText.value = validationError;
    return;
  }

  const inserts = (selectedMiddleTable.value?.rows || [])
    .filter(row => row.__isNew)
    .map(row => ({ changes: getMiddleInsertChanges(row) }));
  const updates = mergeMiddleUpdates(
    Object.values(middleDirtyRows).filter(item => Object.keys(item.changes || {}).length),
    getMiddleFormulaUpdates()
  );
  const deletes = Object.values(middlePendingDeletes);
  if ((!inserts.length && !updates.length && !deletes.length) || !selectedMiddleTable.value) return;

  isMiddleSaving.value = true;
  try {
    const response = await fetch('/api/middle-platform/table-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableName: selectedMiddleTable.value.key,
        operator: currentUser.value || {},
        inserts,
        updates,
        deletes
      })
    });
	    const data = await response.json();
	    if (!response.ok) throw new Error(data.error || '保存失败');
	    await loadMiddlePlatform();
	    await revealSavedMiddleRow(data);
	    middleSaveStatusText.value = formatMiddleSaveStatus(data);
	  } catch (error) {
	    middleErrorText.value = error?.message || String(error);
	  } finally {
	    isMiddleSaving.value = false;
	  }
}

function formatMiddleSaveStatus(data) {
  const tableName = data.tableName || selectedMiddleTable.value?.databaseName || selectedMiddleTable.value?.key || '';
  const primaryKey = data.primaryKey || selectedMiddleTable.value?.primaryKey || 'id';
  const parts = [
    `已保存：新增 ${data.inserted || 0} 行，修改 ${data.updated || 0} 行，删除 ${data.deleted || 0} 行`
  ];
  const idParts = [];
  if (data.insertedIds?.length) idParts.push(`新增${primaryKey}：${data.insertedIds.join('、')}`);
  if (data.updatedIds?.length) idParts.push(`修改${primaryKey}：${data.updatedIds.join('、')}`);
  if (data.deletedIds?.length) idParts.push(`删除${primaryKey}：${data.deletedIds.join('、')}`);
  if (tableName || idParts.length) {
    parts.push(`表：${tableName}${idParts.length ? `；${idParts.join('；')}` : ''}`);
  }
  return parts.join('。');
}

function getUniqueMiddleValues(key) {
  const rows = selectedMiddleTable.value?.rows || [];
  return [...new Set(rows.flatMap(row => parseMiddleFilterValues(row[key])).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'zh-CN')
  );
}

function isMiddleSingleFilterColumn(column) {
  return isMiddleSingleSelectColumn(column);
}

function isMiddleMultiFilterColumn(column) {
  return isMiddleMultiSelectColumn(column);
}

function isMiddleMultiSelectColumn(column) {
  if (column?.fieldKind === 'multi') return true;
  if (!column || column.enumValues?.length) return false;
  if (!Array.isArray(column.selectOptions) || !column.selectOptions.length) return false;
  const dataType = String(column.dataType || '').toLowerCase();
  const columnType = String(column.columnType || '').toLowerCase();
  return dataType === 'json' || columnType === 'json';
}

function isMiddleSingleSelectColumn(column) {
  if (column?.fieldKind === 'single' || column?.fieldKind === 'relation') return true;
  if (!column || isMiddleMultiSelectColumn(column)) return false;
  return Boolean(column.enumValues?.length || column.selectOptions?.length);
}

function getMiddleSingleSelectOptions(column) {
  if (column?.selectOptions?.length) return column.selectOptions;
  if (column?.enumValues?.length) return column.enumValues;
  return [];
}

function isMiddleFormulaColumn(column) {
  return Boolean(column?.formulaConfig?.expression);
}

function hasMiddleRawFormulaValue(row, column) {
  const raw = row?.__formulaRaw?.[column.key];
  return raw !== undefined && raw !== null && String(raw).trim() !== '';
}

function isMiddleFormulaCalculated(row, column) {
  return isMiddleFormulaColumn(column) && !hasMiddleRawFormulaValue(row, column);
}

function getMiddleDisplayCellValue(row, column) {
  if (!isMiddleFormulaColumn(column)) return row?.[column.key];
  if (hasMiddleRawFormulaValue(row, column)) return row.__formulaRaw[column.key];
  const calculated = calculateMiddleFormulaValue(row, column);
  return calculated === '' ? row?.[column.key] : calculated;
}

function updateMiddleFormulaCell(row, column, value) {
  row[column.key] = value;
  if (row.__formulaRaw) row.__formulaRaw[column.key] = value;
  markMiddleCellDirty(row, column.key);
}

function calculateMiddleFormulaValue(row, column) {
  const expression = String(column?.formulaConfig?.expression || '').trim();
  if (!expression) return '';
  if (isAdvancedMiddleFormulaExpression(expression)) {
    return calculateAdvancedMiddleFormulaValue(row, expression);
  }
  if (/\{(?!this\.)[^{}]+\}/.test(expression)) {
    return row?.[column.key] ?? '';
  }

  let safeExpression = expression.replace(/\{([^{}]+)\}/g, (_, token) => {
    const parts = token.split('.').map(part => part.trim()).filter(Boolean);
    if (parts.length === 2 && parts[0] === 'this') {
      return String(toFormulaNumber(row?.[parts[1]]));
    }
    return String(toFormulaNumber(row?.[column.key]));
  });

  if (/[^0-9+\-*/().,\s]/.test(safeExpression)) return '';
  try {
    const value = Function(`"use strict"; return (${safeExpression});`)();
    if (!Number.isFinite(Number(value))) return '';
    return String(Number(value.toFixed ? value.toFixed(2) : value));
  } catch {
    return '';
  }
}

function isAdvancedMiddleFormulaExpression(expression) {
  return /\b(days|today|if|empty|sumif|countif|countdistinctif|avgif|maxif|minif|listif|lookup|lookupdistinct|dateadd|workdayadd|monthlabel|eq|max|rentaldays)\s*\(/i.test(String(expression || ''));
}

function calculateAdvancedMiddleFormulaValue(row, expression) {
  const value = evaluateMiddleFormulaValue(row, expression);
  if (value === '') return '';
  if (Number.isFinite(Number(value))) return String(Number(Number(value).toFixed(2)));
  return String(value);
}

function evaluateMiddleFormulaValue(row, expression) {
  const text = String(expression || '').trim();
  const ifArgs = parseMiddleFormulaFunctionArgs(text, 'if');
  if (ifArgs) {
    if (ifArgs.length !== 3) return '';
    return evaluateMiddleFormulaCondition(row, ifArgs[0])
      ? evaluateMiddleFormulaValue(row, ifArgs[1])
      : evaluateMiddleFormulaValue(row, ifArgs[2]);
  }
  const stringMatch = text.match(/^"([^"]*)"$/);
  if (stringMatch) return stringMatch[1];
  if (parseMiddleFormulaFunctionArgs(text, 'sumif')) return '';
  if (parseMiddleFormulaFunctionArgs(text, 'countif')) return '';
  if (parseMiddleFormulaFunctionArgs(text, 'countdistinctif')) return '';
  if (parseMiddleFormulaFunctionArgs(text, 'avgif')) return '';
  if (parseMiddleFormulaFunctionArgs(text, 'maxif')) return '';
  if (parseMiddleFormulaFunctionArgs(text, 'minif')) return '';
  if (parseMiddleFormulaFunctionArgs(text, 'listif')) return '';
  if (parseMiddleFormulaFunctionArgs(text, 'lookup')) return '';
  if (parseMiddleFormulaFunctionArgs(text, 'lookupdistinct')) return '';
  const dateAddArgs = parseMiddleFormulaFunctionArgs(text, 'dateadd');
  if (dateAddArgs) return evaluateMiddleFormulaDateAdd(row, dateAddArgs);
  const workdayAddArgs = parseMiddleFormulaFunctionArgs(text, 'workdayadd');
  if (workdayAddArgs) return evaluateMiddleFormulaWorkdayAdd(row, workdayAddArgs);
  const monthLabelArgs = parseMiddleFormulaFunctionArgs(text, 'monthlabel');
  if (monthLabelArgs) return evaluateMiddleFormulaMonthLabel(row, monthLabelArgs);
  const maxArgs = parseMiddleFormulaFunctionArgs(text, 'max');
  if (maxArgs) {
    const values = maxArgs.map(arg => Number(evaluateMiddleFormulaValue(row, arg)));
    if (values.some(value => !Number.isFinite(value))) return '';
    return Math.max(...values);
  }
  if (/[+\-*/]/.test(text) && /\{[^{}]+\}/.test(text)) {
    return evaluateMiddleFormulaNumericExpression(row, text);
  }
  return evaluateMiddleFormulaTerm(row, text);
}

function formatMiddleFormulaDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function evaluateMiddleFormulaDateAdd(row, args) {
  if (args.length !== 3) return '';
  const date = evaluateMiddleFormulaDateArg(row, args[0]);
  const amount = Number(String(args[1] || '').trim());
  const unitMatch = String(args[2] || '').trim().match(/^"?(day|month)"?$/i);
  if (!date || !Number.isFinite(amount) || !unitMatch) return '';
  const result = new Date(date.getTime());
  if (unitMatch[1].toLowerCase() === 'month') {
    result.setMonth(result.getMonth() + Math.trunc(amount));
  } else {
    result.setDate(result.getDate() + Math.trunc(amount));
  }
  return formatMiddleFormulaDate(result);
}

function evaluateMiddleFormulaWorkdayAdd(row, args) {
  if (args.length !== 2) return '';
  const date = evaluateMiddleFormulaDateArg(row, args[0]);
  const amount = Number(String(args[1] || '').trim());
  if (!date || !Number.isFinite(amount) || amount < 0) return '';
  const result = new Date(date.getTime());
  let remaining = Math.trunc(amount);
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return formatMiddleFormulaDate(result);
}

function evaluateMiddleFormulaMonthLabel(row, args) {
  if (args.length !== 1) return '';
  const date = evaluateMiddleFormulaDateArg(row, args[0]);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}年${month}月`;
}

function evaluateMiddleFormulaNumericExpression(row, expression) {
  const safeExpression = String(expression || '').replace(/\{([^{}]+)\}/g, (_, token) => {
    const parts = token.split('.').map(part => part.trim()).filter(Boolean);
    if (parts.length === 2 && parts[0] === 'this') return String(toFormulaNumber(row?.[parts[1]]));
    return '0';
  });
  if (/[^0-9+\-*/().,\s]/.test(safeExpression)) return '';
  try {
    const value = Function(`"use strict"; return (${safeExpression});`)();
    return Number.isFinite(Number(value)) ? Number(value) : '';
  } catch {
    return '';
  }
}

function evaluateMiddleFormulaCondition(row, condition) {
  const emptyArgs = parseMiddleFormulaFunctionArgs(condition, 'empty');
  if (emptyArgs) {
    if (emptyArgs.length !== 1) return false;
    return evaluateMiddleFormulaRawValue(row, emptyArgs[0]) === '';
  }
  const eqArgs = parseMiddleFormulaFunctionArgs(condition, 'eq');
  if (eqArgs) {
    if (eqArgs.length !== 2) return false;
    return evaluateMiddleFormulaRawValue(row, eqArgs[0]) === evaluateMiddleFormulaRawValue(row, eqArgs[1]);
  }
  const match = String(condition || '').trim().match(/^(.+?)\s*(>=|<=|==|=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return false;
  const left = Number(evaluateMiddleFormulaTerm(row, match[1]));
  const right = Number(match[3]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  switch (match[2]) {
    case '>': return left > right;
    case '<': return left < right;
    case '>=': return left >= right;
    case '<=': return left <= right;
    case '=':
    case '==': return left === right;
    default: return false;
  }
}

function evaluateMiddleFormulaTerm(row, term) {
  const text = String(term || '').trim();
  const rentalDaysArgs = parseMiddleFormulaFunctionArgs(text, 'rentaldays');
  if (rentalDaysArgs) {
    if (rentalDaysArgs.length !== 2) return '';
    const startDate = evaluateMiddleFormulaDateTimeArg(row, rentalDaysArgs[0]);
    const endDate = evaluateMiddleFormulaDateTimeArg(row, rentalDaysArgs[1]);
    if (!startDate || !endDate) return '';
    const minutes = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
    if (minutes <= 0) return 0;
    const wholeDays = Math.floor(minutes / 1440);
    const rest = minutes % 1440;
    return wholeDays + (rest === 0 ? 0 : rest <= 300 ? 0.5 : 1);
  }
  const daysArgs = parseMiddleFormulaFunctionArgs(text, 'days');
  if (daysArgs) {
    if (daysArgs.length !== 2) return '';
    const endDate = evaluateMiddleFormulaDateArg(row, daysArgs[0]);
    const startDate = evaluateMiddleFormulaDateArg(row, daysArgs[1]);
    if (!endDate || !startDate) return '';
    return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000);
  }
  return toFormulaNumber(text);
}

function evaluateMiddleFormulaDateArg(row, value) {
  const text = String(value || '').trim();
  if (/^today\(\)$/i.test(text)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const tokenMatch = text.match(/^\{([^{}]+)\}$/);
  if (tokenMatch) {
    const parts = tokenMatch[1].split('.').map(part => part.trim()).filter(Boolean);
    if (parts.length === 2 && parts[0] === 'this') return toMiddleFormulaDate(row?.[parts[1]]);
    return null;
  }
  return toMiddleFormulaDate(text);
}

function evaluateMiddleFormulaDateTimeArg(row, value) {
  const text = String(value || '').trim();
  if (/^today\(\)$/i.test(text)) return new Date();
  const tokenMatch = text.match(/^\{([^{}]+)\}$/);
  if (tokenMatch) {
    const parts = tokenMatch[1].split('.').map(part => part.trim()).filter(Boolean);
    if (parts.length === 2 && parts[0] === 'this') {
      const raw = row?.[parts[1]];
      if (raw === undefined || raw === null || raw === '') return null;
      const date = raw instanceof Date ? raw : new Date(raw);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function evaluateMiddleFormulaRawValue(row, value) {
  const text = String(value || '').trim();
  const tokenMatch = text.match(/^\{([^{}]+)\}$/);
  if (!tokenMatch) return text;
  const parts = tokenMatch[1].split('.').map(part => part.trim()).filter(Boolean);
  if (parts.length === 2 && parts[0] === 'this') {
    const raw = row?.[parts[1]];
    return raw === undefined || raw === null ? '' : String(raw).trim();
  }
  return '';
}

function parseMiddleFormulaFunctionArgs(expression, functionName) {
  const text = String(expression || '').trim();
  const prefix = `${functionName}(`;
  if (!text.toLowerCase().startsWith(prefix) || !text.endsWith(')')) return null;
  return splitMiddleFormulaArguments(text.slice(prefix.length, -1));
}

function splitMiddleFormulaArguments(source) {
  const args = [];
  let current = '';
  let depth = 0;
  let inString = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      inString = !inString;
      current += char;
      continue;
    }
    if (!inString && char === '(') depth += 1;
    if (!inString && char === ')') depth -= 1;
    if (!inString && depth === 0 && char === ',') {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim() || source.trim()) args.push(current.trim());
  return args;
}

function toMiddleFormulaDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toFormulaNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const normalized = String(value).replace(/,/g, '').trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function isMiddleFileLikeColumn(column) {
  if (['image', 'file'].includes(column?.fieldKind)) return true;
  const text = `${column?.key || ''} ${column?.label || ''}`.toLowerCase();
  return [
    'file',
    'image',
    'img',
    'photo',
    'photos',
    'attachment',
    'attachments',
    'picture',
    'pictures',
    '文件',
    '图片',
    '照片',
    '附件',
    '影像',
    '凭证',
    '票据',
    '保单'
  ].some(token => text.includes(token));
}

function parseMiddleFilterValues(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap(item => parseMiddleFilterValues(item));
  if (typeof value === 'object') {
    const preferred = value.name || value.title || value.label || value.text || value.value || value.url;
    return [String(preferred || JSON.stringify(value))];
  }

  const raw = String(value).trim();
  if (!raw) return [];
  if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
    try {
      return parseMiddleFilterValues(JSON.parse(raw));
    } catch {}
  }
  if (raw.includes(',')) {
    return raw.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [raw];
}

function matchesMiddleFieldFilter(row) {
  const field = middleFilterField.value;
  if (!field) return true;

  const rowValues = parseMiddleFilterValues(row[field]);
  if (isMiddleMultiFilter.value) {
    if (!middleFilterValues.value.length) return true;
    return middleFilterValues.value.some(value => rowValues.includes(value));
  }

  if (!middleFilterValue.value) return true;
  return rowValues.includes(middleFilterValue.value);
}

function isMiddleTagColumn(key) {
  return ['vehicle_category', 'recommended_fuel', 'vehicle_status', 'source', 'key_check', 'spring_festival_available'].includes(key);
}

function middleTagClass(key, value) {
  const raw = String(value || '');
  if (key === 'vehicle_category') {
    if (raw === '超跑') return 'red';
    if (raw === '性能车') return 'yellow';
    if (raw === '新能源') return 'cyan';
    if (raw.includes('SUV')) return 'gray';
    if (raw.includes('轿车')) return 'blue';
    return 'green';
  }
  if (key === 'recommended_fuel') {
    if (raw === '新能源') return 'cyan';
    if (raw === '98') return 'red';
    if (raw === '95') return 'orange';
    return 'gray';
  }
  if (key === 'vehicle_status') {
    if (raw === '在库') return 'green';
    if (raw === '出车') return 'orange';
    if (raw === '维修中') return 'purple';
    if (raw === '停运' || raw === '已出售') return 'red';
    return 'blue';
  }
  if (key === 'source') {
    if (raw === '自由') return 'green';
    if (raw === '挂靠') return 'blue';
    if (raw === '同行') return 'orange';
    if (raw === '抵押') return 'purple';
    return 'gray';
  }
  return raw === '是' || raw === '在店' || raw === '在' ? 'green' : 'blue';
}

function formatMiddleValue(key, value) {
  if (value === null || value === undefined || value === '') return '';
  if (['rzdj', 'cgldj', 'gcj', 'bzcb'].includes(key)) {
    return `¥${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
  }
  return String(value);
}

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
    writeStoredUser(data.user, data.expiresAt, data.expireHours);
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
  navigatePage('home');
  clearForm();
  clearBalanceForm();
  clearStatementForm();
  clearAccountState();
}

function writeStoredUser(user, expiresAt, expireHours = DEFAULT_LOGIN_EXPIRE_HOURS) {
  const safeExpireHours = Number(expireHours || DEFAULT_LOGIN_EXPIRE_HOURS);
  const safeExpiresAt = Number(expiresAt || 0) || Date.now() + safeExpireHours * 60 * 60 * 1000;
  localStorage.setItem(STORED_USER_KEY, JSON.stringify({
    user,
    expiresAt: safeExpiresAt
  }));
}

function readStoredUser() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORED_USER_KEY) || 'null');
    if (!stored) return null;
    if (!stored.user || !stored.expiresAt || Date.now() >= Number(stored.expiresAt)) {
      localStorage.removeItem(STORED_USER_KEY);
      return null;
    }
    return stored.user;
  } catch {
    localStorage.removeItem(STORED_USER_KEY);
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
    pushConfig.webhook = data.webhook || '';
    pushConfigStatusText.value = '推送配置已保存';
  } catch (error) {
    pushConfigErrorText.value = error?.message || String(error);
  } finally {
    isPushConfigLoading.value = false;
  }
}

async function loadHealthStatus() {
  if (!isAdministrator.value) return;

  healthErrorText.value = '';
  isHealthLoading.value = true;

  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    healthStatus.value = data;
    if (!response.ok) {
      throw new Error(data.error || '系统健康检查发现异常');
    }
  } catch (error) {
    healthErrorText.value = error?.message || String(error);
  } finally {
    isHealthLoading.value = false;
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
    for (const group of historyGroups.value) {
      if (!historyDateFilters[group.type]) historyDateFilters[group.type] = '';
      historyOpenDates[group.type] = '';
    }
  } catch (error) {
    historyErrorText.value = error?.message || String(error);
  } finally {
    isHistoryLoading.value = false;
  }
}

function getVisibleHistoryDateGroups(group) {
  const selectedDate = historyDateFilters[group.type];
  const dateGroups = group.dateGroups || [];
  if (!selectedDate) return dateGroups;
  return dateGroups.filter(item => item.date === selectedDate);
}

function openHistoryDate(type) {
  const selectedDate = historyDateFilters[type];
  if (selectedDate) historyOpenDates[type] = selectedDate;
}

function isHistoryDateOpen(type, date) {
  return historyOpenDates[type] === date;
}

function syncHistoryDateOpen(type, date, event) {
  if (event.target.open) {
    historyOpenDates[type] = date;
  } else if (historyOpenDates[type] === date) {
    historyOpenDates[type] = '';
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
    if (!result.history) {
      if (result.type === 'statement') {
        await saveZdRecord();
      } else if (result.type === 'balance') {
        await saveWkdRecord();
      } else {
        await saveDjdRecord();
      }
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

async function loadTableManagement() {
  tableConfigErrorText.value = '';
  tableConfigStatusText.value = '';
  isTableConfigLoading.value = true;

  try {
    const response = await fetch('/api/table-management');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '读取表格配置失败');
    tableConfigItems.value = (data.tables || []).map(table => ({
      ...table,
      visibleFields: Array.isArray(table.visibleFields)
        ? table.visibleFields.filter(field => !isHiddenTableConfigColumn(field))
        : [],
      visibleDepartments: normalizeTableVisibleDepartments(table.visibleDepartments),
      fieldProperties: table.fieldProperties && typeof table.fieldProperties === 'object' ? table.fieldProperties : {},
      columns: (table.columns || []).map(column => ({
        ...column,
        showFieldKindTag: table.fieldProperties?.[column.key]?.tagged ?? defaultShouldShowFieldKindTag(column)
      }))
    }));
    tableConfigDirectory.value = 'visible';
    if (!filteredTableConfigItems.value.some(table => table.tableName === activeTableConfigName.value)) {
      activeTableConfigName.value = filteredTableConfigItems.value[0]?.tableName || '';
    }
  } catch (error) {
    tableConfigErrorText.value = error?.message || String(error);
  } finally {
    isTableConfigLoading.value = false;
  }
}

function selectTableConfig(tableName) {
  activeTableConfigName.value = tableName;
}

function sortTableConfigItems(tables) {
  return [...tables].sort((a, b) => {
    const sortA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 0;
    const sortB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;
    if (sortA !== sortB) return sortA - sortB;
    return String(a.tableName || '').localeCompare(String(b.tableName || ''));
  });
}

function toggleTableConfigDirectory() {
  tableConfigDirectory.value = tableConfigDirectory.value === 'hidden' ? 'visible' : 'hidden';
  tableConfigSearchText.value = '';
  activeTableConfigName.value = filteredTableConfigItems.value[0]?.tableName || '';
}

function toggleTableField(table, field) {
  const fields = new Set(table.visibleFields || []);
  if (fields.has(field)) {
    fields.delete(field);
  } else {
    fields.add(field);
  }
  table.visibleFields = [...fields];
}

function selectAllTableFields(table) {
  table.visibleFields = table.columns
    .filter(column => !isHiddenTableConfigColumn(column.key))
    .map(column => column.key);
}

function clearTableFields(table) {
  table.visibleFields = [];
}

function cloneFieldProperties(properties = {}) {
  return JSON.parse(JSON.stringify(properties || {}));
}

function createDefaultFieldProperty(column = {}) {
  return {
    tagged: column.showFieldKindTag ?? defaultShouldShowFieldKindTag(column)
  };
}

function normalizeTableVisibleDepartments(departments) {
  const normalized = uniqueClientStrings(departments || []);
  return normalized.length ? normalized : [...tableDepartmentOptions.value];
}

function openTablePropertyConfig(table) {
  tablePropertyConfig.isOpen = true;
  tablePropertyConfig.tableName = table.tableName;
  tablePropertyConfig.tableLabel = table.tableLabel || table.tableName;
  tablePropertyConfig.visibleDepartments = normalizeTableVisibleDepartments(table.visibleDepartments);
  tablePropertyConfig.originalVisibleDepartments = [...tablePropertyConfig.visibleDepartments];
  tablePropertyConfig.fieldProperties = {};
  for (const column of table.columns || []) {
    if (isHiddenTableConfigColumn(column.key)) continue;
    tablePropertyConfig.fieldProperties[column.key] = createDefaultFieldProperty(column);
  }
  tablePropertyConfig.originalFieldProperties = cloneFieldProperties(tablePropertyConfig.fieldProperties);
}

function closeTablePropertyConfig() {
  tablePropertyConfig.isOpen = false;
}

function getTableFieldProperty(column) {
  if (!tablePropertyConfig.fieldProperties[column.key]) {
    tablePropertyConfig.fieldProperties[column.key] = createDefaultFieldProperty(column);
  }
  return tablePropertyConfig.fieldProperties[column.key];
}

function toggleTableVisibleDepartment(department) {
  const departments = new Set(tablePropertyConfig.visibleDepartments || []);
  if (departments.has(department)) departments.delete(department);
  else departments.add(department);
  tablePropertyConfig.visibleDepartments = [...departments];
}

function resetTablePropertyConfig() {
  tablePropertyConfig.visibleDepartments = [...tablePropertyConfig.originalVisibleDepartments];
  tablePropertyConfig.fieldProperties = cloneFieldProperties(tablePropertyConfig.originalFieldProperties);
}

function applyTablePropertyConfig() {
  const table = tableConfigItems.value.find(item => item.tableName === tablePropertyConfig.tableName);
  if (!table) {
    closeTablePropertyConfig();
    return;
  }
  table.visibleDepartments = uniqueClientStrings(tablePropertyConfig.visibleDepartments);
  table.fieldProperties = cloneFieldProperties(tablePropertyConfig.fieldProperties);
  for (const column of table.columns || []) {
    const property = table.fieldProperties[column.key];
    if (!property) continue;
    column.showFieldKindTag = property.tagged === true;
    if (property.tagged && !defaultShouldShowFieldKindTag(column)) {
      column.fieldKind = 'relation';
    }
  }
  tableConfigStatusText.value = '表属性配置已更新，点击保存配置后生效';
  tableConfigErrorText.value = '';
  closeTablePropertyConfig();
}

function isHiddenTableConfigColumn(key) {
  return ['create_time', 'update_time', 'status'].includes(String(key || ''));
}

function isTableConfigSingleColumn(column) {
  return isMiddleSingleSelectColumn(column);
}

function isTableConfigMultiColumn(column) {
  return isMiddleMultiSelectColumn(column);
}

function isTableConfigSelectableColumn(column) {
  return isTableConfigOptionCandidate(column) || isTableConfigSingleColumn(column) || isTableConfigMultiColumn(column);
}

function isTableConfigOptionCandidate(column) {
  return !isHiddenTableConfigColumn(column?.key) && !isMiddleFileLikeColumn(column);
}

function isTableConfigFormulaColumn(column) {
  return Boolean(column?.formulaConfig?.expression);
}

function isTableConfigFormulaCandidate(column) {
  return !isHiddenTableConfigColumn(column?.key);
}

function shouldShowFieldKindTag(column) {
  if (typeof column?.showFieldKindTag === 'boolean') return column.showFieldKindTag;
  return defaultShouldShowFieldKindTag(column);
}

function defaultShouldShowFieldKindTag(column) {
  return !['text', 'date'].includes(getFieldKind(column));
}

function getFieldKind(column) {
  if (column?.fieldKind) return column.fieldKind;
  if (isTableConfigFormulaColumn(column)) return 'calc';
  if (isTableConfigMultiColumn(column)) return 'multi';
  if (isTableConfigSingleColumn(column)) return 'single';
  const dataType = String(column?.dataType || '').toLowerCase();
  if (['date', 'datetime', 'timestamp'].includes(dataType)) return 'date';
  if (isMiddleFileLikeColumn(column)) return 'file';
  return 'text';
}

function getFieldKindLabel(column) {
  const kind = getFieldKind(column);
  return fieldKindOptions.find(option => option.value === kind)?.label || '文本';
}

function shouldShowFormulaButton(column) {
  return getFieldKind(column) === 'calc' && isTableConfigFormulaCandidate(column);
}

function shouldShowFieldOptionButton(column) {
  return ['single', 'multi', 'relation'].includes(getFieldKind(column));
}

function openFieldKindMenu(table, column, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const menuWidth = 96;
  fieldKindMenu.isOpen = true;
  fieldKindMenu.tableName = table.tableName;
  fieldKindMenu.columnKey = column.key;
  fieldKindMenu.currentKind = getFieldKind(column);
  fieldKindMenu.left = Math.round(Math.min(rect.left, window.innerWidth - menuWidth - 8));
  fieldKindMenu.top = Math.round(rect.bottom + 6);
}

function closeFieldKindMenu() {
  fieldKindMenu.isOpen = false;
}

function selectFieldKind(kind) {
  const table = tableConfigItems.value.find(item => item.tableName === fieldKindMenu.tableName);
  const column = table?.columns?.find(item => item.key === fieldKindMenu.columnKey);
  if (!column) {
    closeFieldKindMenu();
    return;
  }
  column.fieldKind = kind;
  if (kind === 'single') {
    column.enumValues = column.enumValues || [];
    column.selectOptions = column.selectOptions || [];
  }
  if (kind === 'multi') {
    column.selectOptions = column.selectOptions || [];
  }
  if (kind === 'relation') {
    column.selectOptions = column.selectOptions || [];
    column.optionConfig = column.optionConfig || { type: 'table', sourceTableName: '', sourceColumnName: '' };
  }
  if (kind === 'calc' && !column.formulaConfig) {
    column.formulaConfig = { expression: '', dependencies: [], isEnabled: false };
  }
  tableConfigStatusText.value = '字段类型标签已更新，点击保存配置后生效';
  tableConfigErrorText.value = '';
  closeFieldKindMenu();
}

function getTableConfigColumnOptions(column) {
  if (isTableConfigMultiColumn(column)) return column.selectOptions || [];
  if (isTableConfigSingleColumn(column)) return getMiddleSingleSelectOptions(column);
  return [];
}

function openFieldOptionConfig(table, column) {
  const options = getTableConfigColumnOptions(column);
  fieldOptionConfig.isOpen = true;
  fieldOptionConfig.tableName = table.tableName;
  fieldOptionConfig.tableLabel = table.tableLabel || table.tableName;
  fieldOptionConfig.columnKey = column.key;
  fieldOptionConfig.columnLabel = column.label || column.key;
  fieldOptionConfig.typeLabel = isTableConfigMultiColumn(column) ? '多选字段' : (getFieldKind(column) === 'relation' ? '关联字段' : '单选字段');
  fieldOptionConfig.optionText = options.join('\n');
  fieldOptionConfig.originalOptionText = fieldOptionConfig.optionText;
  fieldOptionConfig.mode = column.optionConfig?.type === 'lookup' ? 'lookup' : (column.optionConfig?.type === 'table' ? 'table' : 'static');
  fieldOptionConfig.originalMode = fieldOptionConfig.mode;
  fieldOptionConfig.sourceTableName = column.optionConfig?.sourceTableName || '';
  fieldOptionConfig.originalSourceTableName = fieldOptionConfig.sourceTableName;
  fieldOptionConfig.sourceColumnName = column.optionConfig?.sourceColumnName || '';
  fieldOptionConfig.originalSourceColumnName = fieldOptionConfig.sourceColumnName;
  const lookupConfig = column.optionConfig?.lookupConfig || parseLookupConfigFromExpression(column.formulaConfig?.expression);
  fieldOptionConfig.lookupSourceTableName = lookupConfig.sourceTableName || '';
  fieldOptionConfig.originalLookupSourceTableName = fieldOptionConfig.lookupSourceTableName;
  fieldOptionConfig.lookupResultColumnName = lookupConfig.resultColumnName || '';
  fieldOptionConfig.originalLookupResultColumnName = fieldOptionConfig.lookupResultColumnName;
  fieldOptionConfig.lookupConditions = normalizeLookupConditions(lookupConfig);
  fieldOptionConfig.originalLookupConditions = cloneLookupConditions(fieldOptionConfig.lookupConditions);
  fieldOptionConfig.lookupAggregate = lookupConfig.aggregate || 'raw';
  fieldOptionConfig.originalLookupAggregate = fieldOptionConfig.lookupAggregate;
}

function closeFieldOptionConfig() {
  fieldOptionConfig.isOpen = false;
}

function resetFieldOptionConfig() {
  fieldOptionConfig.optionText = fieldOptionConfig.originalOptionText;
  fieldOptionConfig.mode = fieldOptionConfig.originalMode;
  fieldOptionConfig.sourceTableName = fieldOptionConfig.originalSourceTableName;
  fieldOptionConfig.sourceColumnName = fieldOptionConfig.originalSourceColumnName;
  fieldOptionConfig.lookupSourceTableName = fieldOptionConfig.originalLookupSourceTableName;
  fieldOptionConfig.lookupResultColumnName = fieldOptionConfig.originalLookupResultColumnName;
  fieldOptionConfig.lookupConditions = cloneLookupConditions(fieldOptionConfig.originalLookupConditions);
  fieldOptionConfig.lookupAggregate = fieldOptionConfig.originalLookupAggregate;
}

function parseFieldOptionText(value) {
  const result = [];
  const seen = new Set();
  String(value || '')
    .split(/\n/g)
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(item => {
      if (seen.has(item)) return;
      seen.add(item);
      result.push(item);
    });
  return result;
}

function createLookupCondition(values = {}) {
  return {
    id: values.id || `lookup-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceMatchColumnName: values.sourceMatchColumnName || '',
    conditionOperator: values.conditionOperator || 'eq',
    currentMatchColumnName: values.currentMatchColumnName || ''
  };
}

function cloneLookupConditions(conditions) {
  return (conditions || []).map(condition => createLookupCondition({
    sourceMatchColumnName: condition.sourceMatchColumnName,
    conditionOperator: condition.conditionOperator,
    currentMatchColumnName: condition.currentMatchColumnName
  }));
}

function normalizeLookupConditions(config = {}) {
  const rawConditions = Array.isArray(config.conditions) && config.conditions.length
    ? config.conditions
    : [{
        sourceMatchColumnName: config.sourceMatchColumnName || '',
        conditionOperator: config.conditionOperator || 'eq',
        currentMatchColumnName: config.currentMatchColumnName || ''
      }];
  return rawConditions.map(condition => createLookupCondition(condition));
}

function addLookupCondition() {
  fieldOptionConfig.lookupConditions.push(createLookupCondition());
}

function removeLookupCondition(index) {
  if (fieldOptionConfig.lookupConditions.length <= 1) return;
  fieldOptionConfig.lookupConditions.splice(index, 1);
}

function handleLookupConditionOperatorChange(condition) {
  if (!isLookupConditionNeedsCurrentField(condition)) {
    condition.currentMatchColumnName = '';
  }
}

function isLookupConditionNeedsCurrentField(condition) {
  return !['empty', 'notEmpty'].includes(condition?.conditionOperator || 'eq');
}

function parseLookupConditionsFromArgs(args, hasResultColumn) {
  const conditionArgs = hasResultColumn ? args.slice(0, -1) : args;
  const conditions = [];
  for (let index = 0; index < conditionArgs.length;) {
    const sourceMatch = parseLookupQualifiedColumn(conditionArgs[index]);
    if (!sourceMatch) return [];
    const conditionOperator = parseLookupConditionOperator(conditionArgs[index + 1]);
    if (conditionOperator) {
      const currentMatch = parseLookupCurrentColumn(conditionArgs[index + 2]);
      if (!['empty', 'notEmpty'].includes(conditionOperator) && !currentMatch) return [];
      conditions.push(createLookupCondition({
        sourceMatchColumnName: sourceMatch.columnName,
        conditionOperator,
        currentMatchColumnName: currentMatch
      }));
      index += 3;
      continue;
    }
    const currentMatch = parseLookupCurrentColumn(conditionArgs[index + 1]);
    if (!currentMatch) return [];
    conditions.push(createLookupCondition({
      sourceMatchColumnName: sourceMatch.columnName,
      conditionOperator: 'eq',
      currentMatchColumnName: currentMatch
    }));
    index += 2;
  }
  return conditions;
}

function parseLookupConfigFromExpression(expression) {
  const text = String(expression || '').trim();
  const functionNames = [
    ['lookup', 'raw'],
    ['lookupdistinct', 'distinct'],
    ['sumif', 'sum'],
    ['countif', 'count'],
    ['countdistinctif', 'countDistinct'],
    ['avgif', 'avg'],
    ['maxif', 'max'],
    ['minif', 'min']
  ];
  for (const [functionName, aggregate] of functionNames) {
    const args = parseMiddleFormulaFunctionArgs(text, functionName);
    if (!args || args.length < 2) continue;
    if (aggregate === 'count') {
      const firstSourceMatch = parseLookupQualifiedColumn(args[0]);
      const conditions = parseLookupConditionsFromArgs(args, false);
      if (!firstSourceMatch || !conditions.length) continue;
      const firstCondition = conditions[0];
      return {
        sourceTableName: firstSourceMatch.tableName,
        sourceMatchColumnName: firstCondition.sourceMatchColumnName,
        conditionOperator: firstCondition.conditionOperator,
        currentMatchColumnName: firstCondition.currentMatchColumnName,
        resultColumnName: firstSourceMatch.columnName,
        conditions,
        aggregate
      };
    }
    if (args.length < 3) continue;
    const firstSourceMatch = parseLookupQualifiedColumn(args[0]);
    const conditions = parseLookupConditionsFromArgs(args, true);
    const result = parseLookupQualifiedColumn(args[args.length - 1]);
    if (!firstSourceMatch || !conditions.length || !result) continue;
    const firstCondition = conditions[0];
    return {
      sourceTableName: result.tableName || firstSourceMatch.tableName,
      sourceMatchColumnName: firstCondition.sourceMatchColumnName,
      conditionOperator: firstCondition.conditionOperator,
      currentMatchColumnName: firstCondition.currentMatchColumnName,
      resultColumnName: result.columnName,
      conditions,
      aggregate
    };
  }
  return {};
}

function parseLookupQualifiedColumn(value) {
  const parts = String(value || '').trim().split('.').map(part => part.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return { tableName: parts[0], columnName: parts[1] };
}

function parseLookupCurrentColumn(value) {
  const match = String(value || '').trim().match(/^\{this\.([a-zA-Z0-9_]+)\}$/);
  return match ? match[1] : '';
}

function parseLookupConditionOperator(value) {
  const text = String(value || '').trim().replace(/^"|"$/g, '');
  return fieldLookupConditionOptions.some(option => option.value === text) ? text : '';
}

function buildLookupFieldExpression(config) {
  const sourceTableName = config.sourceTableName;
  const resultColumnName = config.resultColumnName;
  const aggregate = config.aggregate || 'raw';
  const conditions = normalizeLookupConditions(config);
  const conditionExpression = conditions.map((condition) => {
    const conditionOperator = condition.conditionOperator || 'eq';
    const compareArg = ['empty', 'notEmpty'].includes(conditionOperator) ? '""' : `{this.${condition.currentMatchColumnName}}`;
    return `${sourceTableName}.${condition.sourceMatchColumnName},"${conditionOperator}",${compareArg}`;
  }).join(',');
  if (aggregate === 'sum') return `sumif(${conditionExpression},${sourceTableName}.${resultColumnName})`;
  if (aggregate === 'count') return `countif(${conditionExpression})`;
  if (aggregate === 'countDistinct') return `countdistinctif(${conditionExpression},${sourceTableName}.${resultColumnName})`;
  if (aggregate === 'avg') return `avgif(${conditionExpression},${sourceTableName}.${resultColumnName})`;
  if (aggregate === 'max') return `maxif(${conditionExpression},${sourceTableName}.${resultColumnName})`;
  if (aggregate === 'min') return `minif(${conditionExpression},${sourceTableName}.${resultColumnName})`;
  if (aggregate === 'distinct') return `lookupdistinct(${conditionExpression},${sourceTableName}.${resultColumnName})`;
  return `lookup(${conditionExpression},${sourceTableName}.${resultColumnName})`;
}

function applyFieldOptionConfig() {
  const table = tableConfigItems.value.find(item => item.tableName === fieldOptionConfig.tableName);
  const column = table?.columns?.find(item => item.key === fieldOptionConfig.columnKey);
  if (!table || !column) {
    closeFieldOptionConfig();
    return;
  }

  if (fieldOptionConfig.mode === 'lookup') {
    const lookupConditions = cloneLookupConditions(fieldOptionConfig.lookupConditions);
    const invalidCondition = lookupConditions.some(condition =>
      !condition.sourceMatchColumnName || (isLookupConditionNeedsCurrentField(condition) && !condition.currentMatchColumnName)
    );
    const firstCondition = lookupConditions[0] || createLookupCondition();
    const lookupConfig = {
      sourceTableName: fieldOptionConfig.lookupSourceTableName,
      resultColumnName: fieldOptionConfig.lookupResultColumnName,
      sourceMatchColumnName: firstCondition.sourceMatchColumnName,
      conditionOperator: firstCondition.conditionOperator || 'eq',
      currentMatchColumnName: firstCondition.currentMatchColumnName,
      conditions: lookupConditions.map(condition => ({
        sourceMatchColumnName: condition.sourceMatchColumnName,
        conditionOperator: condition.conditionOperator || 'eq',
        currentMatchColumnName: condition.currentMatchColumnName
      })),
      aggregate: fieldOptionConfig.lookupAggregate || 'raw'
    };
    if (!lookupConfig.sourceTableName || !lookupConfig.resultColumnName || !lookupConditions.length || invalidCondition) {
      tableConfigErrorText.value = '请选择引用表、引用字段，并补全所有匹配条件';
      return;
    }
    const expression = buildLookupFieldExpression(lookupConfig);
    column.optionConfig = {
      type: 'lookup',
      sourceTableName: '',
      sourceColumnName: '',
      lookupConfig
    };
    column.formulaConfig = {
      expression,
      dependencies: extractFormulaExpressionTokens(expression),
      isEnabled: true
    };
    column.fieldKind = 'relation';
  } else if (fieldOptionConfig.mode === 'table') {
    if (!fieldOptionConfig.sourceTableName || !fieldOptionConfig.sourceColumnName) {
      tableConfigErrorText.value = '请选择来源表和来源字段';
      return;
    }
    column.optionConfig = {
      type: 'table',
      sourceTableName: fieldOptionConfig.sourceTableName,
      sourceColumnName: fieldOptionConfig.sourceColumnName
    };
  } else {
    const options = parseFieldOptionText(fieldOptionConfig.optionText);
    column.optionConfig = { type: 'static', sourceTableName: '', sourceColumnName: '' };
    if (isTableConfigSingleColumn(column) || isTableConfigOptionCandidate(column)) {
      column.enumValues = options;
      column.selectOptions = options;
    } else if (isTableConfigMultiColumn(column)) {
      column.selectOptions = options;
    }
  }
  tableConfigStatusText.value = '字段配置已更新，点击保存配置后生效';
  tableConfigErrorText.value = '';
  closeFieldOptionConfig();
}

function openFormulaConfig(table, column) {
  const expression = String(column.formulaConfig?.expression || '');
  formulaConfig.isOpen = true;
  formulaConfig.tableName = table.tableName;
  formulaConfig.tableLabel = table.tableLabel || table.tableName;
  formulaConfig.columnKey = column.key;
  formulaConfig.columnLabel = column.label || column.key;
  formulaConfig.expression = expression;
  formulaConfig.originalExpression = expression;
  formulaConfig.currentFieldKey = '';
  formulaConfig.foreignTableName = '';
  formulaConfig.foreignColumnKey = '';
  formulaConfig.aggregate = 'sum';
}

function closeFormulaConfig() {
  formulaConfig.isOpen = false;
}

function resetFormulaConfig() {
  formulaConfig.expression = formulaConfig.originalExpression;
}

function clearFormulaConfig() {
  formulaConfig.expression = '';
}

function appendFormulaToken(token) {
  const current = formulaConfig.expression.trim();
  formulaConfig.expression = current ? `${current} ${token}` : token;
}

function insertCurrentFormulaField() {
  if (!formulaConfig.currentFieldKey) return;
  appendFormulaToken(`{this.${formulaConfig.currentFieldKey}}`);
}

function insertForeignFormulaField() {
  if (!formulaConfig.foreignTableName || !formulaConfig.foreignColumnKey) return;
  appendFormulaToken(`{${formulaConfig.foreignTableName}.${formulaConfig.foreignColumnKey}.${formulaConfig.aggregate || 'sum'}}`);
}

function looksLikeWecomFormula(expression) {
  const text = String(expression || '');
  return /\[[^\]]+\]/.test(text)
    || /\bIF\s*\(/.test(text)
    || /\bTEXT\s*\(/.test(text)
    || /\.ISBLANK\s*\(/i.test(text)
    || /\bTODAY\s*\(/.test(text);
}

function convertCurrentWecomFormula() {
  try {
    formulaConfig.expression = convertWecomFormulaExpression(formulaConfig.expression);
    tableConfigStatusText.value = '企业微信公式已转换，确认无误后点击保存配置';
    tableConfigErrorText.value = '';
  } catch (error) {
    tableConfigErrorText.value = error?.message || String(error);
  }
}

function convertWecomFormulaExpression(expression) {
  let text = String(expression || '').trim();
  if (!text) throw new Error('请先粘贴企业微信公式');
  text = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/，/g, ',');

  const currentTable = tableConfigItems.value.find(item => item.tableName === formulaConfig.tableName);
  const fieldMap = new Map();
  for (const column of currentTable?.columns || []) {
    const aliases = [
      column.label,
      column.key,
      String(column.label || '').replace(/\s+/g, ''),
      String(column.key || '').replace(/\s+/g, '')
    ];
    for (const alias of aliases) {
      const key = normalizeWecomFormulaFieldName(alias);
      if (key && !fieldMap.has(key)) fieldMap.set(key, column.key);
    }
  }

  text = text.replace(/\[([^\]]+)\]/g, (_, rawName) => {
    const normalizedName = normalizeWecomFormulaFieldName(rawName);
    const columnKey = fieldMap.get(normalizedName);
    if (!columnKey) throw new Error(`企业微信公式字段未匹配到数据库字段：${String(rawName).trim()}`);
    return `{this.${columnKey}}`;
  });

  text = text
    .replace(/(\{this\.[^{}]+\})\s*\.\s*ISBLANK\s*\(\s*\)/gi, 'empty($1)')
    .replace(/\bTEXT\s*\(\s*([^,]+?)\s*,\s*"yyyy年mm月"\s*\)/gi, 'monthlabel($1)')
    .replace(/\bTODAY\s*\(\s*\)/g, 'today()')
    .replace(/\bIF\s*\(/g, 'if(');

  text = convertWecomDateComparisons(text);
  text = convertWecomEqualityConditions(text);
  return text;
}

function normalizeWecomFormulaFieldName(value) {
  return String(value || '').replace(/\s+/g, '').trim().toLowerCase();
}

function convertWecomDateComparisons(expression) {
  return String(expression || '')
    .replace(/today\(\)\s*>=\s*(\{this\.[^{}]+\})/gi, 'days(today(),$1)>=0')
    .replace(/today\(\)\s*>\s*(\{this\.[^{}]+\})/gi, 'days(today(),$1)>0')
    .replace(/today\(\)\s*<=\s*(\{this\.[^{}]+\})/gi, 'days($1,today())>=0')
    .replace(/today\(\)\s*<\s*(\{this\.[^{}]+\})/gi, 'days($1,today())>0')
    .replace(/(\{this\.[^{}]+\})\s*>=\s*today\(\)/gi, 'days($1,today())>=0')
    .replace(/(\{this\.[^{}]+\})\s*>\s*today\(\)/gi, 'days($1,today())>0')
    .replace(/(\{this\.[^{}]+\})\s*<=\s*today\(\)/gi, 'days(today(),$1)>=0')
    .replace(/(\{this\.[^{}]+\})\s*<\s*today\(\)/gi, 'days(today(),$1)>0');
}

function convertWecomEqualityConditions(expression) {
  return String(expression || '').replace(
    /(\{this\.[^{}]+\}|empty\([^)]+\)|monthlabel\([^)]+\)|today\(\)|"[^"]*"|-?\d+(?:\.\d+)?)\s*=\s*("[^"]*"|\{this\.[^{}]+\}|-?\d+(?:\.\d+)?)/g,
    'eq($1,$2)'
  );
}

function applyFormulaConfig() {
  const table = tableConfigItems.value.find(item => item.tableName === formulaConfig.tableName);
  const column = table?.columns?.find(item => item.key === formulaConfig.columnKey);
  if (!table || !column) {
    closeFormulaConfig();
    return;
  }

  let expression = formulaConfig.expression.trim();
  if (expression && looksLikeWecomFormula(expression)) {
    try {
      expression = convertWecomFormulaExpression(expression);
      formulaConfig.expression = expression;
    } catch (error) {
      tableConfigErrorText.value = error?.message || String(error);
      return;
    }
  }
  if (!expression) {
    column.formulaConfig = { expression: '', dependencies: [], isEnabled: false };
  } else {
    const validationError = validateFormulaExpression(expression);
    if (validationError) {
      tableConfigErrorText.value = validationError;
      return;
    }
    column.formulaConfig = {
      expression,
      dependencies: extractFormulaExpressionTokens(expression),
      isEnabled: true
    };
    column.fieldKind = 'calc';
  }
  tableConfigStatusText.value = '公式配置已更新，点击保存配置后生效';
  tableConfigErrorText.value = '';
  closeFormulaConfig();
}

function validateFormulaExpression(expression) {
  if (isAdvancedMiddleFormulaExpression(expression)) {
    return validateAdvancedFormulaExpression(expression);
  }
  const withoutTokens = expression.replace(/\{[^{}]+\}/g, '');
  if (/[^0-9+\-*/().,\s]/.test(withoutTokens)) {
    return '公式只能包含字段、数字、加减乘除和括号';
  }
  const tokens = extractFormulaExpressionTokens(expression);
  if (!tokens.length) return '公式至少需要插入一个字段';
  const currentColumnKeys = new Set((selectedTableConfig.value?.columns || []).map(column => column.key));
  for (const token of tokens) {
    if (token.scope === 'current' && !currentColumnKeys.has(token.columnName)) {
      return `本表字段不存在：${token.columnName}`;
    }
    if (token.scope === 'current' && token.columnName === formulaConfig.columnKey) {
      return '公式字段不能引用自己';
    }
  }
  return '';
}

function validateAdvancedFormulaExpression(expression) {
  const text = String(expression || '').trim();
  const allowedText = text
    .replace(/\{[^{}]+\}/g, '')
    .replace(/"[^"]*"/g, '');
  if (/[^0-9+\-*/().,\s<>=a-zA-Z_]/.test(allowedText)) {
    return '公式只能包含字段、数字、加减乘除、括号、days/today/empty/if/sumif/countif/countdistinctif/avgif/maxif/minif/listif/lookup/lookupdistinct/dateadd/workdayadd/monthlabel/eq/max/rentaldays 和简单条件';
  }
  if (!/\b(days|today|if|empty|sumif|countif|countdistinctif|avgif|maxif|minif|listif|lookup|lookupdistinct|dateadd|workdayadd|monthlabel|eq|max|rentaldays)\s*\(/i.test(text)) {
    return '公式函数格式无效';
  }
  const tokens = extractFormulaExpressionTokens(expression);
  if (!tokens.length) return '公式至少需要插入一个字段';
  const currentColumnKeys = new Set((selectedTableConfig.value?.columns || []).map(column => column.key));
  for (const token of tokens) {
    if (token.scope === 'current' && !currentColumnKeys.has(token.columnName)) {
      return `本表字段不存在：${token.columnName}`;
    }
    if (token.scope === 'current' && token.columnName === formulaConfig.columnKey) {
      return '公式字段不能引用自己';
    }
  }
  return '';
}

function extractFormulaExpressionTokens(expression) {
  const tokens = [];
  const pattern = /\{([^{}]+)\}/g;
  let match;
  while ((match = pattern.exec(expression))) {
    const parts = match[1].split('.').map(part => part.trim()).filter(Boolean);
    if (parts.length === 2 && parts[0] === 'this') {
      tokens.push({ scope: 'current', columnName: parts[1] });
    } else if (parts.length === 3) {
      tokens.push({ scope: 'table', tableName: parts[0], columnName: parts[1], aggregate: parts[2] });
    }
  }
  return tokens;
}

async function saveTableManagement() {
  tableConfigErrorText.value = '';
  tableConfigStatusText.value = '';
  isTableConfigSaving.value = true;

  try {
    const response = await fetch('/api/table-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables: tableConfigItems.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '保存表格配置失败');
    tableConfigStatusText.value = '表格配置已保存';
    await loadMiddlePlatform();
  } catch (error) {
    tableConfigErrorText.value = error?.message || String(error);
  } finally {
    isTableConfigSaving.value = false;
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
    accountForm.department = '';
    accountForm.contact = '';
    accountForm.password = '';
    accountForm.permission = 'finance';
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

  const confirmed = await openConfirmDialog({
    title: '删除账号',
    message: '确认删除这个账号吗？删除后该账号将不能登录。',
    detail: user.username,
    confirmText: '删除'
  });
  if (!confirmed) return;

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
  accountForm.department = '';
  accountForm.contact = '';
  accountForm.password = '';
  accountForm.permission = 'finance';
  accountStatusText.value = '';
  accountErrorText.value = '';
  pushConfig.webhook = '';
  pushConfigStatusText.value = '';
  pushConfigErrorText.value = '';
  tableConfigItems.value = [];
  activeTableConfigName.value = '';
  tableConfigStatusText.value = '';
  tableConfigErrorText.value = '';
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
  return permissionOptions.find(option => option.value === permission)?.label || permission;
}

function receiptTypeLabel(type) {
  if (type === 'balance') return '尾款单';
  if (type === 'statement') return '对帐单';
  return '定金单';
}
</script>
