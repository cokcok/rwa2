import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'

// CHECKTYPE mapping
const CHECKTYPE_LABELS: Record<string, string> = {
  '0': 'ปฏิบัติงาน',
  '1': 'ช่วยปฏิบัติงาน',
  '3': 'Work From Home',
}

export interface ReportRecord {
  LOGTIME: Date
  NODEID: number
  CHECKTYPE: string
  DEPT_ID: string
  KM: string
}

export interface ReportData {
  empCode: string
  fullName: string
  deptId: string
  startDate: string
  endDate: string
  records: ReportRecord[]
}

// แปลง Date เป็น string รูปแบบไทย
function formatDateTH(date: Date): string {
  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// สรุปจำนวนวันเข้างาน
function summarizeRecords(records: ReportRecord[]) {
  const dayMap = new Map<string, { inTime?: Date; outTime?: Date }>()

  for (const r of records) {
    const dateKey = new Date(r.LOGTIME).toDateString()
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {})
    }
    const day = dayMap.get(dateKey)!
    if (r.NODEID === 1) {
      day.inTime = new Date(r.LOGTIME)
    } else {
      day.outTime = new Date(r.LOGTIME)
    }
  }

  let normalDays = 0
  let lateDays = 0

  for (const [, day] of dayMap) {
    if (day.inTime) {
      const hour = day.inTime.getHours()
      const minute = day.inTime.getMinutes()
      if (hour > 8 || (hour === 8 && minute > 30)) {
        lateDays++
      } else {
        normalDays++
      }
    }
  }

  return {
    totalDays: dayMap.size,
    normalDays,
    lateDays,
  }
}

export async function generatePdfBuffer(data: ReportData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  // โหลดฟอนต์ไทย Noto Sans Thai
  const fontDir = path.join(process.cwd(), 'public', 'fonts')
  const regularFontBytes = fs.readFileSync(path.join(fontDir, 'NotoSansThai-Regular.ttf'))
  const boldFontBytes = fs.readFileSync(path.join(fontDir, 'NotoSansThai-Bold.ttf'))

  const regularFont = await pdfDoc.embedFont(regularFontBytes, { subset: true })
  const boldFont = await pdfDoc.embedFont(boldFontBytes, { subset: true })

  // สร้างหน้า A4 แนวนอน
  const page = pdfDoc.addPage([841.89, 595.28]) // A4 landscape
  const { width, height } = page.getSize()

  let y = height - 35
  const leftMargin = 50

  // หัวเรื่อง + ข้อมูลผู้ใช้ บนบรรทัดเดียวกัน
  page.drawText('รายงานสรุปการเข้างาน', {
    x: leftMargin,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.118, 0.227, 0.373),
  })
  page.drawText(`${data.fullName} | ${data.empCode} | ${data.deptId} | ${data.startDate} - ${data.endDate}`, {
    x: 350,
    y,
    size: 10,
    font: regularFont,
    color: rgb(0.42, 0.45, 0.5),
  })
  y -= 25

  // Table header
  const tableHeaders = ['วันที่', 'เวลา', 'สถานะ', 'ประเภท', 'ระยะทาง (กม.)']
  const colWidths = [120, 100, 70, 130, 100]
  const rowHeight = 22

  // Header background
  page.drawRectangle({
    x: leftMargin,
    y: y - 5,
    width: colWidths.reduce((a, b) => a + b, 0),
    height: rowHeight,
    color: rgb(0.146, 0.388, 0.922), // #2563EB
  })

  // Header text
  let x = leftMargin + 8
  for (let i = 0; i < tableHeaders.length; i++) {
    page.drawText(tableHeaders[i], {
      x,
      y: y + 3,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    })
    x += colWidths[i]
  }
  y -= rowHeight

  // Data rows
  for (let i = 0; i < data.records.length; i++) {
    const record = data.records[i]
    const logtime = new Date(record.LOGTIME)

    // Row background (zebra striping)
    if (i % 2 === 0) {
      page.drawRectangle({
        x: leftMargin,
        y: y - 5,
        width: colWidths.reduce((a, b) => a + b, 0),
        height: rowHeight,
        color: rgb(0.953, 0.957, 0.965), // #F3F4F6
      })
    }

    const rowData = [
      formatDateTH(logtime),
      formatTime(logtime),
      record.NODEID === 1 ? 'เข้า' : 'ออก',
      CHECKTYPE_LABELS[record.CHECKTYPE] || record.CHECKTYPE,
      record.KM || '0',
    ]

    x = leftMargin + 8
    for (let j = 0; j < rowData.length; j++) {
      page.drawText(rowData[j], {
        x,
        y: y + 3,
        size: 10,
        font: regularFont,
        color: rgb(0.067, 0.067, 0.067),
      })
      x += colWidths[j]
    }
    y -= rowHeight

    // ถ้าหน้าเต็ม ให้สร้างหน้าใหม่
    if (y < 80 && i < data.records.length - 1) {
      y = height - 35
      const newPage = pdfDoc.addPage([841.89, 595.28])

      // Header บนหน้าใหม่
      newPage.drawRectangle({
        x: leftMargin,
        y: y - 5,
        width: colWidths.reduce((a, b) => a + b, 0),
        height: rowHeight,
        color: rgb(0.146, 0.388, 0.922),
      })

      x = leftMargin + 8
      for (let k = 0; k < tableHeaders.length; k++) {
        newPage.drawText(tableHeaders[k], {
          x,
          y: y + 3,
          size: 10,
          font: boldFont,
          color: rgb(1, 1, 1),
        })
        x += colWidths[k]
      }
      y -= rowHeight
    }
  }

  // Summary
  y -= 20
  const summary = summarizeRecords(data.records)
  page.drawText(
    `สรุป: วันทำงาน ${summary.totalDays} วัน | มาปกติ ${summary.normalDays} วัน | สาย ${summary.lateDays} วัน`,
    {
      x: leftMargin,
      y,
      size: 11,
      font: boldFont,
      color: rgb(0.118, 0.227, 0.373),
    }
  )

  // Footer
  y -= 30
  page.drawText(`พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}`, {
    x: width - 250,
    y,
    size: 8,
    font: regularFont,
    color: rgb(0.608, 0.635, 0.686),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
