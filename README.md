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
  - 字段类型标签用于控制字段行为；文本和日期不显示标签，可显示和切换的标签包括单选、多选、图片、文件、关联、计算。
  - 可配置字段选项来源，支持固定选项，也支持从其他数据表读取选项。
  - 可为字段配置公式，公式支持选择本表字段和其他表字段聚合值。
  - 表存在公式字段时，后端会创建对应的中台展示视图；中台优先显示数据库已有值，没有值时显示公式计算结果。
  - 图片/文件字段点击单元格会打开强模态弹窗，支持上传、下载、删除、保存；图片上传时前端转换为 WebP。
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
- 中台图片/文件字段按 JSON 保存文件信息；图片字段上传时转为 WebP，保存和下载都使用 WebP。
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
- 字段选项配置表（`cw_field_option_config`）
- 公式字段配置表（`cw_formula_field_config`）
- 同行付款申请表（`cw_thfksq`）
- 押金管理表（`cw_yjgl`）
- 在外车辆表（`cw_zwcl`）

### 中台公式视图

表格管理中配置公式字段后，系统会为对应业务表创建展示视图，视图命名规则为 `cw_formula_view_原表名`。

公式字段展示规则：

- 原表字段已有值时，中台显示原字段值。
- 原表字段为空时，中台显示公式计算值。
- 在中台点击保存后，前端当前展示的公式字段值会写回原业务表字段。
- 后端保存时也会兜底计算缺失的公式字段值并写回原业务表，不能只依赖前端提交。
- 公式支持本表字段四则运算，例如 `{this.sr} - {this.cb}`。
- 公式支持其他表字段聚合，例如 `{cw_srmxb.je.sum}`，聚合方式包括 `sum`、`avg`、`count`、`max`、`min`、`first`。

公式配置保存于 `cw_formula_field_config`，中台展示视图不作为业务源表，实际保存仍写入原业务表。

### 字段类型标签

字段类型标签保存在 `cw_field_option_config.field_kind`，用于控制中台字段行为。

- 文本、日期字段不显示标签，也不在标签切换菜单中出现。
- 单选、多选、关联字段显示“配置”按钮，可配置固定选项或从其他数据表读取选项。
- 计算字段显示“公式”按钮，可配置公式表达式。
- 图片、文件字段点击中台单元格时打开强模态弹窗，弹窗内可上传、下载、删除、保存。
- 图片字段上传时，前端先转换为 WebP，最长边压缩到 1600px 以内，下载时也下载 WebP 文件。
- 图片弹窗内点击图片可使用历史图片预览同款样式预览，标题显示图片文件名，不显示推送按钮。

### 字段选项来源

表格管理的字段配置支持两种选项来源：

- 固定选项：直接保存在 `cw_field_option_config.options_json`。
- 数据表读取：保存在 `cw_field_option_config.option_source_type/source_table_name/source_column_name`，中台加载时从来源表读取去重后的字段值作为下拉选项。

当前已配置：

- 报销费用明细表（`cw_bxfymxb`）的报销人字段（`bxr`）从人员表（`cw_ryb`）的姓名/显示名字段（`display_name`）读取。
- 报销费用明细表（`cw_bxfymxb`）的合计字段（`hj`）为计算字段。
- 报销费用明细表（`cw_bxfymxb`）的报销单字段（`bxd`）为图片字段，数据库类型为 `json`。

## 更新记录

2026-06-10

新增：
- 表格管理支持字段公式配置。
- 中台支持有公式字段的表通过展示视图读取数据。
- 中台保存时会把公式展示值写回原业务表字段。
- 后端保存时会兜底计算公式字段，并写回原业务表字段。
- 表格管理支持字段选项从其他数据表读取。
- 表格管理支持图片/文件字段强模态编辑弹窗。
- 图片字段上传时转换为 WebP，图片预览复用历史图片预览样式。
- 已通过 `wecom-cli` 导入企业微信智能表“报销费用明细（财务）”到 `cw_bxfymxb`。

数据库：
- 新增公式字段配置表 `cw_formula_field_config`。
- 有公式字段的业务表会自动创建 `cw_formula_view_原表名` 展示视图。
- `cw_field_option_config` 增加选项来源配置字段。
- `cw_bxfymxb.hj` 配置为计算字段。
- `cw_bxfymxb.bxd` 配置为图片字段，类型为 `json`。

### 图片生成专用表

这三张表只用于定金单、尾款单、对帐单的图片生成记录，不作为财务中台业务一级表的数据源。

- 定金单生图记录表（`tp_djd`）
- 尾款单生图记录表（`tp_wkd`）
- 对帐单生图记录表（`tp_dzd`）

<!-- POS_DB_SCHEMA_START -->

## POS 与数据库同名表结构

来源：`财务.pos` 与 MySQL 数据库 `cardata_money`。
本节只列出 POS 文件和数据库中表名一致的业务表，共 30 张；POS 中识别到表名 30 张。

| 表名 | 表注释 | 字段数 |
|---|---|---:|
| `cw_bcfymxb` | 板车费用明细表 | 17 |
| `cw_bxfymxb` | 报销费用明细表 | 26 |
| `cw_bxxfjlb` | 保险续费记录表 | 20 |
| `cw_cbmxb` | 成本明细表 | 10 |
| `cw_clycb` | 车辆异常表 | 27 |
| `cw_cxcsb` | 车型参数表 | 52 |
| `cw_dccbb` | 调车成本表 | 29 |
| `cw_ddjszb` | 订单结算主表 | 62 |
| `cw_djdb` | 定金单表 | 17 |
| `cw_djfymxb` | 代驾费用明细表 | 19 |
| `cw_fyhzb` | 费用汇总表 | 11 |
| `cw_gkclcblrb` | 挂靠车辆成本利润表 | 21 |
| `cw_gkczb` | 挂靠车主表 | 51 |
| `cw_gkhzmxb` | 挂靠合作明细表 | 23 |
| `cw_gpsfkb` | GPS付款表 | 17 |
| `cw_gzbb` | 工资报表 | 9 |
| `cw_hcwzqkb` | 回车违章情况表 | 23 |
| `cw_jdfktzb` | 酒店付款台账表 | 13 |
| `cw_khzdab` | 客户主档案表 | 23 |
| `cw_khzjlsb` | 客户资金流水表 | 24 |
| `cw_ndlrb` | 年度利润表 | 15 |
| `cw_pjcgb` | 配件采购表 | 17 |
| `cw_ryb` | 人员表 | 8 |
| `cw_srmxb` | 收入明细表 | 13 |
| `cw_swpzb` | 税务凭证表 | 12 |
| `cw_wxbbsqb` | 维修报备申请表 | 29 |
| `cw_wxcbb` | 维修成本表 | 17 |
| `cw_ywyyjlsb` | 业务员押金流水表 | 11 |
| `cw_yyzfbxb` | 运营杂费报销表 | 9 |
| `cw_zyclcblrb` | 自有车辆成本利润表 | 28 |

