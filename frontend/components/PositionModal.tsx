"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { positionAPI, type Position } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface PositionModalProps {
  isOpen: boolean
  onClose: () => void
  onPositionSaved: () => void
  positionToEdit?: Position | null
}

export function PositionModal({ 
  isOpen, 
  onClose, 
  onPositionSaved, 
  positionToEdit 
}: PositionModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (positionToEdit) {
      setName(positionToEdit.name)
      setDescription(positionToEdit.description || "")
      setIsActive(positionToEdit.is_active)
    } else {
      setName("")
      setDescription("")
      setIsActive(true)
    }
    setError(null)
  }, [positionToEdit, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const positionData = {
        name,
        description,
        is_active: isActive
      }

      if (positionToEdit) {
        await positionAPI.updatePosition(positionToEdit.id, positionData)
      } else {
        await positionAPI.createPosition(positionData)
      }

      onPositionSaved()
      onClose()
    } catch (err: any) {
      console.error("Failed to save position:", err)
      setError(err.message || "Failed to save position. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{positionToEdit ? "Edit Position" : "Create Position"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Position Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Library Assistant"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the responsibilities..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {positionToEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
