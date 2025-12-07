import ProtectedStudentProfile from "./StudentProfileClient"

export const dynamic = 'force-static'

export async function generateStaticParams() {
  return []
}

export default function Page() {
  return <ProtectedStudentProfile />
}
