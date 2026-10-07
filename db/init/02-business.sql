-- ============================================================================
-- 正泰集团后台管理平台 · 数据库初始化脚本 02
-- 模块：业务主数据（园区/设备/摄像头/告警/访客/工单） + 通知 + 审批流元数据
-- 数据库：PostgreSQL 16+
-- 依赖：先执行 01-rbac-and-org.sql（sys_user / sys_dept 等）
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 园区 / 制造基地（对应现有 group.ts 的 ParkConfig）
-- ----------------------------------------------------------------------------
CREATE TABLE park (
    park_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    park_code     varchar(64)  NOT NULL,                      -- 业务编码，如 jiaxing
    park_name     varchar(128) NOT NULL,                      -- 全称
    short_name    varchar(64)  NOT NULL,                      -- 简称，如 嘉兴基地
    city          varchar(64)  NULL,
    country       varchar(64)  NULL,
    longitude     numeric(10, 6) NULL,
    latitude      numeric(10, 6) NULL,
    status        varchar(16)  NOT NULL DEFAULT 'planned',    -- connected 已接入 / building 建设中 / planned 规划
    scene_type    varchar(16)  NOT NULL DEFAULT 'image',      -- image / gltf
    scene_asset   varchar(512) NULL,                          -- 场景素材路径（image 图 / gltf 模型）
    summary       text         NULL,                          -- 园区简介
    products      varchar(512) NULL,                          -- 主要产品
    positioning   varchar(256) NULL,                          -- 基地定位
    pin_offset_x  numeric(8, 2) NOT NULL DEFAULT 0,           -- 地球标签偏移
    pin_offset_y  numeric(8, 2) NOT NULL DEFAULT 0,
    order_num     int          NOT NULL DEFAULT 0,
    status_enabled char(1)     NOT NULL DEFAULT '1',          -- 1 启用 0 停用
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT chk_park_status CHECK (status IN ('connected', 'building', 'planned')),
    CONSTRAINT chk_park_scene CHECK (scene_type IN ('image', 'gltf'))
);
COMMENT ON TABLE park IS '园区/制造基地注册表';
COMMENT ON COLUMN park.park_code IS '业务编码，路由 /#/park/:parkId 使用';