### 板车费用明细表（`cw_bcfymxb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `fksj` | 付款时间 | `datetime` | YES |  |
| `tycx` | 托运车型 | `date` | YES |  |
| `tycp` | 托运车牌 | `date` | YES |  |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `skf` | 收款方 | `date` | YES |  |
| `tyrq` | 托运日期 | `date` | YES |  |
| `dd` | 地点 | `varchar(255)` | NO |  |
| `skje` | 收款金额 | `date` | YES |  |
| `fkje` | 付款金额 | `date` | YES |  |
| `skhbcfy` | 收客户板车费用 | `decimal(14,2)` | YES |  |
| `lr` | 利润 | `decimal(14,2)` | YES |  |
| `fktp` | 付款图片 | `json` | YES |  |
| `bz` | 备注 | `text` | YES |  |

### 报销费用明细表（`cw_bxfymxb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | ID | `int` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `pksj` | 付款时间 | `date` | YES |  |
| `bm` | 部门 | `varchar(100)` | NO |  |
| `bxr` | 报销人 | `varchar(100)` | NO |  |
| `wb2` | 文本 2 | `varchar(255)` | NO |  |
| `bgf` | 办公费 | `decimal(12,2)` | NO | 0.00 |
| `jy` | 加油 | `decimal(12,2)` | NO | 0.00 |
| `dcf` | 打车费 | `decimal(12,2)` | NO | 0.00 |
| `ggjtfy` | 公共交通费用 | `decimal(12,2)` | NO | 0.00 |
| `cf` | 餐费 | `decimal(12,2)` | NO | 0.00 |
| `zs` | 住宿 | `decimal(12,2)` | NO | 0.00 |
| `glf` | 过路费 | `decimal(12,2)` | NO | 0.00 |
| `tcf` | 停车费 | `decimal(12,2)` | NO | 0.00 |
| `wx` | 维修 | `decimal(12,2)` | NO | 0.00 |
| `bkhdf` | 帮客户垫付 | `decimal(12,2)` | NO | 0.00 |
| `qt` | 其他 | `decimal(12,2)` | NO | 0.00 |
| `lpf` | 礼品费 | `decimal(12,2)` | NO | 0.00 |
| `hj` | 合计 | `decimal(12,2)` | NO | 0.00 |
| `bz` | 备注 | `text` | YES |  |
| `khsq` | 客户收取 | `decimal(12,2)` | NO | 0.00 |
| `gscd` | 公司承担 | `decimal(12,2)` | NO | 0.00 |
| `bxd` | 报销单 | `json` | YES |  |
| `gl` | 关联 | `varchar(100)` | NO |  |

配置说明：

- `hj` 是计算字段，字段标签为 `calc`。
- `hj` 公式为 `{this.bgf}+{this.jy}+{this.dcf}+{this.ggjtfy}+{this.cf}+{this.zs}+{this.glf}+{this.tcf}+{this.wx}+{this.bkhdf}+{this.qt}+{this.lpf}`。
- 中台保存时，前端会提交当前展示的 `hj` 值，后端也会根据公式兜底计算并写入基础表。
- `bxd` 是图片字段，字段标签为 `image`，数据库类型为 `json`。
- `bxd` 存储图片数组；企业微信导入时保留图片 URL、图片宽高、企业微信图片 ID 等信息；网页上传时转换为 WebP 后保存。
- 企业微信智能表“报销费用明细（财务）”的数据已可通过 `wecom-cli` 导入，导入时优先使用企业微信的“合计”值；如果该值为空，再按本地公式计算。

### 保险续费记录表（`cw_bxxfjlb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `bxgmrq` | 保险购买日期 | `date` | YES |  |
| `jqxdqr2` | 交强险到期日 2 | `date` | YES |  |
| `jqxbxgs` | 交强险保险公司 | `enum('中国人寿','中国人民保险','中国太平保险','华安保险','亚太财产保险','都邦财产','中国平安','阳光保险集团','紫金财产保险')` | YES |  |
| `jqxje` | 交强险金额 | `decimal(14,2)` | YES |  |
| `syxdqr2` | 商业险到期日 2 | `date` | YES |  |
| `syxbxgs` | 商业险保险公司 | `enum('中国太平保险','阳光保险','华安财产保险','中华保险','诚泰财产保险','中华联合财产保险')` | YES |  |
| `syxje` | 商业险金额 | `decimal(14,2)` | YES |  |
| `bxhjfy` | 保险合计费用 | `decimal(14,2)` | YES |  |
| `gzs` | 购置税 | `decimal(14,2)` | YES |  |
| `bz` | 备注 | `text` | YES |  |
| `fkr` | 付款人 | `date` | YES |  |
| `tp` | 图片 | `json` | YES |  |
| `wj` | 文件 | `json` | YES |  |
| `clxx` | 车辆信息 | `varchar(255)` | NO |  |

### 成本明细表（`cw_cbmxb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `cblx` | 成本类型 | `enum('人力成本','租金成本-挂靠','租金成本-同行','房租')` | YES |  |
| `rq` | 日期 | `date` | YES |  |
| `cbfsrq` | 成本发生日期 | `date` | YES |  |
| `je` | 金额 | `decimal(14,2)` | YES |  |
| `dyljcb` | 当月累计成本 | `decimal(14,2)` | YES |  |
| `dyljcbw` | 当月累计成本（万） | `decimal(14,2)` | YES |  |

