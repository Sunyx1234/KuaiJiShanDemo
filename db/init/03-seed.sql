-- ============================================================================
-- 正泰集团后台管理平台 · 数据库初始化脚本 03
-- 模块：初始化数据（组织/岗位/角色/用户/字典/园区）
-- 依赖：先执行 01、02
-- 注意：业务 mock（设备/摄像头/告警/访客）建议用迁移脚本从现有 src/data/mock.ts 导入，
--       本文件只提供结构稳定的基础数据。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 组织树（集团总部 → 部门）
-- ----------------------------------------------------------------------------
INSERT INTO sys_dept (dept_id, parent_id, ancestors, dept_name, park_id, order_num, leader, status)
OVERRIDING SYSTEM VALUE VALUES
    (100, 0,   '0',       '正泰集团总部',   NULL, 0, '集团管理层', '1'),
    (101, 100, '0,100',   '安全生产部',     NULL, 1, '安全生产负责人', '1'),
    (102, 100, '0,100',   '数字化中心',     NULL, 2, '数字化负责人', '1'),
    (103, 100, '0,100',   '行政与访客中心', NULL, 3, '行政负责人', '1'),
    (200, 0,   '0',       '华东产业基地（嘉兴）', NULL, 10, '基地总经理', '1'),
    (201, 200, '0,200',   '嘉兴-生产车间',  NULL, 1, '车间主任', '1'),
    (202, 200, '0,200',   '嘉兴-设备动力部', NULL, 2, '动力部负责人', '1');

-- ----------------------------------------------------------------------------
-- 2. 岗位
-- ----------------------------------------------------------------------------
INSERT INTO sys_post (post_code, post_name, order_num) VALUES
    ('ceo',        '集团管理层',   1),
    ('supervisor', '值班管理员',   2),
    ('operator',   '现场责任人',   3),
    ('safety',     '安全管理员',   4),
    ('admin',      '系统管理员',   5);

-- ----------------------------------------------------------------------------
-- 3. 角色
-- ----------------------------------------------------------------------------
INSERT INTO sys_role (role_id, role_name, role_key, data_scope, order_num, status, remark)
OVERRIDING SYSTEM VALUE VALUES
    (1, '超级管理员', 'admin',    '1', 1, '1', '拥有全部菜单与数据权限'),
    (2, '值班管理员', 'operator', '3', 2, '1', '本部门及以下数据'),
    (3, '现场责任人', 'assignee', '5', 3, '1', '仅本人相关工单');

-- ----------------------------------------------------------------------------
-- 4. 用户（admin 密码占位，需用 Spring Security 生成 BCrypt 后替换）
-- ----------------------------------------------------------------------------
-- 生产环境请通过后端初始化接口生成 BCrypt 哈希，或使用下方示例：
--   BCryptPasswordEncoder().encode("admin123") 的结果填入 password
INSERT INTO sys_user (user_id, dept_id, username, password, nickname, sex, status)
OVERRIDING SYSTEM VALUE VALUES
    (1, 100, 'admin', '{bcrypt}$2a$10$REPLACE_WITH_REAL_HASH', '系统管理员', '1', '1'),
    (2, 101, 'operator01', '{bcrypt}$2a$10$REPLACE_WITH_REAL_HASH', '值班管理员', '1', '1'),
    (3, 201, 'worker01',   '{bcrypt}$2a$10$REPLACE_WITH_REAL_HASH', '现场责任人', '1', '1');

-- ----------------------------------------------------------------------------
-- 5. 用户-角色 / 用户-岗位
-- ----------------------------------------------------------------------------
INSERT INTO sys_user_role (user_id, role_id) VALUES
    (1, 1),
    (2, 2),
    (3, 3);

INSERT INTO sys_user_post (user_id, post_id) VALUES
    (1, 1),
    (2, 2),
    (3, 3);

