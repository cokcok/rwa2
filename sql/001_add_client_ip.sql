-- =====================================================
-- Migration: เพิ่มคอลัมน์ CLIENT_IP ในตาราง ATTENDANCE_LOG
-- วัตถุประสงค์: เก็บ IP address ของเครื่องผู้ใช้ขณะบันทึกการเข้างาน
-- =====================================================

-- เพิ่มคอลัมน์ CLIENT_IP
ALTER TABLE ATTENDANCE_LOG ADD (
    CLIENT_IP VARCHAR2(45)
);

-- เพิ่ม comment
COMMENT ON COLUMN ATTENDANCE_LOG.CLIENT_IP IS 'IP address ของเครื่องผู้ใช้ขณะลงเวลา';

COMMIT;

-- หมายเหตุ:
-- - VARCHAR2(45) รองรับทั้ง IPv4 (max 15 chars) และ IPv6 (max 45 chars)
-- - คอลัมน์นี้ nullable เพื่อไม่กระทบข้อมูลเดิม