### 车辆异常表（`cw_clycb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `zbzt` | 整备状态 | `enum('待整备','整备中','已完成')` | YES |  |
| `cl` | 车辆 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `fzr` | 负责人 | `varchar(255)` | NO |  |
| `zblx` | 整备类型 | `enum('维修进厂','挂靠车主取回','同行调车中','事故处理中','客户未归还（逾期）','定位离线/失联','年检/保险未处理','贴膜改色','外观修复','轮毂修复','更换刹车片','方向盘套')` | YES |  |
| `clszwz` | 车辆所在位置 | `enum('博庆','门店','挂靠车主','同行车行','维修厂','客户用车','未知（自动红色预警）')` | YES |  |
| `yjxzts` | 预计闲置天数 | `decimal(14,2)` | YES |  |
| `sjxzts` | 实际闲置天数 | `decimal(14,2)` | YES |  |
| `ksrq` | 开始日期 | `date` | YES |  |
| `ycyy` | 异常原因 | `text` | YES |  |
| `wxljd` | 维修类节点 | `json` | YES |  |
| `sgljd` | 事故类节点 | `json` | YES |  |
| `gkljd` | 挂靠类节点 | `json` | YES |  |
| `txljd` | 同行类节点 | `json` | YES |  |
| `yqkhl` | 逾期客户类 | `json` | YES |  |
| `cljd` | 处理进度 | `varchar(255)` | NO |  |
| `zrf` | 责任方 | `enum('车辆整备','挂靠车主','同行车行','客户','维修厂','公司内部')` | YES |  |
| `yjhfsj` | 预计恢复时间 | `datetime` | YES |  |
| `sjhfsj` | 实际恢复时间 | `datetime` | YES |  |
| `jlkyts` | 距离可用天数 | `decimal(14,2)` | YES |  |
| `sfyxdd` | 是否影响订单 | `varchar(255)` | NO |  |
| `bcbz` | 补充备注 | `text` | YES |  |
| `sfyhfyy` | 是否已恢复运营 | `enum('是','否')` | YES |  |

### 车型参数表（`cw_cxcsb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `vehicle_record_id` | 车辆id | `varchar(100)` | NO |  |
| `vehicle_id` | 车辆ID | `varchar(100)` | NO |  |
| `plate_number` | 车牌号 | `varchar(50)` | NO |  |
| `model_name` | 车型名称 | `varchar(100)` | NO |  |
| `vehicle_category` | 车辆分类 | `enum('性能车','超跑','豪华suv','豪华轿车','MPV','商务车','新能源','SUV','越野车')` | YES |  |
| `fuel_tank_capacity_l` | 油箱容量（L） | `decimal(10,2)` | YES |  |
| `recommended_fuel` | 推荐油号 | `enum('柴油','新能源','92','95','98')` | YES |  |
| `daily_rent_price` | 日租单价 | `decimal(12,2)` | YES |  |
| `over_mileage_price` | 超公里单价 | `decimal(12,2)` | YES |  |
| `daily_mileage_limit` | 限制km/天 | `int` | YES |  |
| `vehicle_status` | 车辆状态 | `enum('在库','出车','维修中','可调用','停运','已出售')` | YES |  |
| `source` | 来源 | `enum('抵押','借用','同行','自有','挂靠')` | YES |  |
| `key_check` | 钥匙核对 | `enum('在店','未在')` | YES |  |
| `spring_festival_available` | 春节是否可用车 | `enum('是','否')` | YES |  |
| `owner_name` | 车主姓名 | `varchar(100)` | NO |  |
| `compulsory_insurance_expire_date` | 交强险到期日 | `date` | YES |  |
| `compulsory_insurance_policy_photo` | 交强险保单照片 | `json` | YES |  |
| `commercial_insurance_expire_date` | 商业险到期日 | `date` | YES |  |
| `commercial_insurance_policy_photo` | 商业险保单照片 | `json` | YES |  |
| `annual_inspection_expire_date` | 年审到期日 | `date` | YES |  |
| `maintenance_cycle` | 保养周期 | `varchar(100)` | NO |  |
| `next_maintenance_mileage` | 下次保养公里 | `int` | YES |  |
| `purchase_price` | 购车价 | `decimal(12,2)` | YES |  |
| `standard_cost` | 标准成本 | `decimal(12,2)` | YES |  |
| `depreciation_cycle_months` | 折旧周期（月） | `int` | YES |  |
| `vehicle_photos` | 车辆照片（附件/图片） | `json` | YES |  |
| `initial_mileage` | 初始公里数 | `int` | YES |  |
| `remark` | 备注 | `text` | YES |  |
| `self_owned_management_group` | 自有管理群 | `varchar(255)` | NO |  |
| `affiliated_group_management` | 挂靠群管理 | `varchar(255)` | NO |  |
| `vehicle_order_records` | 车辆订单记录 | `text` | YES |  |
| `vehicle_monthly_records` | 车辆包月记录 | `text` | YES |  |
| `vehicle_abnormal_reason` | 车辆异常原因 | `text` | YES |  |
| `vehicle_maintenance_records` | 车辆维修记录 | `text` | YES |  |
| `affiliated_owner_settlement_records` | 挂靠车结款记录 | `text` | YES |  |
| `insurance` | 保险 | `text` | YES |  |
| `affiliated_contract_expire_date` | 挂靠车合同到期日 | `date` | YES |  |
| `relation_2` | 关联 2 | `text` | YES |  |
| `insurance_records` | 保险记录 | `text` | YES |  |
| `vehicle_order_records_main_copy` | 车辆订单记录-订单结算主表（销售&车队长&财务）(副本) | `text` | YES |  |
| `relation_3` | 关联 3 | `text` | YES |  |
| `relation_4` | 关联 4 | `text` | YES |  |
| `relation_5` | 关联 5 | `text` | YES |  |
| `relation_6` | 关联 6 | `text` | YES |  |
| `relation_7` | 关联 7 | `text` | YES |  |
| `relation_8` | 关联 8 | `text` | YES |  |
| `relation_9` | 关联 9 | `text` | YES |  |
| `relation_10` | 关联 10 | `text` | YES |  |