-- ----------------------------------------------------------------------------
-- 6. 菜单（后台管理平台导航骨架；perms 供后端鉴权，按需增补按钮级）
-- ----------------------------------------------------------------------------
INSERT INTO sys_menu (menu_id, parent_id, menu_name, menu_type, path, component, perms, icon, order_num)
OVERRIDING SYSTEM VALUE VALUES
    -- 一级目录
    (1000, 0,    '系统管理', 'M', '/system', NULL, NULL, 'Setting', 1),
    (2000, 0,    '审批流',   'M', '/workflow', NULL, NULL, 'Share', 2),
    (3000, 0,    '业务监控', 'M', '/monitor', NULL, NULL, 'Monitor', 3),
    (4000, 0,    '业务数据', 'M', '/business', NULL, NULL, 'OfficeBuilding', 4),
    -- 系统管理
    (1001, 1000, '用户管理', 'C', 'user',  'system/user/index', 'system:user:list', 'User', 1),
    (1002, 1000, '角色管理', 'C', 'role',  'system/role/index', 'system:role:list', 'UserFilled', 2),
    (1003, 1000, '菜单管理', 'C', 'menu',  'system/menu/index', 'system:menu:list', 'Menu', 3),
    (1004, 1000, '组织管理', 'C', 'dept',  'system/dept/index', 'system:dept:list', 'OfficeBuilding', 4),
    (1005, 1000, '岗位管理', 'C', 'post',  'system/post/index', 'system:post:list', 'Postcard', 5),
    (1006, 1000, '字典管理', 'C', 'dict',  'system/dict/index', 'system:dict:list', 'Collection', 6),
    -- 审批流
    (2001, 2000, '流程定义', 'C', 'definition', 'workflow/definition/index', 'workflow:definition:list', 'Share', 1),
    (2002, 2000, '流程模型', 'C', 'model',     'workflow/model/index',     'workflow:model:list', 'Edit', 2),
    (2003, 2000, '表单设计', 'C', 'form',      'workflow/form/index',      'workflow:form:list', 'Document', 3),
    (2004, 2000, '任务中心', 'C', 'task',      'workflow/task/index',      'workflow:task:list', 'Tickets', 4),
    -- 业务监控
    (3001, 3000, '工单看板', 'C', 'order', 'monitor/order/index', 'monitor:order:list', 'DataAnalysis', 1),
    (3002, 3000, 'SLA 监控', 'C', 'sla',   'monitor/sla/index',   'monitor:sla:list', 'Timer', 2),
    -- 业务数据
    (4001, 4000, '园区管理', 'C', 'park',   'business/park/index',   'business:park:list', 'MapLocation', 1),
    (4002, 4000, '设备管理', 'C', 'device', 'business/device/index', 'business:device:list', 'Cpu', 2),
    (4003, 4000, '摄像头',   'C', 'camera', 'business/camera/index', 'business:camera:list', 'VideoCamera', 3),
    (4004, 4000, '访客管理', 'C', 'visitor','business/visitor/index','business:visitor:list', 'UserFilled', 4);

-- 超级管理员拥有全部菜单
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, menu_id FROM sys_menu;

-- ----------------------------------------------------------------------------
-- 7. 字典（工单/告警状态，供后台下拉与校验统一管理）
-- ----------------------------------------------------------------------------
INSERT INTO sys_dict_type (dict_name, dict_type, status, remark) VALUES
    ('AI告警状态', 'ai_alert_status', '1', '待确认/待派单/处理中/待复核/已归档/已排除'),
    ('工单进度',   'work_order_progress', '1', '待接单/已接单/已处置'),
    ('通知渠道',   'notify_channel', '1', '飞书/短信'),
    ('通知状态',   'notify_status', '1', '待发送/发送成功/发送失败');

INSERT INTO sys_dict_data (dict_type, dict_label, dict_value, order_num) VALUES
    ('ai_alert_status', '待确认', '待确认', 1),
    ('ai_alert_status', '待派单', '待派单', 2),
    ('ai_alert_status', '处理中', '处理中', 3),
    ('ai_alert_status', '待复核', '待复核', 4),
    ('ai_alert_status', '已归档', '已归档', 5),
    ('ai_alert_status', '已排除', '已排除', 6),
    ('work_order_progress', '待接单', '待接单', 1),
    ('work_order_progress', '已接单', '已接单', 2),
    ('work_order_progress', '已处置', '已处置', 3),
    ('notify_channel', '飞书', '飞书', 1),
    ('notify_channel', '短信', '短信', 2),
    ('notify_status', '待发送', '待发送', 1),
    ('notify_status', '发送成功', '发送成功', 2),
    ('notify_status', '发送失败', '发送失败', 3);

