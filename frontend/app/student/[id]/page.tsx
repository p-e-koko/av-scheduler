import ProtectedStudentProfile from "./StudentProfileClient"

// Required for static export with dynamic routes
export function generateStaticParams() {
  return []
}

export default function Page() {
  return <ProtectedStudentProfile />
}
