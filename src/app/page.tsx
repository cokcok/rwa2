import { redirect } from 'next/navigation'

// หน้าแรก redirect ไปหน้า login เสมอ
export default function Home() {
  redirect('/login')
}
