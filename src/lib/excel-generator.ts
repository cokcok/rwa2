import ExcelJS from 'exceljs'
import type { ReportData } from './pdf-generator'

// CHECKTYPE mapping
const CHECKTYPE_LABELS: Record<string, string> = {
  '0': 'ปฏิบัติงาน',
  '1': 'ช่วยปฏิบัติงาน',
  '3': 'Work From Home',
}

export async function generateExcelBuffer(data: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ระบบลงเวลาทำงาน RAOT'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('รายงานเข้างาน', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // ตั้งค่าคอลัมน์
  worksheet.columns = [
    { header: 'วันที่', key: 'date', width: 15 },
    { header: 'เวลา', key: 'time', width: 12 },
    { header: 'สถานะ', key: 'status', width: 10 },
    { header: 'ประเภทการเข้างาน', key: 'checktype', width: 20 },
    { header: 'ระยะทาง (กม.)', key: 'km', width: 15 },
    { header: 'แผนก', key: 'dept', width: 20 },
  ]

  // จัดรูปแบบ header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 25

  // เพิ่ม border ที่ header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1D4ED8' } },
      left: { style: 'thin', color: { argb: 'FF1D4ED8' } },
      bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } },
      right: { style: 'thin', color: { argb: 'FF1D4ED8' } },
    }
  })

  // เพิ่มข้อมูล
  for (const record of data.records) {
    const logtime = new Date(record.LOGTIME)
    const row = worksheet.addRow({
      date: logtime.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: logtime.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      status: record.NODEID === 1 ? 'เข้า' : 'ออก',
      checktype: CHECKTYPE_LABELS[record.CHECKTYPE] || record.CHECKTYPE,
      km: record.KM || '0',
      dept: data.deptId,
    })

    // จัดรูปแบบ data rows
    row.alignment = { vertical: 'middle', horizontal: 'center' }
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    })

    // สลับสีแถว
    if (row.number % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      }
    }
  }

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `F${worksheet.rowCount}`,
  }

  // เพิ่ม worksheet protection (optional)
  worksheet.protect('raot-attendance', {
    selectLockedCells: true,
    selectUnlockedCells: true,
  })

  // Export เป็น buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
