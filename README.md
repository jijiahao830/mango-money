# 芒果租车财务中台

这是芒果租车财务中台项目。当前代码只是整个中台的一部分，现阶段重点完成了账号登录、定金单/尾款单/对账单图片生成、历史图片、企业微信推送和基础账号管理。后续会逐步扩展为覆盖订单、车辆、客户、押金、收入、成本、报销、利润、审批和经营分析的完整财务业务系统。

## 当前能力

- 登录与账号权限
  - 支持账号密码登录。
  - 用户表为 `cw_ry`。
  - 支持管理员、车队长、销售、财务四类权限。
  - 只有管理员可进入账号管理和推送配置。

- 单据生成
  - 定金单：生成 WebP 图片，保存到 `create_file/djd/日期/`。
  - 尾款单：生成 WebP 图片，保存到 `create_file/wkd/日期/`。
  - 对账单：生成 WebP 图片，保存到 `create_file/dzd/日期/`。
  - 三类单据均基于 `skills/` 下的独立 skill 渲染。

- 历史图片
  - 按单据类型查看历史图片。
  - 每类图片按日期分组。
  - 支持预览、下载和推送。

- 企业微信推送
  - 支持配置企业微信 webhook。
  - 生成图片后可直接推送到企业微信群。
  - 推送时后端会临时将 WebP 转为 JPG，并按企业微信 image 消息要求生成 base64 和 md5。

- 数据库记录
  - 下载或推送当前生成的图片时，会把对应表单数据写入数据库。
  - 当前图片生成专用表包括：
    - `tp_djd`  定金单生图记录表
    - `tp_wkd`  尾款单生图记录表
    - `tp_dzd`  对帐单生图记录表

- 中台表格看板
  - 登录后可进入 `/middle-platform` 查看中台数据表。
  - 左侧只显示表名，不显示图标；列表默认显示约 12 个表名，其余通过滚动查看。
  - 右侧显示当前表数据，支持在线修改、新增行、删除行。
  - 删除行使用网页内二次确认弹窗，不使用浏览器原生确认框。
  - 枚举/受限字段优先使用下拉选择；保存前会做字段校验，校验失败会提示具体字段。
  - 顶部 `刷新` 和 `保存` 按钮靠右排列，保留少量间距。

- 表格管理
  - 管理员可进入 `/table-management` 配置哪些数据库表在中台显示。
  - 可配置每张表显示哪些字段。
  - 默认显示 `cardata_money` 库中的业务表，后续由管理员按需隐藏。

## 中台蓝图

`中台.xlsx` 是之前财务中台的表结构参考文件，里面包含大量子表。这个项目后续会以这些表为基础，逐步把 Excel/智能表格中的业务流程产品化。

`中台.xlsx` 和 `中台数据.xlsx` 只作为本地导入参考文件，已加入 `.gitignore`，不提交到 git。

中台数据库表命名规则：

- 统一使用 `cw_` 前缀。
- 表名取中文首字母缩写。
- 去掉括号内的角色或说明。
- 表名中原有英文保留，但 MySQL 实际表名统一按小写处理，例如 `GPS付款` 落库为 `cw_gpsfk`。

## 技术结构

- 前端：Vue 3 + Vite
- 前端路由：Vue Router
- 后端：Node.js 原生 HTTP 服务
- 数据库：MySQL
- 图片渲染：本地 skill + Chrome/Chromium 截图 + WebP 转换
- 推送：企业微信 webhook

## 交互约定

- 删除、停用、覆盖保存等需要二次确认的操作，统一使用网页内自定义确认弹窗。
- 不使用浏览器原生 `alert`、`confirm`、`prompt` 作为正式交互。
- 弹窗需要明确展示操作标题、风险说明和操作对象，确认按钮使用危险操作样式。

## 目录结构说明

