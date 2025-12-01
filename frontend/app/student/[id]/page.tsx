"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute"
import { StudentProfileContent } from "@/components/StudentProfileContent"

function StudentProfile() {
  const params = useParams()
  const studentId = params.id as string

  return <StudentProfileContent studentId={studentId} />
}

export default function ProtectedStudentProfile() {
  return (
    <RoleProtectedRoute allowedRoles={['admin', 'coordinator', 'supervisor', 'student']}>
      <StudentProfile />
    </RoleProtectedRoute>
  )
}
