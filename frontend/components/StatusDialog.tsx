"use client"

import * as React from "react"
import { CheckCircle, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface StatusDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type?: "success" | "error"
}

export function StatusDialog({
  isOpen,
  onClose,
  title,
  description,
  type = "success"
}: StatusDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border border-border sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center text-center space-y-4">
          {type === "success" ? (
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          )}
          <div className="space-y-2">
            <DialogTitle className="text-xl text-foreground">{title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="min-w-[100px]">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
