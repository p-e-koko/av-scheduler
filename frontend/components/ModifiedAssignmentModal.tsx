
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Assignment } from "@/lib/api"
import { Calendar, MapPin, Clock } from "lucide-react"

interface ModifiedAssignmentModalProps {
    isOpen: boolean
    assignments: Assignment[]
    onAcknowledge: (assignmentId: number) => void
    onClose: () => void
}

export function ModifiedAssignmentModal({
    isOpen,
    assignments,
    onAcknowledge,
    onClose
}: ModifiedAssignmentModalProps) {
    if (!assignments.length) return null

    const handleAcknowledgeAll = () => {
        assignments.forEach(a => onAcknowledge(a.id))
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assignments Modified</DialogTitle>
                    <DialogDescription>
                        The following assignments have been modified by the coordinator. Please review the changes.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] mt-4 overflow-y-auto">
                    <div className="space-y-4 pr-4">
                        {assignments.map((assignment) => (
                            <div key={assignment.id} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <h3 className="font-semibold text-lg">{assignment.assignment_name}</h3>
                                <div className="space-y-2 mt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {new Date(assignment.event_start_datetime).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            {new Date(assignment.event_start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                            {new Date(assignment.event_end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>{assignment.event_location}</span>
                                    </div>
                                    {assignment.description && (
                                        <p className="mt-2 text-foreground">{assignment.description}</p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full mt-4"
                                    onClick={() => onAcknowledge(assignment.id)}
                                >
                                    Acknowledge
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter className="mt-4">
                    <Button onClick={onClose} className="w-full sm:w-auto">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
