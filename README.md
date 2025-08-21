# SecureBank - QA Testing Application

## Overview
This is a banking web application specifically designed for QA technical interviews. The application contains intentionally placed bugs for testing purposes.

## Features
- User registration and authentication
- Account dashboard with balance overview
- Money transfer functionality
- Transaction history viewing
- Responsive design (with some intentional issues)

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
1. Clone or extract the project files
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`

## Demo Credentials
For testing purposes, you can use these pre-configured credentials:

**Demo User:**
- Email: `demo@bank.com`
- Password: `demo123`

Or create a new account using the registration form.

## Application Structure
```
src/
├── components/           # React components
│   ├── Dashboard.tsx     # Account overview
│   ├── LoginForm.tsx     # User authentication
│   ├── RegisterForm.tsx  # New user registration
│   ├── TransferForm.tsx  # Money transfer interface
│   ├── TransactionHistory.tsx # Transaction viewing
│   ├── LoadingSpinner.tsx # Loading indicator
│   └── NotificationContainer.tsx # Alert messages
├── context/             # React Context providers
│   ├── AuthContext.tsx  # Authentication state
│   └── NotificationContext.tsx # Notification system
└── App.tsx             # Main application component
```

## Testing Guidelines
This application is designed for exploratory testing. Key areas to focus on include:

1. **User Authentication**
   - Registration process
   - Login functionality
   - Form validation

2. **Money Transfers**
   - Transfer form validation
   - Balance updates
   - Edge cases (negative amounts, self-transfers, etc.)

3. **User Interface**
   - Responsive design across different screen sizes
   - Loading states and error handling
   - Notification system behavior

4. **Transaction History**
   - Data accuracy and ordering
   - Performance with multiple transactions
   - Filtering functionality

5. **General Usability**
   - Navigation flow
   - Error messages and user feedback
   - Browser compatibility

## Data Storage
The application uses localStorage to simulate a database. Data persists across browser sessions but will be cleared if localStorage is manually cleared.

## Browser Compatibility
Tested on:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Known Limitations
- This is a demo application not intended for production use
- Uses localStorage instead of a real database
- No actual payment processing
- Limited security implementation