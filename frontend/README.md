# FraudShield Frontend

React 18 + Vite + Tailwind CSS frontend for the FraudShield intelligent fraud detection banking platform.

## Stack

| Layer     | Tech                               |
|-----------|------------------------------------|
| Framework | React 18 + Vite                    |
| Styling   | Tailwind CSS + custom CSS vars     |
| Routing   | React Router v6 (useRoutes)        |
| State     | Zustand (auth) + local useState    |
| HTTP      | Axios with interceptors            |
| Animation | Framer Motion                      |
| Charts    | Recharts                           |
| Toast     | react-hot-toast                    |

## Folder Structure

```
src/
├── app/
│   ├── App.jsx          ← useRoutes root
│   └── routes.jsx       ← all route definitions
├── features/
│   ├── auth/
│   │   ├── authSlice.js         ← Zustand store
│   │   ├── hooks/useAuth.js
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       └── ProfilePage.jsx
│   ├── transactions/
│   │   ├── components/
│   │   │   ├── RiskBadge.jsx
│   │   │   └── OTPModal.jsx
│   │   ├── hooks/useTransactions.js
│   │   ├── services/transactionService.js
│   │   └── pages/
│   │       ├── DashboardPage.jsx
│   │       ├── SendMoneyPage.jsx
│   │       └── TransactionHistoryPage.jsx
│   ├── alerts/
│   │   ├── components/AlertCard.jsx
│   │   ├── hooks/useAlerts.js
│   │   └── pages/AlertsPage.jsx
│   ├── fraud/
│   │   └── hooks/useFraudDetection.js
│   └── admin/
│       ├── services/adminService.js
│       └── pages/AdminPage.jsx
├── shared/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Loader.jsx
│   │   ├── Modal.jsx
│   │   └── NotFoundPage.jsx
│   ├── constants/index.js
│   ├── hooks/useLocalStorage.js
│   ├── services/api.js         ← axios instance
│   └── utils/index.js
├── styles/index.css
└── main.jsx
```

## Setup

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env with your backend URL and Razorpay key

# Start dev server (port 3000)
npm run dev

# Build for production
npm run build
```

## Environment Variables

```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_HERE
```

## Pages

| Route        | Page                    | Auth  |
|--------------|-------------------------|-------|
| `/login`     | LoginPage               | Public |
| `/register`  | RegisterPage            | Public |
| `/dashboard` | DashboardPage           | ✓ |
| `/send`      | SendMoneyPage           | ✓ |
| `/history`   | TransactionHistoryPage  | ✓ |
| `/alerts`    | AlertsPage              | ✓ |
| `/profile`   | ProfilePage             | ✓ |
| `/admin`     | AdminPage               | Admin only |

## Send Money Flow

```
FORM → send /api/transactions/send
         ↓
       RESULT (risk level shown)
         ↓
   LOW  →  auto-approve  →  DONE
   MEDIUM → OTP modal   →  verify-otp  → DONE (or Razorpay)
   HIGH  →  blocked, show alert
```

## Adding Razorpay Script

Add this to `index.html` before `</body>`:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```
