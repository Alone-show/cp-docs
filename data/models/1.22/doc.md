# 1.22 SPRING 10 二代 特别版

**系列**：SPRING ｜ **尺寸**：281*181*42 mm ｜ **重量**：1.5 kg

**简介**：坚固型车载平板，SPRING 10二代的基础上重新设计面壳，支持RS-232*2，RS-485*1，CAN*2 (支持J1939, CANopen, ISO15765)，支持CVBS 摄像头 480p*2/4，支持 CP ISOBUS VT，一台设备适配所有带VT的农机具，支持 CP-Comm 高速总线架构，轻松完成软件开发，广泛应用于精准农业，工程机械，智慧交通，智慧矿山，仓库管理等。

### 关键参数速查

| 字段 | 值 |
| --- | --- |
| CPU | 4核, 1.2GHz |
| 内存 | 2G |
| 存储 | 16G |
| 操作系统 | Android 6.0.1 / Linux 3.10 |
| 屏幕尺寸(inch) | 10.1 |
| 分辨率 | 1024*600 |
| 亮度 | 750cd/m2 |
| 触摸 | 电容触摸显示屏,支持5指触控 |
| 蜂窝网络 | 4G |
| WiFi | WiFi 2.4G |
| 蓝牙 | BT 4.2 BLE |
| GNSS | (可选配米级 / 亚米级 / 厘米级定位板卡) |
| CAN | CAN*1/2 |
| RS232 | RS232*2 |
| RS485 | RS485*1 |
| DC输出 | 12V 直流对外供电*3 |
| USB | USB 2.0*1 |
| 以太网 | 以太网*1(可选) |
| 摄像头输入 | CVBS 摄像头 480p*2/4 |
| 扬声器 | 内置扬声器*1 |
| 麦克风 | 内置麦克风*1(可选) |
| 电源输入 | 电源 5-36V 直流输入 |
| ACC检测 | 开机点火 ACC 状态检测 |
| 防护等级 | IP65 |
| 震动标准 | 震动标准 (工作中): MIL-STD-810 |
| 工作温度 | -30℃~+70℃ |
| 存储温度 | -40℃~+85℃ |
| 湿度 | 95%, 无冷凝 |
| 连接器 | 标准工业级防水连接器<br>SMA 母头*1<br>TNC 母头*2<br>USB 2.0 接口*1 |
| 功能按键 | 电源开关键*1, 自定义功能按键*2 |

### 产品参数｜3.1 产品参数
*图3.1 配置信息*

| 分类 | 内容 |
| --- | --- |
| 系统 | 4核, 1.2GHz<br>2G RAM<br>16G ROM<br>Android 6.0.1<br>Linux 3.10 |
| 通讯和接口 | 4G<br>WiFi 2.4G<br>BT 4.2 BLE<br>GNSS (可选配米级 / 亚米级 / 厘米级定位板卡)<br>RS232*2<br>RS485*1<br>CAN*1/2<br>DI*2<br>USB 2.0*1<br>12V 直流对外供电*3<br>以太网*1(可选)<br>支持 CP ISOBUS VT |
| 连接器 | 标准工业级防水连接器<br>SMA 母头*1<br>TNC 母头*2<br>USB 2.0 接口*1 |
| 显示 | 10.1” 电容触摸显示屏,支持5指触控<br>亮度:750cd/m2<br>分辨率:1024*600px |
| 影音和传感 | CVBS 摄像头 480p*2/4<br>内置麦克风*1(可选)<br>内置扬声器*1 |
| 电源管理 | 电源 5-36V 直流输入<br>开机点火 ACC 状态检测 |
| 规格 | 尺寸 (W*H*D): 281*181*42mm<br>重量: 1.5kg |
| 环境参数 | 防护等级IP65<br>震动标准 (工作中): MIL-STD-810<br>冲击标准 (工作中): ISO16750<br>湿度95%, 无冷凝<br>工作温度:-30℃~+70℃<br>仓储温度:-40℃~+85℃ |
| 功能按键 | 电源开关键*1, 自定义功能按键*2 |

