-- =====================================================
-- DDL สำหรับสร้างตาราง ATTENDANCE_LOG บน Oracle DB
-- ระบบลงเวลาทำงานผ่านเว็บ
-- =====================================================

-- ลบตาราง (ถ้ามี) - ใช้เฉพาะตอน development
-- DROP TABLE ATTENDANCE_LOG CASCADE CONSTRAINTS;

-- สร้างตาราง ATTENDANCE_LOG
CREATE TABLE ATTENDANCE_LOG (
    LOG_ID          NUMBER GENERATED ALWAYS AS IDENTITY
                    CONSTRAINT PK_ATTENDANCE_LOG PRIMARY KEY,
    EMP_ID          VARCHAR2(20)    NOT NULL,
    NATIONAL_ID     VARCHAR2(13)    NOT NULL,
    FULL_NAME       VARCHAR2(200)   NOT NULL,
    CHECKIN_TYPE    VARCHAR2(10)    NOT NULL
                    CONSTRAINT CHK_CHECKIN_TYPE CHECK (CHECKIN_TYPE IN ('OFFICE', 'SUPPORT')),
    HOME_ORG_CODE   VARCHAR2(20)    NOT NULL,
    CHECKIN_ORG_CODE VARCHAR2(20)   NOT NULL,
    CHECKIN_ORG_NAME VARCHAR2(200),
    ACTION_TYPE     VARCHAR2(3)     NOT NULL
                    CONSTRAINT CHK_ACTION_TYPE CHECK (ACTION_TYPE IN ('IN', 'OUT')),
    ACTION_TIME     TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP AT TIME ZONE 'Asia/Bangkok' NOT NULL,
    USER_LAT        NUMBER(10,7)    NOT NULL,
    USER_LNG        NUMBER(10,7)    NOT NULL,
    OFFICE_LAT      NUMBER(10,7)    NOT NULL,
    OFFICE_LNG      NUMBER(10,7)    NOT NULL,
    DISTANCE_METER  NUMBER(10,2)    NOT NULL,
    IS_WITHIN_RANGE CHAR(1)         NOT NULL
                    CONSTRAINT CHK_IS_WITHIN_RANGE CHECK (IS_WITHIN_RANGE IN ('Y', 'N')),
    DEVICE_INFO     VARCHAR2(500),
    CREATED_AT      TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP AT TIME ZONE 'Asia/Bangkok' NOT NULL
);

-- สร้าง Index สำหรับ query ที่ใช้บ่อย
-- Index สำหรับค้นหาประวัติลงเวลาตามพนักงานและวันที่
CREATE INDEX IDX_ATTENDANCE_EMP_DATE
    ON ATTENDANCE_LOG (EMP_ID, ACTION_TIME);

-- Index สำหรับค้นหาตามเลขบัตรประชาชน (audit)
CREATE INDEX IDX_ATTENDANCE_NATIONAL_ID
    ON ATTENDANCE_LOG (NATIONAL_ID);

-- Index สำหรับค้นหาตามสังกัด
CREATE INDEX IDX_ATTENDANCE_ORG_CODE
    ON ATTENDANCE_LOG (CHECKIN_ORG_CODE);

-- เพิ่ม comment บนตารางและคอลัมน์
COMMENT ON TABLE ATTENDANCE_LOG IS 'บันทึกการลงเวลาทำงานผ่านเว็บ';
COMMENT ON COLUMN ATTENDANCE_LOG.LOG_ID IS 'รหัสลำดับ (Auto Increment)';
COMMENT ON COLUMN ATTENDANCE_LOG.EMP_ID IS 'รหัสพนักงาน (จาก HR)';
COMMENT ON COLUMN ATTENDANCE_LOG.NATIONAL_ID IS 'เลขบัตรประชาชน 13 หลัก';
COMMENT ON COLUMN ATTENDANCE_LOG.FULL_NAME IS 'ชื่อ-นามสกุล';
COMMENT ON COLUMN ATTENDANCE_LOG.CHECKIN_TYPE IS 'ประเภทการลงเวลา: OFFICE=จากสำนักงาน, SUPPORT=ช่วยปฏิบัติงาน';
COMMENT ON COLUMN ATTENDANCE_LOG.HOME_ORG_CODE IS 'รหัสสังกัดจริงของพนักงาน';
COMMENT ON COLUMN ATTENDANCE_LOG.CHECKIN_ORG_CODE IS 'รหัสสังกัดที่ลงเวลา (กรณีช่วยปฏิบัติงาน)';
COMMENT ON COLUMN ATTENDANCE_LOG.CHECKIN_ORG_NAME IS 'ชื่อสังกัดที่ลงเวลา';
COMMENT ON COLUMN ATTENDANCE_LOG.ACTION_TYPE IS 'ประเภทรายการ: IN=เข้างาน, OUT=ออกงาน';
COMMENT ON COLUMN ATTENDANCE_LOG.ACTION_TIME IS 'เวลาที่ลงเวลา (timezone Asia/Bangkok)';
COMMENT ON COLUMN ATTENDANCE_LOG.USER_LAT IS 'ละติจูดของผู้ใช้ขณะลงเวลา';
COMMENT ON COLUMN ATTENDANCE_LOG.USER_LNG IS 'ลองจิจูดของผู้ใช้ขณะลงเวลา';
COMMENT ON COLUMN ATTENDANCE_LOG.OFFICE_LAT IS 'ละติจูดของสำนักงานที่ตรวจสอบ';
COMMENT ON COLUMN ATTENDANCE_LOG.OFFICE_LNG IS 'ลองจิจูดของสำนักงานที่ตรวจสอบ';
COMMENT ON COLUMN ATTENDANCE_LOG.DISTANCE_METER IS 'ระยะทางระหว่างผู้ใช้กับสำนักงาน (เมตร)';
COMMENT ON COLUMN ATTENDANCE_LOG.IS_WITHIN_RANGE IS 'อยู่ในรัศมีที่กำหนดหรือไม่: Y=ใช่, N=ไม่ใช่';
COMMENT ON COLUMN ATTENDANCE_LOG.DEVICE_INFO IS 'ข้อมูล Browser/Device สำหรับ audit trail';
COMMENT ON COLUMN ATTENDANCE_LOG.CREATED_AT IS 'วันเวลาที่สร้าง record';

COMMIT;
