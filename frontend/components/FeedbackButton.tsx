"use client";

import { useState } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusDialog } from "@/components/StatusDialog";

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<"issue" | "recommendation">("issue");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Status Dialog State
    const [statusDialog, setStatusDialog] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        type: "success" | "error";
    }>({
        isOpen: false,
        title: "",
        description: "",
        type: "success",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);
        try {
            await api.post("/feedback", {
                type,
                message,
            });

            // Show success dialog
            setStatusDialog({
                isOpen: true,
                title: "Feedback Sent",
                description: "Thank you for your feedback! It has been sent to the administrator.",
                type: "success",
            });

            setIsOpen(false);
            setMessage("");
            setType("issue");
        } catch (error: any) {
            console.error("Failed to send feedback:", error);

            // Show error dialog
            setStatusDialog({
                isOpen: true,
                title: "Error",
                description: "Failed to send feedback. Please try again later.",
                type: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50 p-0"
                size="icon"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </Button>

            {isOpen && (
                <Card className="fixed bottom-24 right-8 w-80 shadow-xl z-50 animate-in slide-in-from-bottom-2 fade-in-20">
                    <CardHeader>
                        <CardTitle>Send Feedback</CardTitle>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Feedback Type</Label>
                                <div className="flex space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="issue"
                                            name="feedbackType"
                                            value="issue"
                                            checked={type === "issue"}
                                            onChange={() => setType("issue")}
                                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <Label htmlFor="issue" className="cursor-pointer">Issue</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="recommendation"
                                            name="feedbackType"
                                            value="recommendation"
                                            checked={type === "recommendation"}
                                            onChange={() => setType("recommendation")}
                                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <Label htmlFor="recommendation" className="cursor-pointer">Idea</Label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Tell us what's on your mind..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="min-h-[100px]"
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Feedback
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            <StatusDialog
                isOpen={statusDialog.isOpen}
                onClose={() => setStatusDialog((prev) => ({ ...prev, isOpen: false }))}
                title={statusDialog.title}
                description={statusDialog.description}
                type={statusDialog.type}
            />
        </>
    );
}
