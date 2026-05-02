# E-Signature App

A full-stack e-signature application that allows users to upload, request, and sign PDF documents. Built with a modern tech stack utilizing Vite, React, ElysiaJS, Bun, and Supabase.

This project was built collaboratively leveraging AI tooling to accelerate development, while strictly adhering to the architectural requirements and thoroughly verifying all code before submission.

## Tech Stack
*   **Frontend:** React + TypeScript (Vite)
*   **Backend:** ElysiaJS running on Bun
*   **Database & Auth:** Supabase
*   **CI/CD:** GitHub Actions (Unit Tests)
*   **Deployment:** Vercel (Frontend), Render (Backend)

---

## Features
1.  **Upload & Request:** Users can log in, upload a PDF document, and request a signature.
2.  **Sign Document:** Signers can view the document, draw their signature using a digital signature pad, position the signature dynamically on the document, and apply it.
3.  **Return & View:** The application embeds the signature natively into the PDF using `pdf-lib` and returns the newly signed document to the dashboard for the requester to view/download.
4.  **Unit Testing:** Backend logic is covered by automated unit tests running via GitHub Actions.

---

## How to Run Locally

### Prerequisites
You will need the following installed on your machine:
*   [Bun](https://bun.sh/) (v1.0+)
*   [Node.js](https://nodejs.org/) (v18+)

### 1. Clone the Repository
```bash
git clone https://github.com/spiritknight17/e-signature-app.git
cd e-signature-app
```

### 2. Set up the Database (Supabase)
This project requires a Supabase project.
1. Create a new project on [Supabase](https://supabase.com).
2. Create the required tables (`users`, `documents`, `signatures`) according to the schema provided in the assignment.
3. Obtain your **Project URL**, **Anon Key**, and **Service Role Key** from the Supabase dashboard (Project Settings -> API).

### 3. Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```
2. Install dependencies:
```bash
bun install
```
3. Create a `.env` file in the `backend` folder and add your Supabase credentials:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
4. Start the backend server:
```bash
bun run dev
```
The backend will run at `http://localhost:3000`.

### 4. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
```bash
cd Frontend
```
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file in the `Frontend` folder and specify the local API URL:
```env
VITE_API_URL=http://localhost:3000
```
4. Start the frontend development server:
```bash
npm run dev
```
The frontend will be accessible at the localhost URL provided by Vite (usually `http://localhost:5173`).

---

## Running Unit Tests
Unit tests are written for the backend to verify the signature workflow.
1. Navigate to the backend directory.
2. Run the test command:
```bash
bun test
```
*Note: The test suite interacts with your connected Supabase database and requires at least one user to exist in the `users` table.*

---

## Live Deployment Links:
Frontend: e-signature-app-frontend.vercel.app

Backend: https://e-signature-backend.onrender.com/swagger

## AI Collaboration Acknowledgment
This project was built in collaboration with Trae AI. The AI agent was leveraged for:
- Implementing complex PDF rendering and signature embedding using `pdf-lib` and `pdfjs-dist`.
- Configuring and troubleshooting GitHub Actions CI pipelines and Vercel/Render deployments.
All AI-generated code was actively reviewed, tested, and validated to ensure strict adherence to the project requirements.