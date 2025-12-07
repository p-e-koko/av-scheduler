import ProtectedStudentProfile from "./StudentProfileClient"

export async function generateStaticParams() {
  return [{ id: '1' }]
}

export default function Page() {
  return <ProtectedStudentProfile />
}