```text
mango-money/
├── src/                         前端源码目录，Vue 页面、样式和前端交互逻辑都在这里
│   ├── App.vue                   主页面组件，包含登录、首页、单据生成、历史图片、推送、账号管理等页面
│   ├── main.js                   Vue 入口文件
│   ├── style.css                 全局样式文件
│   └── assets/                   前端静态资源，如 logo、favicon 等
│
├── public/                       Vite 公共静态资源目录，构建时会原样复制到 build
│
├── skills/                       单据图片生成 skill 包目录
│   ├── mango-finance-deposit-receipt.skill     定金单生成 skill
│   ├── mango-finance-balance-receipt.skill     尾款单生成 skill
│   └── mango-finance-statement-receipt.skill   对账单生成 skill
│
├── create_file/                  图片生成结果保存目录，已加入 git 忽略
│   ├── djd/                      定金单生成图片保存目录
│   ├── wkd/                      尾款单生成图片保存目录
│   ├── dzd/                      对账单生成图片保存目录
│   └── _tmp/                     图片生成和转换过程中的临时文件目录
│
├── upload_file/                  业务图片和文件上传目录，已加入 git 忽略
│   ├── cars/                     车辆相关文件
│   │   ├── compulsory_insurance_policy_photo/  交强险保单照片，对应 cw_car.compulsory_insurance_policy_photo
│   │   ├── commercial_insurance_policy_photo/  商业险保单照片，对应 cw_car.commercial_insurance_policy_photo
│   │   └── vehicle_photos/        车辆照片，对应 cw_car.vehicle_photos
│   ├── customers/                客户相关文件
│   │   ├── contracts/            客户合同
│   │   └── id_cards/             客户证件照片
│   ├── partners/                 同行、合作方相关文件
│   │   └── contracts/            同行、合作方合同
│   ├── affiliated_owners/        挂靠车主相关文件
│   │   └── contracts/            挂靠车主合同
│   └── _tmp/                     上传过程中的临时文件
│
├── .runtime/                     后端运行时临时目录，已加入 git 忽略
│   ├── mango-finance-*/          skill 解压后的运行目录
│   └── requests/                 生成图片时保存的临时请求数据
│
├── build/                        生产构建目录，服务器 Nginx root 指向这里，已加入 git 忽略
│
├── dist/                         旧构建目录，当前项目主要使用 build，可以后续清理
│
├── output/                       本地测试或脚本输出目录，不作为正式业务图片目录
│
├── node_modules/                 npm 依赖目录，已加入 git 忽略
│
├── server.js                     Node 后端服务，提供 API、登录、数据库写入、图片生成、历史图片、企业微信推送
├── start.sh                      Linux/macOS 一键启动脚本，启动前会检查端口、构建前端、启动后端
├── vite.config.js                Vite 配置文件，配置构建目录和本地开发端口
├── package.json                  项目依赖和 npm 脚本配置
├── package-lock.json             npm 依赖锁定文件
├── index.html                    Vite HTML 入口文件
├── app_config.json               本地配置文件，保存 MySQL 和企业微信 webhook，已加入 git 忽略，不能提交
├── .npmrc                        npm 源配置文件
├── .gitignore                    git 忽略规则
├── README.md                     项目说明文档
├── 中台.xlsx                     财务中台历史表结构/数据导入参考文件，已加入 git 忽略，不提交
├── 中台数据.xlsx                 旧财务中台历史数据导入参考文件，已加入 git 忽略，不提交
└── 经典宋体简.ttf                对账单等图片生成使用的字体源文件
```

目录使用原则：

- 业务源码主要放在 `src/`、`server.js`、`skills/`。
- 生成图片统一保存到 `create_file/`，不要放到 `src/` 或 `public/`。
- 合同、保单、车辆照片等上传文件后续建议统一放到 `upload_file/`，数据库只保存文件路径和文件信息。
- `.runtime/`、`build/`、`node_modules/`、`create_file/`、`upload_file/` 都是运行或构建产物，不提交到 git。
- `app_config.json` 里有数据库和推送配置，只在本机或服务器保留，不提交到 git。
- `中台.xlsx`、`中台数据.xlsx` 文件体积大且属于导入参考资料，只保留在本机或服务器，不提交到 git。

## 本地启动

先创建 `app_config.json`，填写 MySQL 和推送配置。不要提交该文件。

示例结构：

```json
{
  "mysql": {
    "host": "127.0.0.1",
    "port": 3306,
    "database": "your_database",
    "user": "your_user",
    "password": "your_password"
  },
  "wecom": {
    "webhook": ""
  }
}
```

启动：

```bash
./start.sh
```

默认端口：

```text
8764
```

常用页面路径：

```text
/home                首页
/middle-platform     中台
/deposit             定金单
/balance             尾款单
/statement           对账单
/history             历史图片
/push                推送配置
/accounts            账号管理
/table-management    表格管理
```

