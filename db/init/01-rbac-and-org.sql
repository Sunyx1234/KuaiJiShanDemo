-- ============================================================================
-- 正泰集团后台管理平台 · 数据库初始化脚本 01
-- 模块：组织管理 / 用户 / 角色 / 权限（RBAC + 数据权限）
-- 数据库：PostgreSQL 16+
-- 说明：本文件只建「业务/权限」表；Flowable 引擎的 ACT_* 表由引擎首次启动自动创建，无需手工建。
-- ============================================================================

-- 可选：统一使用 public schema（如需独立 schema 可自行调整 search_path）

-- ----------------------------------------------------------------------------
-- 组织树（部门）
-- ----------------------------------------------------------------------------
CREATE TABLE sys_dept (
    dept_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id   bigint       NOT NULL DEFAULT 0,              -- 父部门 id，0 表示根
    ancestors   varchar(512) NOT NULL DEFAULT '',             -- 祖先链，形如 0,100,200
    dept_name   varchar(64)  NOT NULL,
    park_id     bigint       NULL,                            -- 关联业务园区(见 02 的 park 表)，可空
    order_num   int          NOT NULL DEFAULT 0,
    leader      varchar(64)  NULL,
    phone       varchar(32)  NULL,
    email       varchar(128) NULL,
    status      char(1)      NOT NULL DEFAULT '1',            -- 1 正常 0 停用
    del_flag    char(1)      NOT NULL DEFAULT '0',            -- 0 存在 2 删除（逻辑删除）
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_dept IS '部门/组织树';
COMMENT ON COLUMN sys_dept.ancestors IS '祖先链，用于树形查询，如 0,100,200';
COMMENT ON COLUMN sys_dept.park_id IS '组织节点与业务园区(制造基地)的映射，可空';
COMMENT ON COLUMN sys_dept.del_flag IS '逻辑删除标记：0 存在，2 删除';

-- ----------------------------------------------------------------------------
-- 岗位
-- ----------------------------------------------------------------------------
CREATE TABLE sys_post (
    post_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_code  varchar(64) NOT NULL,                          -- 岗位编码
    post_name  varchar(64) NOT NULL,
    order_num  int         NOT NULL DEFAULT 0,
    status     char(1)     NOT NULL DEFAULT '1',
    remark     varchar(512) NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_post IS '岗位';

-- ----------------------------------------------------------------------------
-- 用户
-- ----------------------------------------------------------------------------
CREATE TABLE sys_user (
    user_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dept_id     bigint      NULL,                             -- 所属部门
    username    varchar(64) NOT NULL,                         -- 登录账号
    password    varchar(128) NOT NULL,                        -- BCrypt 哈希
    nickname    varchar(64) NOT NULL,
    avatar      varchar(512) NULL,
    email       varchar(128) NULL,
    phone       varchar(32)  NULL,
    sex         char(1)     NOT NULL DEFAULT '0',             -- 0 未知 1 男 2 女
    status      char(1)     NOT NULL DEFAULT '1',             -- 1 正常 0 停用
    del_flag    char(1)     NOT NULL DEFAULT '0',
    login_ip    varchar(64) NULL,
    login_date  timestamptz NULL,
    remark      varchar(512) NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_user IS '用户';
COMMENT ON COLUMN sys_user.password IS 'BCrypt 哈希，禁止明文';

-- ----------------------------------------------------------------------------
-- 角色
-- ----------------------------------------------------------------------------
CREATE TABLE sys_role (
    role_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name   varchar(64) NOT NULL,
    role_key    varchar(64) NOT NULL,                         -- 权限字符，如 admin / operator
    data_scope  char(1)     NOT NULL DEFAULT '5',             -- 数据范围：1 全部 2 自定义 3 本部门及以下 4 仅本部门 5 仅本人
    order_num   int         NOT NULL DEFAULT 0,
    status      char(1)     NOT NULL DEFAULT '1',
    del_flag    char(1)     NOT NULL DEFAULT '0',
    remark      varchar(512) NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_role IS '角色';
COMMENT ON COLUMN sys_role.data_scope IS '数据权限范围：1=全部 2=自定义部门 3=本部门及以下 4=仅本部门 5=仅本人';

-- ----------------------------------------------------------------------------
-- 菜单/权限
-- ----------------------------------------------------------------------------
CREATE TABLE sys_menu (
    menu_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id   bigint      NOT NULL DEFAULT 0,
    menu_name   varchar(64) NOT NULL,
    menu_type   char(1)     NOT NULL DEFAULT 'M',             -- M 目录 C 菜单 F 按钮
    path        varchar(200) NULL,                            -- 前端路由 path（目录/菜单）
    component   varchar(255) NULL,                            -- 前端组件路径（菜单）
    perms       varchar(128) NULL,                            -- 权限标识，如 system:user:add（按钮）
    icon        varchar(64)  NULL,
    order_num   int         NOT NULL DEFAULT 0,
    visible     char(1)     NOT NULL DEFAULT '1',             -- 1 显示 0 隐藏
    status      char(1)     NOT NULL DEFAULT '1',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_menu IS '菜单与权限';
COMMENT ON COLUMN sys_menu.menu_type IS 'M 目录，C 菜单，F 按钮';
COMMENT ON COLUMN sys_menu.perms IS '接口权限标识，与后端 @PreAuthorize 校验对应';

-- ----------------------------------------------------------------------------
-- 字典
-- ----------------------------------------------------------------------------
CREATE TABLE sys_dict_type (
    dict_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dict_name   varchar(64) NOT NULL,
    dict_type   varchar(64) NOT NULL,
    status      char(1)     NOT NULL DEFAULT '1',
    remark      varchar(512) NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_dict_type IS '字典类型';

CREATE TABLE sys_dict_data (
    dict_code   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dict_type   varchar(64) NOT NULL,
    dict_label  varchar(64) NOT NULL,
    dict_value  varchar(64) NOT NULL,
    order_num   int         NOT NULL DEFAULT 0,
    status      char(1)     NOT NULL DEFAULT '1',
    remark      varchar(512) NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_dict_data IS '字典数据';

-- ============================================================================
-- 关联表
-- ============================================================================

CREATE TABLE sys_user_role (
    user_id bigint NOT NULL,
    role_id bigint NOT NULL,
    PRIMARY KEY (user_id, role_id)
);
COMMENT ON TABLE sys_user_role IS '用户-角色关联';

CREATE TABLE sys_user_post (
    user_id bigint NOT NULL,
    post_id bigint NOT NULL,
    PRIMARY KEY (user_id, post_id)
);
COMMENT ON TABLE sys_user_post IS '用户-岗位关联';

CREATE TABLE sys_role_menu (
    role_id bigint NOT NULL,
    menu_id bigint NOT NULL,
    PRIMARY KEY (role_id, menu_id)
);
COMMENT ON TABLE sys_role_menu IS '角色-菜单/权限关联';

-- 自定义数据权限：角色可访问的部门
CREATE TABLE sys_role_dept (
    role_id bigint NOT NULL,
    dept_id bigint NOT NULL,
    PRIMARY KEY (role_id, dept_id)
);
COMMENT ON TABLE sys_role_dept IS '角色-部门数据权限（data_scope=2 自定义时生效）';

-- 园区维度数据权限：角色可访问的业务园区
CREATE TABLE sys_role_park (
    role_id bigint NOT NULL,
    park_id bigint NOT NULL,
    PRIMARY KEY (role_id, park_id)
);
COMMENT ON TABLE sys_role_park IS '角色-园区数据权限（业务数据按园区隔离）';

-- ============================================================================
-- 审计日志
-- ============================================================================

CREATE TABLE sys_login_log (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username    varchar(64) NOT NULL,
    ip          varchar(64) NULL,
    browser     varchar(128) NULL,
    os          varchar(128) NULL,
    status      char(1)     NOT NULL DEFAULT '1',             -- 1 成功 0 失败
    msg         varchar(512) NULL,
    login_time  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_login_log IS '登录日志';

CREATE TABLE sys_oper_log (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title         varchar(64)  NULL,                          -- 模块/操作标题
    business_type varchar(16)  NULL,                          -- 操作类型：INSERT/UPDATE/DELETE/GRANT/OTHER
    method        varchar(256) NULL,                          -- 请求方法
    request_url   varchar(256) NULL,
    oper_user     varchar(64)  NULL,
    oper_ip       varchar(64)  NULL,
    status        char(1)      NOT NULL DEFAULT '1',          -- 1 成功 0 失败
    error_msg     text         NULL,
    oper_time     timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE sys_oper_log IS '操作审计日志';

-- ============================================================================
-- 索引
-- ============================================================================
CREATE INDEX idx_sys_dept_parent ON sys_dept (parent_id);
CREATE INDEX idx_sys_dept_ancestors ON sys_dept (ancestors);
CREATE INDEX idx_sys_dept_park ON sys_dept (park_id) WHERE park_id IS NOT NULL;

CREATE UNIQUE INDEX uk_sys_user_username ON sys_user (username) WHERE del_flag = '0';
CREATE INDEX idx_sys_user_dept ON sys_user (dept_id);

CREATE UNIQUE INDEX uk_sys_role_key ON sys_role (role_key) WHERE del_flag = '0';

CREATE INDEX idx_sys_menu_parent ON sys_menu (parent_id);

CREATE UNIQUE INDEX uk_sys_dict_type ON sys_dict_type (dict_type);
CREATE INDEX idx_sys_dict_data_type ON sys_dict_data (dict_type);

CREATE INDEX idx_sys_login_log_time ON sys_login_log (login_time);
CREATE INDEX idx_sys_oper_log_time ON sys_oper_log (oper_time);
CREATE INDEX idx_sys_oper_log_user ON sys_oper_log (oper_user);

-- 外键（逻辑删除表不强制 FK，避免软删后 FK 冲突；此处仅对强一致关联建 FK 也不强制，保留索引即可）
-- 说明：本项目对 sys_* 采用逻辑删除，关联表不建外键约束，由应用层保证一致性。