### 调车成本表（`cw_dccbb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `dcrq` | 调车日期 | `date` | YES |  |
| `jsrq` | 结束日期 | `date` | YES |  |
| `txmc` | 同行名称 | `varchar(255)` | NO |  |
| `cblx` | 成本类型 | `enum('租金成本-挂靠','租金成本-同行')` | YES |  |
| `clxx` | 车辆信息 | `varchar(255)` | NO |  |
| `dj` | 单价 | `decimal(14,2)` | YES |  |
| `ycts` | 用车天数 | `decimal(14,2)` | YES |  |
| `qtfy` | 其他费用 | `decimal(14,2)` | YES |  |
| `fkje` | 付款金额 | `date` | YES |  |
| `zd` | 账单 | `json` | YES |  |
| `fksj` | 付款时间 | `datetime` | YES |  |
| `fkjt` | 付款截图 | `json` | YES |  |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `khycts` | 客户用车天数 | `decimal(14,2)` | YES |  |
| `khdj` | 客户单价 | `decimal(14,2)` | YES |  |
| `sjzjsr` | 实际租金收入 | `decimal(14,2)` | YES |  |
| `khxfze` | 客户消费总额 | `decimal(14,2)` | YES |  |
| `dzd` | 对账单 | `json` | YES |  |
| `gl` | 关联 | `text` | YES |  |
| `bclr` | 本次利润 | `decimal(14,2)` | YES |  |
| `bz` | 备注 | `text` | YES |  |
| `yf` | 月份 | `varchar(100)` | NO |  |
| `wb2` | 文本 2 | `varchar(255)` | NO |  |

### 订单结算主表（`cw_ddjszb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `ddbh` | 订单编号 | `varchar(255)` | NO |  |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `cdcstxwc` | 车队长是填写完成 | `enum('已完成','未完成','核算中')` | YES |  |
| `khq` | 客户群 | `text` | YES |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `khxm` | 客户姓名 | `varchar(255)` | NO |  |
| `lxfs` | 联系方式 | `varchar(255)` | NO |  |
| `xs` | 销售 | `varchar(255)` | NO |  |
| `rzcjj` | 日租成交价 | `decimal(14,2)` | YES |  |
| `ddlx` | 订单类型 | `enum('短租','长租','包月','活动')` | YES |  |
| `clgs` | 车辆归属 | `varchar(255)` | NO |  |
| `cdc` | 车队长 | `varchar(255)` | NO |  |
| `cxxz` | 车型选择 | `varchar(255)` | NO |  |
| `htqk` | 合同情况 | `enum('未签署','已签署','配驾','摆展')` | YES |  |
| `ccsj` | 出车时间 | `datetime` | YES |  |
| `cckm` | 出车km | `datetime` | YES |  |
| `ccyl` | 出车油量 | `datetime` | YES |  |
| `hcsj` | 回车时间 | `datetime` | YES |  |
| `hckm` | 回车km | `datetime` | YES |  |
| `hcyl` | 回车油量 | `datetime` | YES |  |
| `ycqk` | 验车情况 | `enum('旧伤','完好','车损')` | YES |  |
| `jryj` | 今日油价 | `decimal(14,2)` | YES |  |
| `sjxsgl` | 实际行驶公里 | `decimal(14,2)` | YES |  |
| `ycts` | 用车天数 | `datetime` | YES |  |
| `bhkmzs` | 包含km总数 | `decimal(14,2)` | YES |  |
| `xzkmtqzyy` | 限制km/天-去重引用 | `decimal(14,2)` | YES |  |
| `cgls` | 超公里数 | `decimal(14,2)` | YES |  |
| `glsce` | 公里数差额 | `decimal(14,2)` | YES |  |
| `cgldj` | 超公里单价 | `decimal(14,2)` | YES |  |
| `cglf` | 超公里费 | `decimal(14,2)` | YES |  |
| `yxrl` | 油箱容量 | `varchar(255)` | NO |  |
| `byl` | 补油量 | `decimal(14,2)` | YES |  |
| `byf` | 补油费 | `varchar(255)` | NO |  |
| `qtfy` | 其他费用 | `decimal(14,2)` | YES |  |
| `qtfymx` | 其他费用明细 | `decimal(14,2)` | YES |  |
| `hcry` | 回车人员 | `datetime` | YES |  |
| `dzje` | 调整金额 | `decimal(14,2)` | YES |  |
| `dzxm` | 调整项目 | `varchar(255)` | NO |  |
| `jczj` | 基础租金 | `decimal(14,2)` | YES |  |
| `xfze` | 消费总额 | `decimal(14,2)` | YES |  |
| `yszj` | 已收租金 | `decimal(14,2)` | YES |  |
| `clyj` | 车辆押金 | `decimal(14,2)` | YES |  |
| `wzyj` | 违章押金 | `decimal(14,2)` | YES |  |
| `hjsk` | 合计收款 | `date` | YES |  |
| `ytyjje` | 应退押金金额 | `decimal(14,2)` | YES |  |
| `sywzyj` | 剩余违章押金 | `decimal(14,2)` | YES |  |
| `ybje` | 应补金额 | `decimal(14,2)` | YES |  |
| `wzqk` | 违章情况 | `enum('处理中','查询中','无','有')` | YES |  |
| `cwjsr` | 财务经手人 | `varchar(255)` | NO |  |
| `stkjl` | 收退款记录 | `text` | YES |  |
| `gl1` | 关联 1 | `text` | YES |  |
| `gl2` | 关联 2 | `text` | YES |  |
| `gl3` | 关联 3 | `text` | YES |  |
| `fyfsy` | 费用发生月 | `decimal(14,2)` | YES |  |
| `gl4` | 关联 4 | `text` | YES |  |
| `dccb` | 调车成本 | `decimal(14,2)` | YES |  |
| `gl5` | 关联 5 | `text` | YES |  |
| `gl6` | 关联 6 | `text` | YES |  |

### 定金单表（`cw_djdb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `qlmc` | 群聊名称 | `text` | YES |  |
| `ycsj` | 用车时间 | `datetime` | YES |  |
| `ycts` | 用车天数 | `datetime` | YES |  |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `gl` | 关联 | `text` | YES |  |
| `dj` | 单价 | `decimal(14,2)` | YES |  |
| `djje` | 定金金额 | `decimal(14,2)` | YES |  |
| `yjje` | 押金金额 | `decimal(14,2)` | YES |  |
| `jsfs` | 驾驶方式 | `enum('自驾','配驾')` | YES |  |
| `xs` | 销售 | `enum('余晓果','张博','苏鑫','龙')` | YES |  |
| `khgs` | 客户归属 | `enum('卡谷卡','盐','龙')` | YES |  |
| `khxqjdjxx` | 客户需求机定金信息 | `text` | YES |  |
| `gl1` | 关联 1 | `text` | YES |  |

