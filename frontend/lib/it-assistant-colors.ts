// Centralized IT Assistant color palette
// Used across ITOfficeSchedulePage, ITOfficeAssistantsPage, and ITOfficeScheduleAssistantView

export const IT_ASSISTANT_COLORS = [
    { bg: '#6366f1', text: '#ffffff', name: 'Indigo' },
    { bg: '#ec4899', text: '#ffffff', name: 'Pink' },
    { bg: '#f59e0b', text: '#ffffff', name: 'Amber' },
    { bg: '#10b981', text: '#ffffff', name: 'Emerald' },
    { bg: '#3b82f6', text: '#ffffff', name: 'Blue' },
    { bg: '#ef4444', text: '#ffffff', name: 'Red' },
    { bg: '#8b5cf6', text: '#ffffff', name: 'Violet' },
    { bg: '#14b8a6', text: '#ffffff', name: 'Teal' },
    { bg: '#f97316', text: '#ffffff', name: 'Orange' },
    { bg: '#64748b', text: '#ffffff', name: 'Slate' },
];

/**
 * Returns the color object for an IT assistant by their sorted index.
 * The color is consistent across all pages as long as the same sorted list is used.
 */
export function getITAssistantColor(index: number) {
    return IT_ASSISTANT_COLORS[index % IT_ASSISTANT_COLORS.length];
}
