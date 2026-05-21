-- =============================================================================
-- DDL สำหรับสร้างตาราง ATTENDANCE_LOG บน Oracle Database
-- ระบบลงเวลาทำงานผ่านเว็บ
-- =============================================================================

-- สร้างตาราง ATTENDANCE_LOG
CREATE TABLE ATTENDANCE_LOG (
    LOG_ID            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    EMP_ID            VARCHAR2(20)       NOT NULL,
    NATIONAL_ID       VARCHAR2(13)       NOT NULL,  -- ห้าม log ออก console ทุกกรณี
    FULL_NAME         NVARCHAR2(200)     NOT NULL,
    CHECKIN_TYPE      VARCHAR2(10)       NOT NULL
                          CONSTRAINT chk_checkin_type CHECK (CHECKIN_TYPE IN ('OFFICE','SUPPORT')),
    HOME_ORG_CODE     VARCHAR2(20)       NOT NULL,  -- สังกัดจริงของพนักงาน
    CHECKIN_ORG_CODE  VARCHAR2(20)       NOT NULL,  -- สังกัดที่ลงเวลา
    CHECKIN_ORG_NAME  NVARCHAR2(200),
    ACTION_TYPE       VARCHAR2(3)        NOT NULL
                          CONSTRAINT chk_action_type CHECK (ACTION_TYPE IN ('IN','OUT')),
    ACTION_TIME       TIMESTAMP WITH TIME ZONE NOT NULL,  -- ระบุ TZ ชัดเจน
    USER_LAT          NUMBER(10,7)       NOT NULL,
    USER_LNG          NUMBER(10,7)       NOT NULL,
    OFFICE_LAT        NUMBER(10,7)       NOT NULL,
    OFFICE_LNG        NUMBER(10,7)       NOT NULL,
    DISTANCE_METER    NUMBER(10,2)       NOT NULL,
    IS_WITHIN_RANGE   CHAR(1)            NOT NULL
                          CONSTRAINT chk_within_range CHECK (IS_WITHIN_RANGE IN ('Y','N')),
    DEVICE_INFO       VARCHAR2(500),
    CLIENT_IP         VARCHAR2(45),
    CREATED_AT        TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL
);

-- Index สำหรับ query รายงานประจำวัน
CREATE INDEX IDX_ATT_EMP_DATE
    ON ATTENDANCE_LOG (EMP_ID, TRUNC(CAST(ACTION_TIME AS DATE)));

-- Index สำหรับค้นหาตาม National ID (audit trail)
CREATE INDEX IDX_ATT_NATIONAL_DATE
    ON ATTENDANCE_LOG (NATIONAL_ID, TRUNC(CAST(ACTION_TIME AS DATE)));

-- =============================================================================
-- หมายเหตุ:
-- - Timezone: บันทึกทุก timestamp เป็น Asia/Bangkok (UTC+7) เสมอ
-- - NATIONAL_ID: ห้าม log ออก console, error message, หรือ log file ทุกกรณี
-- - ใช้ parameterized query (:param) กับ Oracle ทุกครั้ง
-- =============================================================================