### 代驾费用明细表（`cw_djfymxb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `fksj` | 付款时间 | `datetime` | YES |  |
| `dx` | 单选 | `enum('七彩代驾','集蚂蚁代驾','滴滴代驾','其他')` | YES |  |
| `yt` | 用途 | `enum('换车','送车','收车','其他','取车','配驾')` | YES |  |
| `qscsj` | 取/送车时间 | `datetime` | YES |  |
| `mdd` | 目的地 | `varchar(255)` | NO |  |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `djf` | 代驾费 | `varchar(255)` | NO |  |
| `bxje` | 报销金额 | `decimal(14,2)` | YES |  |
| `hjfkje` | 合计付款金额 | `date` | YES |  |
| `bz` | 备注 | `text` | YES |  |
| `fktp` | 付款图片 | `json` | YES |  |
| `ye` | 余额 | `decimal(14,2)` | YES |  |
| `bz2` | 备注 2 | `text` | YES |  |

### 费用汇总表（`cw_fyhzb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `fylx` | 费用类型 | `enum('报销费用','维修费用','保险费用','板车费用','推广费','代驾费','杂费','车辆折旧','配件')` | YES |  |
| `fyfsrqtqny` | 费用发生日期-提取年月 | `varchar(100)` | NO |  |
| `fyfsrq` | 费用发生日期 | `date` | YES |  |
| `je` | 金额 | `decimal(14,2)` | YES |  |
| `dyljfy` | 当月累计费用 | `decimal(14,2)` | YES |  |
| `dyljfyw` | 当月累计费用（万） | `decimal(14,2)` | YES |  |
| `gl` | 关联 | `text` | YES |  |

### 挂靠车辆成本利润表（`cw_gkclcblrb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `yf` | 月份 | `varchar(100)` | NO |  |
| `zyccb` | 总用车成本 | `decimal(14,2)` | YES |  |
| `dycb` | 当月成本 | `decimal(14,2)` | YES |  |
| `wxfy` | 维修费用 | `decimal(14,2)` | YES |  |
| `pjcgfy` | 配件采购费用 | `decimal(14,2)` | YES |  |
| `bc` | 板车 | `varchar(255)` | NO |  |
| `wzclfy` | 违章处理费用 | `decimal(14,2)` | YES |  |
| `srje` | 收入金额 | `decimal(14,2)` | YES |  |
| `gclqkje` | 该车辆欠款金额 | `decimal(14,2)` | YES |  |
| `ndsjczts` | 年度实际出租天数 | `decimal(14,2)` | YES |  |
| `clydczl` | 车辆月度出租率 | `decimal(14,2)` | YES |  |
| `gs` | 公式 | `text` | YES |  |
| `clndczl` | 车辆年度出租率 | `decimal(14,2)` | YES |  |
| `clbyczl` | 车辆本月出租率 | `decimal(14,2)` | YES |  |
| `dylr` | 当月利润 | `decimal(14,2)` | YES |  |

### 挂靠车主表（`cw_gkczb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `model_name` | 车型 | `varchar(255)` | NO |  |
| `plate_number` | 车牌 | `varchar(50)` | NO |  |
| `affiliated_status` | 挂靠状态 | `enum('长期在店','可调用','考虑中')` | YES |  |
| `spring_festival_available` | 春节是否可用 | `enum('是','否')` | YES |  |
| `affiliated_group` | 挂靠群 | `varchar(255)` | NO |  |
| `owner_code` | 车主编号（唯一） | `varchar(100)` | NO |  |
| `owner_name` | 车主姓名 | `varchar(100)` | NO |  |
| `owner_phone` | 车主电话 | `varchar(50)` | NO |  |
| `backup_contact` | 备用联系人 | `varchar(255)` | NO |  |
| `payment_account_info` | 收款账户信息 | `text` | YES |  |
| `contract_number` | 合同编号 | `text` | YES |  |
| `cooperation_start_date` | 合作开始日期 | `date` | YES |  |
| `cooperation_expire_date` | 合作到期日期 | `date` | YES |  |
| `days_to_contract_expire` | 距离合同到期日 | `text` | YES |  |
| `is_expire_warning` | 是否到期预警 | `varchar(50)` | NO |  |
| `contract_sign_status` | 合同签约状态 | `enum('生效','续约','终止','未签约')` | YES |  |
| `share_mode` | 分成模式 | `enum('固定租金','固定分成','阶梯分成','保底+分成')` | YES |  |
| `settlement_amount` | 结算金额 | `decimal(12,2)` | YES |  |
| `share_ratio` | 分成比例 | `varchar(50)` | NO |  |
| `settlement_cycle` | 结算周期 | `enum('日结','周结','月结')` | YES |  |
| `deposit_responsibility_agreement` | 押金责任约定 | `text` | YES |  |
| `handover_date` | 交车日期 | `date` | YES |  |
| `retrieve_date` | 取回日期 | `date` | YES |  |
| `current_location` | 当前所在位置 | `json` | YES |  |
| `vehicle_available_status` | 车辆可用状态 | `json` | YES |  |
| `allow_cross_city` | 是否允许跨城 | `enum('是','否')` | YES |  |
| `allow_long_rent` | 是否允许长租 | `enum('是','否')` | YES |  |
| `daily_min_deal_price` | 日最低成交价 | `decimal(12,2)` | YES |  |
| `handover_photos` | 交接照片 | `json` | YES |  |
| `forbidden_scenes` | 禁止场景 | `json` | YES |  |
| `backup_key_in_store` | 备用钥匙是否在店 | `enum('是','否')` | YES |  |
| `vehicle_documents_complete` | 随车证件是否齐 | `enum('是','否')` | YES |  |
| `current_cycle_payable` | 本周期应结金额 | `decimal(12,2)` | YES |  |
| `current_cycle_paid` | 本周期已结金额 | `decimal(12,2)` | YES |  |
| `current_cycle_unpaid` | 本周期未结金额 | `decimal(12,2)` | YES |  |
| `last_settlement_date` | 上次结算日期 | `date` | YES |  |
| `next_settlement_date` | 下次结算日期 | `date` | YES |  |
| `owner_credit_level` | 车主信用等级 | `enum('A','B','C')` | YES |  |
| `owner_exception_count` | 车主异常次数 | `int` | YES |  |
| `vehicle_exception_days` | 车辆异常天数 | `int` | YES |  |
| `monthly_trip_count` | 月度出车次数 | `int` | YES |  |
| `monthly_gmv` | 月度GMV | `decimal(12,2)` | YES |  |
| `monthly_net_contribution` | 月度净贡献 | `decimal(12,2)` | YES |  |
| `owner_profile` | 车主人物画像 | `json` | YES |  |
| `special_requirements` | 特殊要求/禁忌说明 | `json` | YES |  |
| `cost_control_notes` | 成本控制/结算注意事项 | `json` | YES |  |
| `communication_strategy` | 沟通策略 | `json` | YES |  |