## 部署说明

服务器需要具备：

- Node.js 18+
- npm
- MySQL
- Chrome 或 Chromium
- WebP 转换工具之一：
  - `cwebp`
  - `ImageMagick`
  - `ffmpeg`

推荐安装：

```bash
sudo apt update
sudo apt install -y chromium-browser webp
```

如果以 root 运行 Chromium，skill 已处理 `--no-sandbox` 参数。

## Nginx

生产环境建议：

- `root` 指向 `build`
- `/api/` 反向代理到 `127.0.0.1:8764`
- `/create-file/` 或历史图片访问由后端 API 提供

# 财务成本计算：（目前使用当月发生制、权责发生制）
 -当月发生制（收付实现制）：成本计算到当月，如：修理费10万只记录到该月成本上，后果就是这个月成本高，多了10万维修费，但是下个月成本低，因为维修成本算到上月。好处：更容易计算。坏处：每月的成本差距很大。
 -权责发生制：工资，这个费用发生在上月，但是这个月才支付
 -分摊制：将10万维修费分摊到每个月，如10万分摊到10个月每个月的成本就是1万。好处：每月成本均衡。坏处：不好制定分多少期

毛利润：卖出去-成本（人工水电、房租、购买成本）
净利润：小于等于毛利润，卖出去的钱-成本-隐性成本（买水的时候油费）

成本（Cost）：为了获得收入而直接发生的支出。能直接对应到某个产品、项目或订单。
现在公司成本：同行挂靠、车主挂靠、房租水电、工资

费用（Expense）：企业为了经营管理而发生的支出。不一定能直接对应某个订单或收入。
现在公司费用：报销、杂费、维修、板车、推广、代驾、配件、酒店付款、保险

人员分配：管理员、财务、车队长、销售
基础表
 -车辆表
 -客户表
 -挂靠

## 财务中台数据源结构

财务中台页面不要让财务人员直接面对数据库表，而是按业务模块录入和查看数据。底层仍然使用下面这些表作为数据源，页面中的一级表负责承载业务入口，二级表负责展示或填写具体明细。

一级表和二级表结构如下：

数据源

- 车型参数表（`cw_cxcs`）
- 人员表（`cw_ry`）
- 挂靠车主表（`cw_gkcz`）
- 客户主档案表（`cw_khzda`）
- 税务凭证表（`cw_swpz`）

汇总

- 年度利润表（`cw_ndlr`）
- 订单结算主表（`cw_ddjszb`）
- 挂靠车辆成本利润表（`cw_gkclcblr`）
- 自有车辆成本利润表（`cw_zyclcblr`）

收入

- 收入明细表（`cw_srmx`）
- 客户资金流水表（`cw_khzjls`）
- GPS 付款表（`cw_gpsfk`）
- 定金单表（`cw_djd`）

成本

- 成本明细表（`cw_cbmx`）
- 调车成本表（`cw_dccb`）
- 挂靠合作明细表（`cw_gkhzmx`）
- 工资报表（`cw_gzbb`）

费用

- 费用汇总表（`cw_fyhz`）
- 酒店付款台账表（`cw_jdfktz`）
- 板车费用明细表（`cw_bcfymx`）
- 代驾费用明细表（`cw_djfymx`）
- 报销费用明细表（`cw_bxfymx`）
- 维修成本表（`cw_wxcb`）
- 保险续费记录表（`cw_bxxfjl`）
- 运营杂费报销表（`cw_yyzfbx`）

车辆&车队长

- 维修报备申请表（`cw_wxbbsq`）
- 回车违章情况表（`cw_hcwzqk`）
- 车辆异常表（`cw_clyc`）
- 配件采购表（`cw_pjcg`）
- 业务员押金流水表（`cw_ywyyjls`）

### 数据库存在但当前结构未使用的表

- 收入对账表（`cw_srdz`）
- 中台表格显示配置表（`cw_table_view_config`）
- 同行付款申请表（`cw_thfksq`）
- 押金管理表（`cw_yjgl`）
- 在外车辆表（`cw_zwcl`）

### 图片生成专用表

这三张表只用于定金单、尾款单、对帐单的图片生成记录，不作为财务中台业务一级表的数据源。

- 定金单生图记录表（`tp_djd`）
- 尾款单生图记录表（`tp_wkd`）
- 对帐单生图记录表（`tp_dzd`）