-- ----------------------------------------------------------------------------
-- 8. 园区（制造基地注册表，数据沿用现有 src/data/group.ts 的 13 基地）
--    注意：正式厂址经纬度待业主确认后替换；以下为规划/临时坐标。
-- ----------------------------------------------------------------------------
INSERT INTO park (park_code, park_name, short_name, city, country, longitude, latitude, status, scene_type, scene_asset, summary, products, positioning, pin_offset_x, pin_offset_y, order_num)
VALUES
    ('foshan', '正泰智能电气（华南）科创产业园', '佛山基地', '中国·广东佛山', '中国', 113.121400, 23.021500, 'building', 'image', NULL,
     '项目落地佛山南海丹灶，规划建设智慧能源与先进电力装备数字化智造基地及华南总部科创园。',
     '高压与特高压装备、新能源智能电力装备、智能集成配电系统',
     '华南总部 · 大湾区数字化智造与先进电力装备基地', -62, 30, 1),
    ('jiaxing', '正泰电气华东产业基地', '嘉兴基地', '中国·浙江嘉兴', '中国', 120.750000, 30.750000, 'connected', 'image', '/assets/factory-main.png',
     '聚焦新一代智能中压配电，融合专业研发制造产线、数字配电云平台与园区综合能源管理。',
     '无 SF₆ 气体绝缘开关设备、低压开关柜、中压断路器、NXM 中压开关柜、预制电力模块',
     '华东中低压集成配电全链基地 · 数字绿色工厂', 48, -24, 2),
    ('nanyang', '正泰南阳制造基地', '南阳基地', '中国·河南南阳', '中国', 112.528300, 32.990800, 'building', 'image', NULL,
     '围绕现代畜牧养殖场景，将供配电、自动控制与环境调节能力进行系统集成。',
     '畜牧场景智能配电、控制柜及集成电气系统',
     '畜牧智能集成电气专业基地 · 中部区域服务节点', -58, 24, 3),
    ('xianyang', '正泰咸阳制造基地', '咸阳基地', '中国·陕西咸阳', '中国', 108.700000, 34.330000, 'building', 'image', NULL,
     '园区集聚电缆、智能配电和母线产业能力，形成面向西北并辐射欧亚市场的协同体系。',
     '光伏/轨交/装备电缆、中低压开关柜、变压器与箱变、母线槽',
     '西北智能配电产业总部 · 西部供应链与 EPC 中心', -68, -18, 4),
    ('shenyang', '正泰沈阳制造基地', '沈阳基地', '中国·辽宁沈阳', '中国', 123.431500, 41.805700, 'building', 'image', NULL,
     '面向东北市场提供中低压成套配电设备的设计、制造和服务。',
     '中低压成套开关设备、箱式变电站、配电箱、电缆桥架',
     '东北集成终端配电柜/箱专业基地 · 本地化服务节点', 48, -36, 5),
    ('hefei', '正泰合肥制造基地', '合肥基地', '中国·安徽合肥', '中国', 117.227200, 31.820600, 'building', 'image', NULL,
     '聚焦中低压集成配电产品和成套解决方案。',
     '中低压成套开关设备、配电柜/箱、预装式变电站与系统集成产品',
     '中低压集成配电专业基地 · 华东与中部区域交付节点', 58, 30, 6),
    ('singapore', '正泰新加坡制造基地', '新加坡基地', '新加坡', '新加坡', 103.819800, 1.352100, 'building', 'image', NULL,
     '依托 SUNLIGHT 成套配电制造体系，为高可靠用电场景提供国际标准的配电与控制产品。',
     '低压开关柜、配电盘、控制盘、信息通信/储能场景集成配电柜',
     '亚太总部与创新协同节点 · 高可靠成套配电制造基地', 54, 30, 7),
    ('malaysia', '正泰马来西亚制造基地', '马来西亚基地', '马来西亚', '马来西亚', 101.686900, 3.139000, 'building', 'image', NULL,
     '作为 SUNLIGHT 东南亚制造网络的重要组成。',
     '低压开关柜、配电盘、控制盘及定制化成套配电系统',
     '东南亚本地化制造与区域交付节点', -72, 16, 8),
    ('cambodia', '正泰柬埔寨制造基地', '柬埔寨基地', '柬埔寨·菩萨省', '柬埔寨', 103.919200, 12.538800, 'building', 'image', NULL,
     '由 SchneiTec 与正泰共建，聚焦中压产品。',
     '中压开关柜、环网柜、中压配电变压器、电容器组',
     '柬埔寨中压产品本地化制造与全周期服务基地', 62, -28, 9),
    ('egypt', '正泰 EGEMAC 埃及制造基地', '埃及基地', '埃及·开罗', '埃及', 31.235700, 30.044400, 'building', 'image', NULL,
     '正泰与埃及 EGEMAC 共建的本地化工厂。',
     '中低压开关柜、环网柜、无功补偿柜及集成配电解决方案',
     '北非及西亚非洲区域本地化制造与项目交付基地', -64, -16, 10),
    ('saudi-arabia', '正泰沙特制造基地', '沙特基地', '沙特阿拉伯·利雅得/达曼', '沙特阿拉伯', 46.675300, 24.713600, 'building', 'image', NULL,
     '串联利雅得低压元件工厂与达曼中压开关设备工厂。',
     'ACB、MCCB、RMU 环网柜、AIS 空气绝缘开关设备',
     '沙特及海湾地区智能电气本地化制造节点', 62, 22, 11),
    ('vietnam', '正泰越南制造基地', '越南基地', '越南', '越南', 105.834200, 21.027800, 'building', 'image', NULL,
     '纳入 SUNLIGHT 区域制造体系。',
     '低压开关柜、配电盘、控制盘及定制化成套配电系统',
     '越南及中南半岛本地化成套配电制造与交付节点', -72, -34, 12),
    ('indonesia', '正泰印度尼西亚制造基地', '印尼基地', '印度尼西亚', '印度尼西亚', 106.845600, -6.208800, 'building', 'image', NULL,
     '官方全球制造布局将印度尼西亚列为下一阶段中低压制造节点。',
     '中低压开关设备与集成配电方案（规划方向）',
     '印度尼西亚本地化制造规划节点 · 东盟区域能力补充', 66, 42, 13);

-- ----------------------------------------------------------------------------
-- 9. 工单流程元数据（第一个流程：告警处置工单，供 Flowable 部署后登记）
-- ----------------------------------------------------------------------------
INSERT INTO workflow_model (model_name, model_key, category, description, version, status) VALUES
    ('告警处置工单流程', 'alarm-work-order', '安全监控', 'AI 告警 → 确认 → 派单 → 接单 → 处置 → 复核归档', 1, '0');