### 挂靠合作明细表（`cw_gkhzmxb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `xh` | 序号 | `varchar(255)` | NO |  |
| `customer_id` | 客户编号 | `varchar(255)` | NO |  |
| `clxh` | 车辆型号 | `varchar(255)` | NO |  |
| `cphm` | 车牌号码 | `varchar(255)` | NO |  |
| `ccsj` | 出车时间 | `datetime` | YES |  |
| `hcsj` | 回车时间 | `datetime` | YES |  |
| `syts` | 使用天数 | `decimal(14,2)` | YES |  |
| `zjje` | 租金金额 | `decimal(14,2)` | YES |  |
| `jsdw` | 计算单位 | `enum('包月','天')` | YES |  |
| `hjzj` | 合计租金 | `decimal(14,2)` | YES |  |
| `wx` | 维修 | `varchar(255)` | NO |  |
| `by` | 保养 | `varchar(255)` | NO |  |
| `jy` | 机油 | `varchar(255)` | NO |  |
| `glf` | 过路费 | `varchar(255)` | NO |  |
| `gpsf` | GPS费 | `varchar(255)` | NO |  |
| `qt` | 其他 | `varchar(255)` | NO |  |
| `hjje` | 合计金额 | `decimal(14,2)` | YES |  |
| `jyfs` | 经营方式 | `varchar(255)` | NO |  |
| `bz` | 备注 | `text` | YES |  |

### GPS付款表（`cw_gpsfkb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `azrq` | 安装日期 | `date` | YES |  |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `clly` | 车辆来源 | `varchar(255)` | NO |  |
| `clgpssbxh` | 车辆GPS 设备序号 | `varchar(255)` | NO |  |
| `pt` | 平台 | `json` | YES |  |
| `gpssfk` | GPS实付款 | `date` | YES |  |
| `fklx` | 付款类型 | `json` | YES |  |
| `fkrq` | 付款日期 | `date` | YES |  |
| `ss` | 实收 | `varchar(255)` | NO |  |
| `lr` | 利润 | `decimal(14,2)` | YES |  |
| `gs` | 公式 | `text` | YES |  |
| `fkrqtqny` | 付款日期-提取年月 | `varchar(100)` | NO |  |

### 工资报表（`cw_gzbb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `yf` | 月份 | `varchar(100)` | NO |  |
| `ry` | 人员 | `varchar(255)` | NO |  |
| `gw` | 岗位 | `varchar(255)` | NO |  |
| `sf` | 实发 | `decimal(14,2)` | YES |  |
| `rq` | 日期 | `date` | YES |  |

### 回车违章情况表（`cw_hcwzqkb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `hydj` | 会员等级 | `enum('芒果派','青芒果','金芒果','黑芒果')` | YES |  |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `hcsj` | 回车时间 | `datetime` | YES |  |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `hcsjjsnggzrhrq` | 回车时间-计算 N 个工作日后日期 | `datetime` | YES |  |
| `gs3` | 公式 3 | `text` | YES |  |
| `wzqk` | 违章情况 | `varchar(255)` | NO |  |
| `thzt` | 退还状态 | `varchar(255)` | NO |  |
| `clfs` | 处理方式 | `enum('客户自行处理','公司代处理')` | YES |  |
| `sqkhwzclje` | 收取客户违章处理金额 | `decimal(14,2)` | YES |  |
| `sqwzkkjt` | 收取违章扣款截图 | `json` | YES |  |
| `gszfwzclje` | 公司支付违章处理金额 | `decimal(14,2)` | YES |  |
| `clzfjt` | 处理支付截图 | `json` | YES |  |
| `wzyjthry` | 违章押金退还人员 | `decimal(14,2)` | YES |  |
| `wzyjthlj` | 违章押金退还路径 | `varchar(255)` | YES |  |
| `gl` | 关联 | `text` | YES |  |
| `glhcfb` | 关联-回车(副本) | `text` | YES |  |
| `gl1` | 关联 1 | `text` | YES |  |

### 酒店付款台账表（`cw_jdfktzb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `jdmc` | 酒店名称 | `enum('昆明洲际','昆明华邑','昆明君悦','昆明索菲特')` | YES |  |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `khq` | 客户群 | `varchar(255)` | NO |  |
| `fksj` | 付款时间 | `datetime` | YES |  |
| `fkje` | 付款金额 | `date` | YES |  |
| `fkpzzd` | 付款凭证/账单 | `json` | YES |  |
| `sskhje` | 实收客户金额 | `decimal(14,2)` | YES |  |
| `skpz` | 收款凭证 | `json` | YES |  |
| `lr` | 利润 | `decimal(14,2)` | YES |  |