> 注：本机型 4 列并排版式左栏为 系统/通讯和接口/连接器，右栏为 显示/影音和传感/电源管理/规格/环境参数/功能按键，已按「左栏自上而下 → 右栏自上而下」折叠为 2 列。本图原文用半角逗号与半角括号，已原样保留。
本表与 1.21 SPRING 10 二代 共用同一张图（share_note：仅面壳不同），转写结果复用。

> 原图：https://mdmobs.cpuniverse.cn/gitbook/01-%E4%BA%A7%E5%93%81%E4%BB%8B%E7%BB%8D/%E5%8F%82%E6%95%B0%E8%A1%A8/SPRING%2010%E4%BA%8C%E4%BB%A3.png

### 接口定义｜3.2 接口定义
*图3.2.2 26P 接口定义表*

| 安费诺-26P | PIN脚定义 | 安费诺-26P | PIN脚定义 |
| --- | --- | --- | --- |
| 1 | B+ | 14 | RS232_TX1 |
| 2 | B- | 15 | GPIO_INPUT2 |
| 3 | ACC | 16 | CAMERA_1 |
| 4 | CAN1_H | 17 | RS232_RX2 |
| 5 | CAN1_L | 18 | RJ45_TX- |
| 6 | OUTPUT1 | 19 | RJ45_RX- |
| 7 | OUTPUT2/AUDIO_LINEOUT | 20 | RS232_RX1 |
| 8 | GND | 21 | GPIO_INPUT1 |
| 9 | RS485-A | 22 | CAMERA_0 |
| 10 | RS485-B | 23 | CAMERA_PWR_12V |
| 11 | CAN2_H | 24 | RS232_TX2 |
| 12 | CAN2_L | 25 | RJ45_TX+ |
| 13 | OUTPUT3/UM_1PPS | 26 | RJ45_RX+ |

> 注：4 列并排（左 PIN 1-13、右 PIN 14-26），已按 PIN 顺序合并为 26 行；PIN 1..26 连续无缺。原图无标题文字。
本表与 1.21 SPRING 10 二代 共用同一张图（share_note：仅面壳不同），转写结果复用。

> 原图：https://mdmobs.cpuniverse.cn/gitbook/01-%E4%BA%A7%E5%93%81%E4%BB%8B%E7%BB%8D/spring_10/10%E5%AF%B8%E6%8E%A5%E5%8F%A3%E5%AE%9A%E4%B9%89.png

### 接口定义｜3.2 接口定义
*图3.2.2 26P 摄像头航插定义表*

| V1-PIN | V1-Definition | V2-PIN | V2-Definition | V3-PIN | V3-Definition | V4-PIN | V4-Definition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | POWER | 1 | POWER | 1 | POWER | 1 | POWER |
| 2 | GND | 2 | GND | 2 | GND | 2 | GND |
| 3 | - | 3 | - | 3 | - | 3 | - |
| 4 | AHD_0 | 4 | AHD_1 | 4 | AHD2 | 4 | AHD3 |

> 注：原图是两行合并表头：第一行 V1/V2/V3/V4 各跨 PIN、Definition 两列，第二行为 PIN|Definition；此处把两级表头合并写成 V1-PIN/V1-Definition 等列名。原图底部边框被裁切，但 4 芯航插定义 PIN 1-4 已完整可见。V3/V4 的 AHD2、AHD3 原文无下划线，已原样保留。
本表与 1.21 SPRING 10 二代 共用同一张图（share_note：仅面壳不同），转写结果复用。

> 原图：https://mdmobs.cpuniverse.cn/gitbook/01-%E4%BA%A7%E5%93%81%E4%BB%8B%E7%BB%8D/spring_10/SPRING%2010/SPRING2%20%20%E6%91%84%E5%83%8F%E5%A4%B4%E5%AE%9A%E5%88%B6%E7%89%88%E6%8E%A5%E5%8F%A3%E5%AE%9A%E4%B9%89.png

### 数据提示

- 与 1.21 SPRING 10 二代 共用参数表/接口图（仅面壳不同）：本机型 candidates 为空，依任务 share_note 复用 1.21 的同名图片转写结果，故 tables/skipped 的 sha256 与 1.21 的 candidates 一致，而非与本机型（空）候选集比对。
