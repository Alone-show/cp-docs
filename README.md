# cp-docs

DSH（DeepSeek Harness）插件：**只用一个斜杠命令 `/cp-docs` + 自然语言**，按机型检索本地产品资料（参数 / 接口定义 / 线束定义 / 编程节点 / 硬件工作点），把确定的事实交给模型作答。

```
/cp-docs SPRING2PRO 的屏幕尺寸是多少
/cp-docs APOLLO2 12PRO 的工作温度范围
/cp-docs SPRING2PRO 26P 接口第 5 脚是什么
/cp-docs CP023 的 INPUT1 接到哪个 GPIO
/cp-docs APOLLO 7 PRO 的 RS485 设备节点
/cp-docs 支持哪些机型
```

- **触发方式**：只有用户手动输入 `/cp-docs ...` 才会执行。插件不注册模型工具，模型无法自行发起检索。
- **检索链路**：100% 读本地数据，不联网、不需要登录。
- **输出**：命令先把「问题 + 命中机型 + 事实值 + 出处」作为一条用户消息推给会话，再由模型生成最终回答（数值不会被改写）。

## 功能

| 类别 | 示例问法 |
|---|---|
| 产品参数 | 屏幕尺寸 / 分辨率 / 亮度 / CPU / 内存 / 存储 / 系统 / 4G / WiFi / 蓝牙 / GNSS / CAN / RS232 / RS485 / USB / 网口 / 摄像头 / 电源 / 防护等级 / 工作温度 / 整机尺寸 / 重量 |
| 接口定义表 | `26P 接口第 5 脚是什么` |
| 线束定义表 | `摄像头航空插座线束` |
| 编程节点 | `RS485 设备节点` → `/dev/ttyWK1` |
| 硬件工作点 | `INPUT1 接到哪个 GPIO` → `[MCU] PC0` |
| 机型目录 | `支持哪些机型` |

机型归一移植自 [`@local/firmware-finder`](https://github.com/Alone-show/firmware-finder)，支持业务写法与省略尺寸段：

| 输入 | 结果 |
|---|---|
| `SPRING2PRO` / `SP2-10PRO` / `RK / SPRING2-10PRO` / `CP023-SPRING2 10PRO` | 1.23 SPRING 10 PRO 二代 |
| `APOLLO2 12PRO` | 1.13 APOLLO 12 PRO |
| `SPRING2` | 不唯一 → 返回候选，不硬猜 |
| `APOLLO X` | 1.5（精确名优先，不被 `APOLLO 12X` 的 gap 命中拖成歧义） |

歧义时命令直接列出候选（不触发模型）；字段未收录时明确回答“文档未收录”，不推断。

## 在 DSH Web 中安装

> 插件是 Cordis bundle，安装通过 Harness 自带的 `plugin_manager` 完成（需要一次审批）。目标 profile 用你正在跑的 Web profile（默认 `web`）。

### 1. 取得插件

```bash
git clone https://github.com/Alone-show/cp-docs.git ~/.dsh/plugins/cp-docs
```

（也可以放在任意目录，只要路径固定；不要放进 `node_modules`。）

### 2. 在 DSH Web 里安装

在 Harness 对话里让助手执行：

```
把 /home/<你>/.dsh/plugins/cp-docs 安装为插件
```

助手的实际调用等价于：

```
plugin_manager
  action: install_bundle
  target: /home/<你>/.dsh/plugins/cp-docs
```

安装成功后返回 `application: "applied"`，插件立即生效（无需重启；如果斜杠命令列表没刷新，刷新一次页面即可）。

安装器会把包以 `link:` 方式加入 profile，并自动启用 bundle，不需要手工改 `package.json` / `cordis.patch.yml`。

### 3. 验证

在 Web 输入框里输入：

```
/cp-docs 支持哪些机型
```

应返回 28 款机型清单；再试：

```
/cp-docs SPRING2PRO 的屏幕尺寸
```

预期：命令先回「已检索：1.23 SPRING 10 PRO 二代…」，随后模型回答 10.1 英寸（1024*600px）。

### 数据从哪来

仓库自带 `data/`（28 机型的参数/接口/线束/编程节点/工作点，约 1.1MB）。
**首次执行 `/cp-docs` 时**，插件会把 `data/` 复制成当前会话工作区的 `.cpdocs/`，之后只读它。

- 想换数据目录：设置 `DSH_CPDOCS_DIR=/path/to/.cpdocs`。
- 想用自己的源资料重建：把源资料按 `work/cpdoc/ai-readable` 的结构放好，执行

  ```bash
  cd <你的 workspace>
  node ~/.dsh/plugins/cp-docs/lib/import.js
  ```

### 更新 / 卸载

```bash
cd ~/.dsh/plugins/cp-docs && git pull     # 更新后重启 DSH Web 生效
```

卸载（在 Harness 里让助手执行）：

```
plugin_manager action: remove_bundle target: @local/cp-docs
```

## 工作原理

```
/cp-docs <自然语言>
   ↓ 命令 handler（确定性、离线）
1. 从整句切出机型串（句首/句中、带"的"、省略尺寸段都能切）
2. 机型归一：canonModel / queryCores / gapScore / scoreCore / resolveModel
3. 取本地资料：params_flat / 接口表 / 线束表 / 编程节点 / 工作点
4. 拼事实块，agent.followup() 推给会话
   ↓
5. 模型依据事实块作答（注明出处；未收录直说）
```

数据目录（自动生成到会话工作区）：

```
.cpdocs/
├── models.json          # 28 机型 + cores + 别名 + CP 编码
├── fields.json          # 字段字典（中文同义词）
└── models/<id>/
    ├── spec.json        # params_flat + 参数/接口/线束表原文行 + 图片来源
    ├── programming.json # 编程节点
    ├── workpoints.json  # 硬件工作点
    └── doc.md           # 可读版
```

## 开发

```bash
cd cp-docs
node --test test/*.test.mjs     # 20 个单测：机型归一/解析/字段/事实/命令/路径
node lib/import.js              # 从 work/cpdoc/ai-readable 重建 data/
```

- 机型别名：`lib/import.js` 顶部 `ALIASES` / `CP_CODES`
- 字段同义词：`lib/fields.js`
- 命令与事实块：`index.js` / `lib/query.js` / `lib/framing.js`

## 说明

- 数据来自产品文档（图片表格经视觉模型转写 + 人工抽检）。图文冲突（如个别机型尺寸/重量在页面文字与参数表不一致）在 `spec.json` 的 `warnings` 里保留双值，回答时会同时给出。
- 只覆盖这 28 款机型；资料里没有的机型/字段会明确说明，不做推断。