### 客户主档案表（`cw_khzdab`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `customer_id` | 客户编号 | `varchar(100)` | NO |  |
| `customer_name` | 姓名 | `varchar(100)` | NO |  |
| `phone` | 电话 | `varchar(50)` | NO |  |
| `customer_group` | 客户群 | `varchar(255)` | NO |  |
| `customer_type` | 客户类型 | `varchar(255)` | YES |  |
| `member_level` | 会员等级 | `enum('金芒果','青芒果','芒果派')` | YES |  |
| `source` | 来源 | `enum('抖音','自然','到店','同行','转介绍','龙哥拉群','坤哥拉群')` | YES |  |
| `responsible_sales` | 负责销售 | `varchar(100)` | NO |  |
| `first_reception_time` | 首次接待时间 | `datetime` | YES |  |
| `latest_follow_up_date` | 最近跟进日期 | `date` | YES |  |
| `next_follow_up_date` | 下次跟进日期 | `date` | YES |  |
| `accumulated_deal_amount` | 累计成交金额 | `decimal(12,2)` | YES |  |
| `accumulated_deal_count` | 累计成交次数 | `int` | YES |  |
| `latest_deal_date` | 最近成交日期 | `text` | YES |  |
| `order_records` | 订单记录 | `text` | YES |  |
| `points_balance` | 积分余额 | `decimal(12,2)` | YES |  |
| `car_use_records` | 用车记录 | `text` | YES |  |
| `relation` | 关联 | `text` | YES |  |
| `relation_1` | 关联 1 | `text` | YES |  |

### 客户资金流水表（`cw_khzjlsb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `ddbh` | 订单编号 | `varchar(255)` | NO |  |
| `khxm` | 客户姓名 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `skrq` | 收款日期 | `date` | YES |  |
| `srlx` | 收入类型 | `enum('定金','尾款','补款','赔偿款','账上剩余金额转入','租金','押金','转到下次用车')` | YES |  |
| `srje` | 收入金额 | `decimal(14,2)` | YES |  |
| `skqd` | 收款渠道 | `enum('收钱吧','财务微信','老板微信（05）','老板微信（09）','工商银行','招商银行','公户','抖音','现金','惠支付','销售微信','微信小程序','坤总微信（官方微信）')` | YES |  |
| `skjt` | 收款截图 | `json` | YES |  |
| `fkrq` | 付款日期 | `date` | YES |  |
| `tklx` | 退款类型 | `enum('车辆押金','违章押金','其他','转到下次用车')` | YES |  |
| `tkje` | 退款金额 | `date` | YES |  |
| `tkqd` | 退款渠道 | `enum('销售微信','招商银行','收钱吧','财务微信','现金','富滇银行（对公户）','工商银行卡','LS00265')` | YES |  |
| `tkjt` | 退款截图 | `json` | YES |  |
| `ssk` | 实收款 | `date` | YES |  |
| `khqk` | 客户欠款 | `decimal(14,2)` | YES |  |
| `bz` | 备注 | `text` | YES |  |
| `gl` | 关联 | `text` | YES |  |
| `ddbhddjszbxscdccwfb` | 订单编号-订单结算主表（销售&车队长&财务）(副本) | `varchar(255)` | NO |  |

### 年度利润表（`cw_ndlrb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `rq` | 日期 | `date` | YES |  |
| `yfrq` | 月份/日期 | `varchar(100)` | NO |  |
| `dysr` | 当月收入 | `decimal(14,2)` | YES |  |
| `dycb` | 当月成本 | `decimal(14,2)` | YES |  |
| `dyfy` | 当月费用 | `decimal(14,2)` | YES |  |
| `mlr` | 毛利润 | `decimal(14,2)` | YES |  |
| `mlrw` | 毛利润（万） | `decimal(14,2)` | YES |  |
| `mll` | 毛利率 | `decimal(14,2)` | YES |  |
| `jlr` | 净利润 | `decimal(14,2)` | YES |  |
| `jlrw` | 净利润（万） | `decimal(14,2)` | YES |  |
| `jll` | 净利率 | `decimal(14,2)` | YES |  |

### 配件采购表（`cw_pjcgb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `pjmc` | 配件名称 | `varchar(255)` | NO |  |
| `scjlid` | 生成记录ID | `text` | YES |  |
| `cllx` | 车辆类型 | `enum('自有','非自有')` | YES |  |
| `cgry` | 采购人员 | `varchar(255)` | NO |  |
| `gmqd` | 购买渠道 | `date` | YES |  |
| `cgje` | 采购金额 | `decimal(14,2)` | YES |  |
| `gmsj` | 购买时间 | `datetime` | YES |  |
| `zbq` | 质保期 | `varchar(255)` | NO |  |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `pjtppjfhdfkjt` | 配件图片、配件发货单、付款截图 | `json` | YES |  |
| `ckr` | 出库人 | `varchar(255)` | NO |  |
| `pjsycl` | 配件使用车辆 | `varchar(255)` | NO |  |

### 人员表（`cw_ryb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `username` | 登录用户名 | `varchar(100)` | NO |  |
| `display_name` | 姓名/显示名 | `varchar(100)` | NO |  |
| `contact` | 联系方式 | `varchar(100)` | NO |  |
| `password` | 密码 | `varchar(255)` | NO |  |
| `status` | 0表示没用、1表示生效 | `tinyint` | NO | 1 |
| `permission` | 权限 | `enum('administrator','fleet_manager','sales','finance')` | NO | finance |

### 收入明细表（`cw_srmxb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `fyfsrq` | 费用发生日期 | `date` | YES |  |
| `rq` | 日期 | `date` | YES |  |
| `srfsy` | 收入发生月 | `varchar(100)` | NO |  |
| `srlx` | 收入类型 | `enum('租金收入','其他收入')` | YES |  |
| `srje` | 收入金额 | `decimal(14,2)` | YES |  |
| `dyljyye` | 当月累计营业额 | `varchar(255)` | NO |  |
| `dyljyyew` | 当月累计营业额（万） | `varchar(255)` | NO |  |
| `fyfsrqddjszbxscdccwfb` | 费用发生日期-订单结算主表（销售&车队长&财务）(副本) | `date` | YES |  |

### 税务凭证表（`cw_swpzb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `pzlx` | 凭证类型 | `text` | YES |  |
| `rq` | 日期 | `date` | YES |  |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `cph` | 车牌号 | `varchar(255)` | NO |  |
| `je` | 金额 | `decimal(14,2)` | YES |  |
| `kjdw` | 开具单位 | `varchar(255)` | NO |  |
| `pzfj` | 凭证附件 | `json` | YES |  |
| `dyddbh` | 对应订单编号 | `varchar(255)` | NO |  |

