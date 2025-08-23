# SecureBank - QA Testing Application

## Overview
This is a banking web application with a robust money transfer system. The application includes comprehensive security features, audit logging, and production-ready transfer functionality.

## Features
- User registration and authentication
- Account dashboard with balance overview
- **Robust Money Transfer System** with comprehensive security
- Transaction history viewing
- **Transfer Audit Logging** with detailed security tracking
- **Rate Limiting** and daily transfer limits
- **Input Validation** and XSS protection
- Responsive design (with some intentional issues)

## Money Transfer System

### Core Features
- **Atomic Transactions**: All-or-nothing transfer processing
- **Thread Safety**: Concurrent transfer protection with locking mechanisms
- **Comprehensive Validation**: Amount, account, and user validation
- **Security Controls**: Authentication, authorization, and rate limiting
- **Audit Trail**: Complete logging of all transfer attempts and outcomes

### Security Measures
- **Rate Limiting**: 10 attempts per minute per user
- **Daily Limits**: $50,000 daily transfer limit per user
- **Transfer Limits**: $0.01 minimum, $10,000 maximum per transfer
- **Input Sanitization**: XSS protection and input validation
- **Authentication**: User verification and account ownership validation
- **Audit Logging**: Comprehensive security and compliance logging

### Technical Specifications

#### API Design
```typescript
interface TransferRequest {
  fromAccountId: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
  userId: string;
}

interface TransferResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  newBalance?: number;
  error?: TransferError;
}
```

#### Validation Rules
- Amount: Must be between $0.01 and $10,000
- Account Numbers: Must be valid 10-digit numbers
- Daily Limit: Maximum $50,000 per user per day
- Rate Limit: Maximum 10 attempts per minute per user
- Self-Transfer: Blocked (cannot transfer to same account)
- Sufficient Funds: Source account must have adequate balance

#### Error Handling
- `INSUFFICIENT_FUNDS`: Not enough balance in source account
- `RATE_LIMIT_EXCEEDED`: Too many transfer attempts
- `DAILY_LIMIT_EXCEEDED`: Daily transfer limit reached
- `UNAUTHORIZED`: User not authorized for account access
- `DESTINATION_ACCOUNT_NOT_FOUND`: Invalid recipient account
- `SELF_TRANSFER_NOT_ALLOWED`: Attempted self-transfer
- `INVALID_AMOUNT_FORMAT`: Invalid amount format or range
- `SYSTEM_ERROR`: Internal system error

#### Database Transaction Structure
```typescript
// Atomic operation ensures data consistency
1. Validate all inputs and business rules
2. Lock accounts to prevent concurrent modifications
3. Check sufficient funds
4. Update source account balance (-amount)
5. Update destination account balance (+amount)
6. Create transaction record
7. Create audit log entry
8. Release locks
```

#### Security Implementation
- **Authentication**: JWT-like session validation
- **Authorization**: Account ownership verification
- **Rate Limiting**: Time-window based attempt tracking
- **Input Validation**: Comprehensive server-side validation
- **XSS Protection**: Input sanitization and encoding
- **Audit Logging**: All attempts logged with timestamps and metadata
- **Session Management**: 30-minute timeout with activity tracking

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

## Transfer System Usage

1. **Navigate to Transfer**: Use the Transfer tab in the main navigation
2. **Select Recipient**: Choose from available accounts using the dropdown
3. **Enter Amount**: Specify transfer amount (min $0.01, max $10,000)
4. **Add Description**: Optional description for the transfer
5. **Submit Transfer**: System validates and processes the transfer
6. **View Audit Log**: Check the Audit Log tab for detailed transfer history

## Analytics System Usage

1. **Navigate to Analytics**: Use the Analytics tab in the main navigation
2. **View Overview**: See spending summaries, insights, and top categories
3. **Explore Categories**: Interactive pie charts and category breakdowns
4. **Analyze Trends**: Time-series charts showing spending patterns over time
5. **Manage Budgets**: Set monthly spending limits and track progress
6. **View Predictions**: AI-powered forecasts for future spending patterns
7. **Export Data**: Download analytics data in CSV or JSON format

### Analytics Features
- **Smart Categorization**: Automatic transaction categorization based on merchant data
- **Interactive Charts**: Pie charts, bar charts, and trend lines with hover effects
- **Budget Tracking**: Set spending limits with progress monitoring and alerts
- **Predictive Analytics**: Machine learning-based spending forecasts
- **Insights Engine**: AI-generated recommendations and spending alerts
- **Data Export**: Export analytics data for external analysis
- **Responsive Design**: Optimized for mobile and desktop viewing

## Known Limitations
- Uses localStorage instead of a real database
- No actual payment processing
- Demo application for educational purposes