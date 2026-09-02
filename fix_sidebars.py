import os

sidebars = [
    r"frontend\components\StudentSidebar.tsx",
    r"frontend\components\SupervisorSidebar.tsx",
    r"frontend\components\CoordinatorSidebar.tsx",
    r"frontend\components\CustomerSidebar.tsx",
    r"frontend\components\AdminSidebar.tsx",
]

for file_path in sidebars:
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to change things like !path.includes('/dashboard/student') to path !== '/dashboard/student'
    # But specifically targeting exactly those
    
    replacements = [
        ("!path.includes('/dashboard/student')", "path !== '/dashboard/student'"),
        ("!path.includes('/dashboard/supervisor')", "path !== '/dashboard/supervisor'"),
        ("!path.includes('/dashboard/coordinator')", "path !== '/dashboard/coordinator'"),
        ("!path.includes('/dashboard/admin')", "path !== '/dashboard/admin'"),
        ("!path.includes('/dashboard/customer')", "path !== '/dashboard/customer'"),
        ("!path.includes('/dashboard/inventory')", "path !== '/dashboard/inventory'"),
        ("!path.includes('/dashboard/keys')", "path !== '/dashboard/keys'"),
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"Updated {file_path}")