### 维修报备申请表（`cw_wxbbsqb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `tjsqsj` | 提交申请时间 | `datetime` | YES |  |
| `khbh` | 客户编号 | `varchar(255)` | NO |  |
| `sqr` | 申请人 | `varchar(255)` | NO |  |
| `wxxmfzr` | 维修项目负责人 | `varchar(255)` | NO |  |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `sgyy` | 事故原因 | `enum('正常磨损','客户操作不当','第三方事故','车辆质量问题','原因待查')` | YES |  |
| `dqclczdwt` | 当前车辆存在的问题 | `text` | YES |  |
| `ssbwtp` | 损伤部位图片 | `json` | YES |  |
| `sfxywx` | 是否需要维修 | `enum('是','否')` | YES |  |
| `sgpcr` | 事故赔偿人 | `varchar(255)` | NO |  |
| `sfzbx` | 是否走保险 | `enum('是','否')` | YES |  |
| `bxgs` | 保险公司 | `varchar(255)` | NO |  |
| `bxgspfje` | 保险公司赔付金额 | `decimal(14,2)` | YES |  |
| `khzcjpfje` | 客户追偿及赔付金额 | `decimal(14,2)` | YES |  |
| `xlcabj` | 修理厂A报价 | `json` | YES |  |
| `xlcbbj` | 修理厂B报价 | `json` | YES |  |
| `zzqdxlc` | 最终确定修理厂 | `varchar(255)` | NO |  |
| `wxxm` | 维修项目 | `varchar(255)` | NO |  |
| `zzwxje` | 最终维修金额 | `decimal(14,2)` | YES |  |
| `jcwxrq` | 进场维修日期 | `date` | YES |  |
| `yjccsj` | 预计出厂时间 | `datetime` | YES |  |
| `sh` | 售后 | `varchar(255)` | NO |  |
| `sxry` | 送修人员 | `varchar(255)` | NO |  |
| `bz` | 备注 | `text` | YES |  |

### 维修成本表（`cw_wxcbb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `vehicle_info` | 车辆信息 | `varchar(255)` | NO |  |
| `plate_number` | 车牌 | `varchar(50)` | NO |  |
| `maintenance_item` | 维修/保养项目 | `varchar(255)` | NO |  |
| `has_replaced_parts` | 是否有更换配件 | `enum('否','是')` | YES |  |
| `replaced_parts` | 更换配件 | `text` | YES |  |
| `repair_sent_time` | 送修时间 | `datetime` | YES |  |
| `repair_shop_name` | 修理厂名字 | `varchar(255)` | NO |  |
| `payment_date` | 付款日期 | `date` | YES |  |
| `payment_month` | 付款日期-提取年月 | `varchar(20)` | NO |  |
| `payment_amount` | 付款金额 | `decimal(12,2)` | YES |  |
| `repair_shop_bill` | 修理厂维修清单 | `json` | YES |  |
| `payment_screenshot` | 付款截图 | `json` | YES |  |
| `payment_application` | 付款申请 | `text` | YES |  |

### 业务员押金流水表（`cw_ywyyjlsb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `ry` | 人员 | `varchar(255)` | NO |  |
| `yjcrrq` | 押金存入日期 | `date` | YES |  |
| `je` | 金额 | `decimal(14,2)` | YES |  |
| `lx` | 类型 | `enum('存入','支出')` | YES |  |
| `yjze` | 押金总额 | `decimal(14,2)` | YES |  |
| `gzt` | 工资条 | `decimal(14,2)` | YES |  |
| `bz` | 备注 | `text` | YES |  |

### 运营杂费报销表（`cw_yyzfbxb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `fksj` | 付款时间 | `datetime` | YES |  |
| `fklx` | 付款类型 | `enum('保洁费','美团跑腿','快递费','车辆钥匙费用','M5黄牛检车费用','违章查询','电话费','京东快递','邮政快递','检车费用','工具','水电费','抖音充值','其他')` | YES |  |
| `je` | 金额 | `decimal(14,2)` | YES |  |
| `bz` | 备注 | `text` | YES |  |
| `tp` | 图片 | `json` | YES |  |

### 自有车辆成本利润表（`cw_zyclcblrb`）

| 字段名 | 字段注释 | 类型 | 是否可空 | 默认值 |
|---|---|---|---|---|
| `id` | 主键ID | `bigint unsigned` | NO |  |
| `create_time` | 创建时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `update_time` | 更新时间 | `datetime` | NO | CURRENT_TIMESTAMP |
| `status` | 状态：0停用，1启用 | `tinyint` | NO | 1 |
| `cx` | 车型 | `varchar(255)` | NO |  |
| `cp` | 车牌 | `varchar(255)` | NO |  |
| `grsj` | 购入时间 | `datetime` | YES |  |
| `scccrq` | 首次出车日期 | `date` | YES |  |
| `gmqd` | 购买渠道 | `date` | YES |  |
| `cj` | 车价 | `varchar(255)` | NO |  |
| `gzs` | 购置税 | `decimal(14,2)` | YES |  |
| `cssj` | 出售时间 | `datetime` | YES |  |
| `sj` | 售价 | `varchar(255)` | NO |  |
| `wxfy` | 维修费用 | `decimal(14,2)` | YES |  |
| `bxfy` | 保险费用 | `decimal(14,2)` | YES |  |
| `pjcgfy` | 配件采购费用 | `decimal(14,2)` | YES |  |
| `bc` | 板车 | `varchar(255)` | NO |  |
| `gpssfkqh` | GPS实付款-求和 | `date` | YES |  |
| `wzclfy` | 违章处理费用 | `decimal(14,2)` | YES |  |
| `f11y1ryqsr` | 11月1日以前收入 | `decimal(14,2)` | YES |  |
| `f11y1rqccts` | 11月1日前出车天数 | `date` | YES |  |
| `ywsj` | 以往数据 | `varchar(255)` | NO |  |
| `srje` | 收入金额 | `decimal(14,2)` | YES |  |
| `gclqkje` | 该车辆欠款金额 | `decimal(14,2)` | YES |  |
| `sjczts` | 实际出租天数 | `decimal(14,2)` | YES |  |
| `clndczl` | 车辆年度出租率 | `decimal(14,2)` | YES |  |
| `lr` | 利润 | `decimal(14,2)` | YES |  |
| `clhbzq` | 车辆回报周期 | `decimal(14,2)` | YES |  |

<!-- POS_DB_SCHEMA_END -->
