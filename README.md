# Dev|Sani Portfolio Backend

Backend API for Dev|Sani Portfolio website. Handles contact form submissions with email notifications.

## 🚀 Features

- **Secure Contact Form** with rate limiting (5 requests per 15 minutes)
- **Email Notifications** via Gmail SMTP
- **Auto-Reply System** for senders
- **Input Validation** & spam protection
- **CORS Protection** for frontend security
- **Professional HTML Email Templates**

## 🛠️ Tech Stack

- Node.js
- Express.js
- Nodemailer
- Express Rate Limit
- Helmet (security headers)
- Validator (input sanitization)

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/goldenimowire/devsani-backend.git

# Navigate to folder
cd devsani-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run locally
npm run dev