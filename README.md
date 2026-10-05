# AI Mock Interview Simulator

A full-stack, AI-powered mock interview practice platform built for **PBL Web Technologies (Review 2)**. It features real-time answer evaluation via **Google Gemini Flash**, persistent session history in **MySQL**, candidate authentication, and an extensive question bank organized in structured batches of 30 questions.

---

## Key Features

1. **Full-Stack Architecture**:
   - **Frontend**: Vanilla HTML5, CSS3 (Strict 3-Color Monochrome Design System: Black, White, Grey), and JavaScript (ES6).
   - **Backend**: PHP RESTful API (`api/*.php`).
   - **Database**: MySQL / MariaDB (4 normalized tables).
   - **AI Engine**: Google Gemini Flash API for real-time objective scoring and feedback.

2. **300+ Question Bank**:
   - Exactly **100 HR / General Questions**
   - Exactly **100 Technical (Web Technologies) Questions**
   - Exactly **100 Behavioral Questions**
   - Served in modular batches of 30 ("Set 1: First 30", "Set 2: Next 30", etc.) or custom quick practice sets.

3. **Google Gemini Flash AI Evaluation**:
   - Scores responses on a 1–10 scale.
   - Evaluates clarity, accuracy, strengths, and areas to improve compared to reference model answers.
   - Includes intelligent local heuristic fallback if API quota or offline.

4. **Candidate Portal & History Tracking**:
   - User registration and login with secure password hashing (`password_hash`).
   - Demo credentials: `demo` / `demo123`.
   - Complete session history saved to MySQL (`interview_sessions`, `interview_responses`).

---

## Database Architecture

- `users`: Candidate credentials and profiles.
- `questions`: 300 curated questions with difficulty tags, reference answers, and preparation tips.
- `interview_sessions`: Metadata for each interview attempt, candidate scores, and timestamps.
- `interview_responses`: Detailed transcripts of every submitted answer, AI scores, and feedback.

---

## Quick Setup (Local XAMPP)

1. Clone this repository into your web server directory (e.g. `htdocs/pbl`):
   ```bash
   git clone https://github.com/Sandeep1108c/Ai-mock-interviewer.git pbl
   ```
2. Start **Apache** and **MySQL** in XAMPP.
3. Import the database schema and questions:
   - Option A: Run `http://localhost/pbl/api/setup_db.php` in your browser.
   - Option B: Import `database.sql` into phpMyAdmin (`http://localhost/phpmyadmin/`).
4. Access the application:
   - Home: `http://localhost/pbl/`
   - Practice Setup: `http://localhost/pbl/setup.html`
   - History: `http://localhost/pbl/history.html`
   - Candidate Login: `http://localhost/pbl/login.html` (Demo: `demo` / `demo123`)

---

## Environment Configuration

Configuration is located in `api/config.php` and can be customized via environment variables:
- `DB_HOST`: Database host (default: `localhost`)
- `DB_PORT`: Database port (default: `3306`)
- `DB_NAME`: Database name (default: `interview_simulator`)
- `DB_USER`: Database username (default: `root`)
- `DB_PASS`: Database password (default: `""`)
- `GEMINI_API_KEY`: Google Gemini API Key

---

## License

Built for academic assessment — PBL Web Technologies Project.
