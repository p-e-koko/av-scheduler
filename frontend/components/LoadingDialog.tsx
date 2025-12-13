"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LoadingDialogProps {
  isOpen: boolean
  title?: string
  description?: string
}

export function LoadingDialog({
  isOpen,
  title = "Processing",
  description = "Please wait while we process your request..."
}: LoadingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border border-border sm:max-w-[425px] [&>button]:hidden">
        <DialogHeader className="flex flex-col items-center justify-center space-y-4 py-4">
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <DialogDescription className="text-muted-foreground text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
