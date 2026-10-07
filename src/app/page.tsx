import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// หน้าแรก redirect ไปหน้า login เสมอ
export default function Home() {
  redirect('/login')
}
