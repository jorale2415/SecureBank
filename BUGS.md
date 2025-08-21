# QA Test Application - Bug Report (INTERVIEWER REFERENCE)

## Overview
This document lists all intentionally embedded bugs in the SecureBank application for QA interview purposes.

⚠️ **CONFIDENTIAL**: This document is for interviewer use only and should NOT be shared with candidates.

---

## Bug #1: Transfer to Self Not Blocked
**Location**: `src/components/TransferForm.tsx` (line ~48-53)
**Type**: Functional Bug
**Severity**: Medium
**Description**: Users can transfer money to their own account number
**Expected Behavior**: System should validate and prevent self-transfers
**Actual Behavior**: Transfer is processed successfully
**Steps to Reproduce**:
1. Go to Transfer page
2. Enter your own account number as recipient
3. Enter any amount
4. Submit transfer
5. Transfer completes successfully

---

## Bug #2: Negative Transfer Amounts Accepted
**Location**: `src/components/TransferForm.tsx` (line ~54-59)
**Type**: Functional Bug  
**Severity**: High
**Description**: System accepts negative amounts for transfers
**Expected Behavior**: Only positive amounts should be accepted
**Actual Behavior**: Negative amounts are processed, actually adding money to balance
**Steps to Reproduce**:
1. Go to Transfer page
2. Enter any valid account number
3. Enter a negative amount (e.g., -50)
4. Submit transfer
5. Balance increases instead of decreases

---

## Bug #3: Transaction History Wrong Order
**Location**: `src/components/TransactionHistory.tsx` (line ~34)
**Type**: Functional Bug
**Severity**: Low-Medium
**Description**: Transactions display in chronological order (oldest first) instead of reverse chronological
**Expected Behavior**: Newest transactions should appear at the top
**Actual Behavior**: Oldest transactions appear at the top
**Steps to Reproduce**:
1. Make multiple transfers
2. Go to Transaction History
3. Observe transactions are listed oldest-first instead of newest-first

---

## Bug #4: Loading Spinner Never Stops on Login
**Location**: `src/context/AuthContext.tsx` (line ~40-41)
**Type**: UI/UX Bug
**Severity**: Medium
**Description**: Loading spinner continues indefinitely after successful login
**Expected Behavior**: Loading spinner should disappear after login completes
**Actual Behavior**: Spinner remains visible even after successful login
**Steps to Reproduce**:
1. Use demo credentials to log in
2. After successful login, observe loading spinner persists
3. Loading overlay remains on screen

---

## Bug #5: Notifications Don't Auto-Dismiss
**Location**: `src/context/NotificationContext.tsx` (line ~20-23)
**Type**: UI/UX Bug
**Severity**: Medium
**Description**: Success/error messages accumulate and never disappear automatically
**Expected Behavior**: Notifications should auto-dismiss after 5 seconds
**Actual Behavior**: All notifications remain visible and stack up
**Steps to Reproduce**:
1. Perform multiple actions that generate notifications
2. Observe all notifications remain visible
3. Notifications stack up and must be manually closed

---

## Bug #6: Mobile Layout Breaks on Transfer Form
**Location**: `src/components/TransferForm.tsx` (line ~114-126)
**Type**: UI/UX Bug
**Severity**: Low
**Description**: Transfer form bottom section overflows on mobile screens
**Expected Behavior**: Form should remain fully visible on mobile
**Actual Behavior**: Button and fee text overlap/clip on narrow screens
**Steps to Reproduce**:
1. Resize browser to mobile width (< 400px) or use device tools
2. Navigate to Transfer page
3. Observe layout issues at bottom of form

---

## Bug #7: Invalid Email Validation
**Location**: `src/components/RegisterForm.tsx` (line ~22-25)
**Type**: Validation Bug
**Severity**: Medium
**Description**: Email validation accepts incomplete email formats
**Expected Behavior**: Should reject emails without proper domain (like "test@")
**Actual Behavior**: Accepts "test@" as valid email
**Steps to Reproduce**:
1. Go to registration page
2. Enter "test@" in email field
3. Fill other fields correctly
4. Submit form - it accepts the invalid email

---

## Bug #8: Password Requirements Not Enforced
**Location**: `src/components/RegisterForm.tsx` (line ~36-40)
**Type**: Validation Bug
**Severity**: High
**Description**: Password requirements are displayed but not validated
**Expected Behavior**: Should enforce 8+ characters with complexity requirements
**Actual Behavior**: Accepts any password regardless of requirements shown
**Steps to Reproduce**:
1. Go to registration page
2. Enter a weak password like "123"
3. Notice requirements are shown but not enforced
4. Account creation succeeds with weak password

---

## Bug #9: Transaction History Slow Load Without Pagination
**Location**: `src/components/TransactionHistory.tsx` (line ~19-22)
**Type**: Performance Bug
**Severity**: Medium
**Description**: All transactions load at once with artificial 3-second delay
**Expected Behavior**: Should load quickly with pagination for large datasets
**Actual Behavior**: Always takes 3 seconds to load regardless of transaction count
**Steps to Reproduce**:
1. Navigate to Transaction History
2. Observe the loading takes exactly 3 seconds every time
3. No pagination controls available

---

## Bug #10: Scientific Notation in Transfer Amount
**Location**: `src/components/TransferForm.tsx` (HTML input type="number")
**Type**: Edge Case Bug
**Severity**: Low
**Description**: Amount field accepts scientific notation (e.g., 1e2) causing display inconsistencies
**Expected Behavior**: Should only accept decimal format or convert/display properly
**Actual Behavior**: Accepts "1e2" but may cause display/calculation issues
**Steps to Reproduce**:
1. Go to Transfer page
2. Enter "1e2" in the amount field (equals 100)
3. Submit transfer
4. Observe potential display or processing inconsistencies

---

## Summary by Category

**Functional Bugs (3)**:
- Transfer to self not blocked (#1)
- Negative amounts accepted (#2)  
- Wrong transaction order (#3)

**UI/UX Bugs (3)**:
- Loading spinner never stops (#4)
- Notifications don't auto-dismiss (#5)
- Mobile layout breaks (#6)

**Validation Bugs (2)**:
- Invalid email validation (#7)
- Password requirements not enforced (#8)

**Performance/Usability Bugs (1)**:
- Slow transaction loading (#9)

**Edge Case Bugs (1)**:
- Scientific notation acceptance (#10)

---

## Interviewer Notes

### Bug Severity Guidelines:
- **High**: Security issues, data corruption, major functional failures
- **Medium**: Important features not working properly, UX problems
- **Low**: Minor visual issues, edge cases

### Expected Discovery Rate:
- **Junior QA**: 5-7 bugs discovered
- **Mid-level QA**: 7-9 bugs discovered  
- **Senior QA**: 8-10 bugs discovered

### Time Allocation:
- Allow 45-60 minutes for testing
- Provide additional 15 minutes for bug reporting if requested