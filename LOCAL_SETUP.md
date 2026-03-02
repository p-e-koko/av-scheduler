# Step-by-Step Local Setup Guide

Follow these simple steps to run the **AV-Scheduler** on your computer.

## 1. Open Docker Desktop
- Find **Docker Desktop** in your Windows Start menu and open it.
- Wait until the little "whale" icon in the bottom-left corner turns **green** (this means Docker is ready).

## 2. Prepare Environment Files (Fixed)
- I have already created the necessary `.env` files for you in the root, `backend/`, and `frontend/` folders.
- These files ensure that Docker knows how to connect to the database.

## 3. Open the Terminal in VS Code
- In your VS Code window and make sure you are in the `final-project-p-e-koko` folder.
- At the top menu, click **Terminal** > **New Terminal** (or press `Ctrl` + ` ` `).
- You should see a command prompt at the bottom of your screen.

## 3. Build and Start the Project
- Copy and paste the following command into your terminal and press **Enter**:
  ```powershell
  docker compose up -d --build
  ```
- **Wait**: This might take 2-5 minutes the first time. It is downloading the database and setting up the code.
- You will know it's done when it says `[+] Running 3/3` and gives you back the command prompt.

## 4. Set Up the Database
- Copy and paste this command specifically to create the test data:
  ```powershell
  docker compose exec backend php artisan migrate:fresh --seed
  ```
- This creates the fake students, supervisors, and admins for you to test with.

## 5. Open the Web App
- Open your browser (Chrome or Edge) and go to:
  [http://localhost:3000](http://localhost:3000)

## 6. How to Log In Locally
- Since you are local, don't use the Microsoft button (it won't work).
- Click the **"Use Email & Password"** button at the bottom.
- Enter these credentials to see the **Admin Dashboard**:
  - **Email**: `pekkodev@gmail.com`
  - **Password**: `password`

---

### Tips
- **Shutting Down**: When you are finished, just run `docker compose down` in the terminal.
- **Seeing Dashboard**: You can also see your running project in the **Docker Desktop** app under the "Containers" tab.