-- ----------------------------------------------------------------------------
-- 设备（对应 sceneMarkers 的 device）
-- ----------------------------------------------------------------------------
CREATE TABLE device (
    device_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    park_id      bigint      NOT NULL,                        -- 所属园区
    name         varchar(128) NOT NULL,
    code         varchar(64)  NOT NULL,                       -- 设备编号
    area         varchar(64)  NULL,                           -- 所属区域
    type         varchar(64)  NULL,                           -- 设备类型
    rated        varchar(64)  NULL,                           -- 额定容量
    running      varchar(64)  NULL,                           -- 实时运行
    status       varchar(32)  NULL,                           -- 当前运行状态
    business_label varchar(64)  NULL,                         -- 业务字段名（今日发电量/今日产量等）
    business_value varchar(64)  NULL,                         -- 业务字段值
    hours        varchar(64)  NULL,                           -- 累计运行时长
    scene_x      numeric(8, 4) NULL,                          -- 大屏场景百分比坐标 x
    scene_y      numeric(8, 4) NULL,                          -- 大屏场景百分比坐标 y
    layer        varchar(16)  NULL,                           -- 图层：building/device/people/camera/risk/fire/environment
    tone         varchar(16)  NULL,                           -- 状态色：normal/info/attention/alarm/critical
    updated_at   timestamptz  NOT NULL DEFAULT now(),
    created_at   timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE device IS '设备主数据';
COMMENT ON COLUMN device.scene_x IS '大屏中央场景百分比坐标(0-100)，用于标签定位';

CREATE TABLE device_trend (
    trend_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id  bigint      NOT NULL,
    metric_at  timestamptz NOT NULL,                          -- 数据时间点
    value      numeric(14, 2) NOT NULL,                       -- 数值
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE device_trend IS '设备运行趋势（近24小时等）';
CREATE INDEX idx_device_trend_device ON device_trend (device_id, metric_at);

CREATE TABLE device_alarm (
    alarm_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id  bigint      NOT NULL,
    content    varchar(256) NOT NULL,
    status     varchar(16) NOT NULL DEFAULT '已关闭',         -- 已恢复/已关闭/处理中
    alarm_at   timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE device_alarm IS '设备告警记录';

-- ----------------------------------------------------------------------------
-- 摄像头（对应 securityCameras）
-- ----------------------------------------------------------------------------
CREATE TABLE camera (
    camera_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    park_id      bigint      NOT NULL,
    code         varchar(64) NOT NULL,                        -- 如 cam-e01
    name         varchar(128) NOT NULL,
    area_id      varchar(64) NULL,                            -- 区域编码
    area         varchar(64) NULL,
    scene_x      numeric(8, 4) NULL,
    scene_y      numeric(8, 4) NULL,
    status       varchar(16) NOT NULL DEFAULT 'online',       -- online/offline/abnormal/alarm
    algorithms   varchar(128) NULL,                           -- 启用的 AI 算法，逗号分隔（明火/烟雾/危险作业/安全帽/反光衣）
    video_url    varchar(512) NULL,
    poster_position varchar(32) NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_camera_status CHECK (status IN ('online', 'offline', 'abnormal', 'alarm'))
);
COMMENT ON TABLE camera IS '摄像头主数据';
COMMENT ON COLUMN camera.algorithms IS 'AI 算法列表，逗号分隔；如 明火,烟雾';

CREATE TABLE camera_area (
    area_id  varchar(64)  NOT NULL,
    park_id  bigint       NOT NULL,
    name     varchar(64)  NOT NULL,
    scene_x  numeric(8, 4) NULL,
    scene_y  numeric(8, 4) NULL,
    PRIMARY KEY (area_id, park_id)
);
COMMENT ON TABLE camera_area IS '摄像头聚合区域';

-- ----------------------------------------------------------------------------
-- AI 告警（对应 aiAlerts）
-- ----------------------------------------------------------------------------
CREATE TABLE ai_alert (
    alert_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    park_id          bigint       NOT NULL,
    order_no         varchar(64)  NOT NULL,                   -- 告警编号，如 AI-20260717-001
    camera_id        bigint       NULL,
    algorithm        varchar(32)  NOT NULL,                   -- 明火/烟雾/危险作业/安全帽/反光衣
    level            varchar(8)   NOT NULL,                   -- 一般/关注/严重
    content          varchar(256) NOT NULL,
    area             varchar(64)  NULL,
    snapshot_url     varchar(512) NULL,
    snapshot_position varchar(32) NULL,
    video_time       int          NOT NULL DEFAULT 0,         -- 视频时间点（秒）
    status           varchar(16)  NOT NULL DEFAULT '待确认',  -- 业务快照：待确认/待派单/处理中/待复核/已归档/已排除
    assignee         varchar(64)  NULL,                       -- 处理责任人
    alert_time       timestamptz  NOT NULL,                   -- 告警发生时间
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE ai_alert IS 'AI 识别告警';
COMMENT ON COLUMN ai_alert.status IS '业务状态快照（非权威）；权威状态以关联工单的流程实例为准';

-- ----------------------------------------------------------------------------
-- 访客 + 轨迹 + 异常
-- ----------------------------------------------------------------------------
CREATE TABLE visitor (
    visitor_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    park_id         bigint       NOT NULL,
    name            varchar(64)  NOT NULL,                    -- 完整姓名（受权限控制展示）
    masked_name     varchar(16)  NULL,                        -- 脱敏姓名，如 王*
    company         varchar(128) NULL,
    department      varchar(64)  NULL,
    host            varchar(64)  NULL,                        -- 被访人
    reason          varchar(256) NULL,                        -- 来访事由
    visitor_card    varchar(64)  NULL,                        -- 访客证编号
    uwb_tag         varchar(64)  NULL,                        -- UWB 标签编号
    allowed_areas   text         NULL,                        -- 允许访问区域（JSON 数组）
    escort_required boolean      NOT NULL DEFAULT false,
    area_id         varchar(64)  NULL,
    area            varchar(64)  NULL,
    floor           varchar(64)  NULL,
    scene_x         numeric(8, 4) NULL,
    scene_y         numeric(8, 4) NULL,
    status          varchar(16)  NOT NULL DEFAULT '正常',     -- 正常/即将超时/超时滞留/限制区告警/定位失联/已离厂
    visit_type      varchar(16)  NULL,                        -- 商务访问/施工检修/物流配送/项目交流/参观访问/其他
    actual_entry    timestamptz  NULL,                        -- 实际入厂（门禁记录）
    planned_leave   timestamptz  NULL,                        -- 计划离厂
    actual_leave    timestamptz  NULL,                        -- 实际离厂
    last_located    timestamptz  NULL,                        -- 最后定位时间
    access_status   varchar(64)  NULL,                        -- 门禁通行状态
    tag_status      varchar(64)  NULL,                        -- 定位标签状态
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE visitor IS '访客主数据';
COMMENT ON COLUMN visitor.name IS '完整姓名，仅在有权限详情页展示；大屏使用 masked_name';

CREATE TABLE visitor_track (
    track_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    visitor_id bigint      NOT NULL,
    node_key   varchar(64) NULL,                              -- 业务节点 id（对应现有 trackNodeId）
    scene_x    numeric(8, 4) NOT NULL,
    scene_y    numeric(8, 4) NOT NULL,
    area       varchar(64) NULL,
    floor      varchar(64) NULL,
    event      varchar(16) NOT NULL,                          -- 入厂/普通移动/区域进入/长时间停留/越界/定位中断/恢复定位/当前位置/离厂
    stay       varchar(32) NULL,                              -- 停留时长描述
    connected  boolean     NOT NULL DEFAULT true,             -- 定位是否连续（false 表示中断区间）
    located_at timestamptz NOT NULL,                          -- 定位时间
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE visitor_track IS '访客移动轨迹节点';
COMMENT ON COLUMN visitor_track.connected IS 'false 表示定位中断，前端用虚线表达，不连接前后坐标';
CREATE INDEX idx_visitor_track_visitor ON visitor_track (visitor_id, located_at);

CREATE TABLE visitor_exception (
    exception_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    visitor_id   bigint      NOT NULL,
    park_id      bigint      NOT NULL,
    type         varchar(32) NOT NULL,                        -- 超时滞留/进入未授权区域/偏离活动区域/定位标签失联/长时间静止
    level        varchar(8)  NOT NULL,                        -- 一般/关注/严重
    area         varchar(64) NULL,
    content      varchar(256) NULL,
    status       varchar(16) NOT NULL DEFAULT '待确认',       -- 待确认/处理中/已处理
    track_id     bigint      NULL,                            -- 关联轨迹节点
    occurred_at  timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE visitor_exception IS '访客异常事件';

-- ----------------------------------------------------------------------------
-- 工单（与 Flowable 流程实例关联）
-- ----------------------------------------------------------------------------
CREATE TABLE work_order (
    order_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_no          varchar(64)  NOT NULL,                  -- 工单编号
    alert_id          bigint       NULL,                      -- 来源 AI 告警
    park_id           bigint       NOT NULL,
    camera_id         bigint       NULL,
    algorithm         varchar(32)  NULL,
    level             varchar(8)   NULL,
    content           varchar(256) NULL,
    area              varchar(64)  NULL,
    snapshot_url      varchar(512) NULL,
    -- 流程引擎关联
    proc_def_id       varchar(128) NULL,                      -- Flowable 流程定义 id
    proc_def_key      varchar(128) NULL,                      -- 流程定义 key
    proc_inst_id      varchar(128) NULL,                      -- Flowable 流程实例 id
    -- 业务快照（非权威，权威以流程实例为准）
    status            varchar(16)  NOT NULL DEFAULT '处理中', -- 处理中/待复核/已归档/已排除
    progress          varchar(16)  NOT NULL DEFAULT '待接单', -- 待接单/已接单/已处置
    department        varchar(64)  NULL,
    assignee          varchar(64)  NULL,
    requirement       varchar(200) NULL,                      -- 处置要求
    deadline_minutes  int          NOT NULL DEFAULT 30,       -- 处置时限（分钟）
    deadline_at       timestamptz  NULL,                      -- 完成时限
    accepted_at       timestamptz  NULL,                      -- 接单时间
    submitted_at      timestamptz  NULL,                      -- 提交处置时间
    cause             text         NULL,                      -- 原因说明
    measures          text         NULL,                      -- 处置措施
    review_comment    varchar(512) NULL,                      -- 复核意见
    archived_no       varchar(64)  NULL,                      -- 归档编号
    mobile_token      varchar(128) NULL,                      -- 移动端一次性/限时凭证
    mobile_token_exp  timestamptz  NULL,                      -- 凭证过期时间
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_order IS '告警处置工单';
COMMENT ON COLUMN work_order.status IS '业务状态快照；权威状态由 proc_inst_id 对应流程实例的当前任务决定';
COMMENT ON COLUMN work_order.mobile_token IS '移动端免登录凭证，绑定流程任务，一次性消费 + 限时';

CREATE TABLE work_order_photo (
    photo_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id   bigint      NOT NULL,
    photo_key  varchar(128) NOT NULL,                         -- OSS/MinIO 对象 key
    photo_name varchar(128) NULL,
    photo_url  varchar(512) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_order_photo IS '工单现场处置照片';

CREATE TABLE work_order_notification (
    notification_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id        bigint      NOT NULL,
    channel         varchar(8)  NOT NULL,                     -- 飞书/短信
    status          varchar(16) NOT NULL DEFAULT '待发送',    -- 待发送/发送成功/发送失败
    detail          varchar(256) NULL,
    sent_at         timestamptz NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_order_notification IS '工单通知记录（飞书/短信）';

CREATE TABLE work_order_timeline (
    timeline_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id    bigint      NOT NULL,
    title       varchar(64) NOT NULL,
    detail      varchar(256) NULL,
    actor       varchar(64) NULL,
    occurred_at timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_order_timeline IS '工单时间线（业务侧快照，与 Flowable 历史并存）';

-- ----------------------------------------------------------------------------
-- 通用通知日志（飞书/短信统一记录，支持重试）
-- ----------------------------------------------------------------------------
CREATE TABLE notify_log (
    notify_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    biz_type   varchar(32) NOT NULL,                          -- 业务类型，如 work_order
    biz_id     varchar(64) NOT NULL,                          -- 业务主键，如 order_id
    channel    varchar(8)  NOT NULL,                          -- 飞书/短信
    receiver   varchar(128) NULL,
    title      varchar(128) NULL,
    status     varchar(16) NOT NULL DEFAULT '待发送',         -- 待发送/发送成功/发送失败
    error_msg  varchar(512) NULL,
    retry_count int        NOT NULL DEFAULT 0,
    sent_at    timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE notify_log IS '通用通知发送日志';
CREATE INDEX idx_notify_log_biz ON notify_log (biz_type, biz_id);

-- ----------------------------------------------------------------------------
-- 审批流元数据（Flowable 之外的业务侧元数据）
-- ----------------------------------------------------------------------------
CREATE TABLE workflow_model (
    model_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_name   varchar(128) NOT NULL,                       -- 流程名称
    model_key    varchar(64)  NOT NULL,                       -- 流程 key（唯一）
    category     varchar(64)  NULL,                           -- 分类
    description  varchar(512) NULL,
    bpmn_xml     text         NULL,                           -- BPMN 2.0 XML（最新版）
    deploy_id    varchar(128) NULL,                           -- Flowable 部署 id
    version      int          NOT NULL DEFAULT 1,
    status       char(1)      NOT NULL DEFAULT '0',           -- 0 草稿 1 已发布 2 停用
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE workflow_model IS '流程模型（业务侧登记，BPMN XML 交由 Flowable 部署）';

-- 低代码表单定义（JSON Schema，供自研表单设计器使用）
CREATE TABLE workflow_form_definition (
    form_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    form_key   varchar(64)  NOT NULL,
    form_name  varchar(128) NOT NULL,
    schema_json jsonb        NOT NULL,                        -- 表单字段定义（JSON Schema）
    version    int          NOT NULL DEFAULT 1,
    status     char(1)      NOT NULL DEFAULT '1',
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE workflow_form_definition IS '低代码表单定义';

-- 表单实例数据（JSONB，审批提交的业务数据）
CREATE TABLE workflow_form_data (
    data_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    form_id      bigint      NOT NULL,
    proc_inst_id varchar(128) NOT NULL,                       -- 关联流程实例
    biz_id       varchar(64) NULL,                            -- 关联业务主键
    form_data    jsonb       NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE workflow_form_data IS '表单实例数据';
CREATE INDEX idx_form_data_proc ON workflow_form_data (proc_inst_id);

-- ============================================================================
-- 索引
-- ============================================================================
CREATE UNIQUE INDEX uk_park_code ON park (park_code);

CREATE INDEX idx_device_park ON device (park_id);
CREATE UNIQUE INDEX uk_device_code ON device (code);

CREATE INDEX idx_camera_park ON camera (park_id);
CREATE UNIQUE INDEX uk_camera_code ON camera (code);

CREATE UNIQUE INDEX uk_ai_alert_order_no ON ai_alert (order_no);
CREATE INDEX idx_ai_alert_park_status ON ai_alert (park_id, status);

CREATE INDEX idx_visitor_park ON visitor (park_id);
CREATE INDEX idx_visitor_status ON visitor (status);
CREATE INDEX idx_visitor_exception_visitor ON visitor_exception (visitor_id);
CREATE INDEX idx_visitor_exception_status ON visitor_exception (status);

CREATE UNIQUE INDEX uk_work_order_no ON work_order (order_no);
CREATE INDEX idx_work_order_alert ON work_order (alert_id);
CREATE INDEX idx_work_order_proc_inst ON work_order (proc_inst_id);
CREATE INDEX idx_work_order_park ON work_order (park_id);

CREATE INDEX idx_work_order_photo_order ON work_order_photo (order_id);
CREATE INDEX idx_work_order_notif_order ON work_order_notification (order_id);
CREATE INDEX idx_work_order_timeline_order ON work_order_timeline (order_id, occurred_at);

CREATE UNIQUE INDEX uk_workflow_model_key ON workflow_model (model_key);
CREATE UNIQUE INDEX uk_form_def_key ON workflow_form_definition (form_key);

-- ============================================================================
-- 外键约束（业务主数据强一致，建 FK；逻辑删除的 sys_* 不建 FK）
-- ============================================================================
ALTER TABLE device ADD CONSTRAINT fk_device_park FOREIGN KEY (park_id) REFERENCES park (park_id);
ALTER TABLE camera ADD CONSTRAINT fk_camera_park FOREIGN KEY (park_id) REFERENCES park (park_id);
ALTER TABLE ai_alert ADD CONSTRAINT fk_ai_alert_park FOREIGN KEY (park_id) REFERENCES park (park_id);
ALTER TABLE ai_alert ADD CONSTRAINT fk_ai_alert_camera FOREIGN KEY (camera_id) REFERENCES camera (camera_id);

ALTER TABLE visitor ADD CONSTRAINT fk_visitor_park FOREIGN KEY (park_id) REFERENCES park (park_id);
ALTER TABLE visitor_track ADD CONSTRAINT fk_visitor_track_visitor FOREIGN KEY (visitor_id) REFERENCES visitor (visitor_id);
ALTER TABLE visitor_exception ADD CONSTRAINT fk_visitor_exception_visitor FOREIGN KEY (visitor_id) REFERENCES visitor (visitor_id);
ALTER TABLE visitor_exception ADD CONSTRAINT fk_visitor_exception_park FOREIGN KEY (park_id) REFERENCES park (park_id);

ALTER TABLE work_order ADD CONSTRAINT fk_work_order_park FOREIGN KEY (park_id) REFERENCES park (park_id);
ALTER TABLE work_order ADD CONSTRAINT fk_work_order_alert FOREIGN KEY (alert_id) REFERENCES ai_alert (alert_id);
ALTER TABLE work_order_photo ADD CONSTRAINT fk_work_order_photo_order FOREIGN KEY (order_id) REFERENCES work_order (order_id);
ALTER TABLE work_order_notification ADD CONSTRAINT fk_work_order_notif_order FOREIGN KEY (order_id) REFERENCES work_order (order_id);
ALTER TABLE work_order_timeline ADD CONSTRAINT fk_work_order_timeline_order FOREIGN KEY (order_id) REFERENCES work_order (order_id);

-- 注意：device_trend / device_alarm 的 FK 若在逻辑删除场景需谨慎，此处保留弱关联（仅索引）。
