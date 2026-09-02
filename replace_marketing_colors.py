import os

files_to_update = [
    r"frontend\app\dashboard\student-ambassador\page.tsx",
    r"frontend\components\MarketingSupervisorSimpleSchedule.tsx",
    r"frontend\components\MarketingStudentAmbassadorsPage.tsx",
    r"frontend\components\MarketingAssignmentsList.tsx",
]

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # 1. Active states
        content = content.replace("bg-primary text-primary-foreground", "bg-marketing-600 text-white")
        content = content.replace("bg-primary hover:bg-primary-dark text-primary-foreground", "bg-marketing-600 hover:bg-marketing-700 text-white")
        
        # 2. Text colors
        content = content.replace("text-primary", "text-marketing-600")
        
        # 3. Focus Rings
        content = content.replace("ring-primary", "ring-marketing-500")

        # 4. Background tints
        content = content.replace("bg-primary/10", "bg-marketing-100")
        content = content.replace("text-primary-medium", "text-marketing-800")
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {file_path}")
    else:
        print(f"File not found: {file_path}")
