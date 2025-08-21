import { BankAccount, Transaction, User } from '../context/AuthContext';

export interface TransferRequest {
  fromAccountId: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
  userId: string;
}

export interface TransferResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  newBalance?: number;
  error?: TransferError;
}

export interface TransferError {
  code: string;
  message: string;
  details?: any;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: 'TRANSFER_ATTEMPT' | 'TRANSFER_SUCCESS' | 'TRANSFER_FAILED';
  fromAccount: string;
  toAccount: string;
  amount: number;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  errorCode?: string;
  metadata?: any;
}

export interface RateLimitEntry {
  userId: string;
  attempts: number;
  windowStart: Date;
  lastAttempt: Date;
}

export class TransferService {
  private static readonly MAX_TRANSFER_AMOUNT = 10000; // $10,000 daily limit
  private static readonly MIN_TRANSFER_AMOUNT = 0.01; // $0.01 minimum
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly MAX_ATTEMPTS_PER_WINDOW = 10; // 10 attempts per minute
  private static readonly DAILY_TRANSFER_LIMIT = 50000; // $50,000 daily limit
  
  private static transferLocks = new Map<string, Promise<any>>();
  private static rateLimitMap = new Map<string, RateLimitEntry>();

  /**
   * Main transfer method with comprehensive validation and security
   */
  static async executeTransfer(request: TransferRequest): Promise<TransferResponse> {
    // EMERGENCY CIRCUIT BREAKER - BLOCK ALL TRANSFERS
    const emergencyMode = localStorage.getItem('EMERGENCY_MODE');
    if (emergencyMode === 'true') {
      return {
        success: false,
        message: 'System in emergency mode - all transfers blocked',
        error: {
          code: 'EMERGENCY_MODE_ACTIVE',
          message: 'Emergency circuit breaker activated'
        }
      };
    }

    const startTime = Date.now();
    let auditLog: AuditLog;

    try {
      // 1. Input validation
      const validationResult = this.validateTransferRequest(request);
      if (!validationResult.isValid) {
        auditLog = this.createAuditLog(request, 'TRANSFER_FAILED', validationResult.error!.code);
        this.saveAuditLog(auditLog);
        return {
          success: false,
          message: validationResult.error!.message,
          error: validationResult.error
        };
      }

      // 2. Rate limiting check
      const rateLimitResult = this.checkRateLimit(request.userId);
      if (!rateLimitResult.allowed) {
        auditLog = this.createAuditLog(request, 'TRANSFER_FAILED', 'RATE_LIMIT_EXCEEDED');
        this.saveAuditLog(auditLog);
        return {
          success: false,
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many transfer attempts',
            details: { retryAfter: rateLimitResult.retryAfter }
          }
        };
      }

      // 3. User authentication and authorization
      const authResult = this.authenticateUser(request.userId, request.fromAccountId);
      if (!authResult.authorized) {
        auditLog = this.createAuditLog(request, 'TRANSFER_FAILED', 'UNAUTHORIZED');
        this.saveAuditLog(auditLog);
        return {
          success: false,
          message: 'Unauthorized: You do not have permission to transfer from this account',
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authorized for this account'
          }
        };
      }

      // 4. Daily limit check
      const dailyLimitResult = this.checkDailyLimit(request.userId, request.amount);
      if (!dailyLimitResult.allowed) {
        auditLog = this.createAuditLog(request, 'TRANSFER_FAILED', 'DAILY_LIMIT_EXCEEDED');
        this.saveAuditLog(auditLog);
        return {
          success: false,
          message: `Daily transfer limit exceeded. Remaining: $${dailyLimitResult.remaining.toFixed(2)}`,
          error: {
            code: 'DAILY_LIMIT_EXCEEDED',
            message: 'Daily transfer limit exceeded',
            details: { remaining: dailyLimitResult.remaining }
          }
        };
      }

      // 5. Execute atomic transfer with locking
      const transferResult = await this.executeAtomicTransfer(request);
      
      if (transferResult.success) {
        auditLog = this.createAuditLog(request, 'TRANSFER_SUCCESS');
        this.saveAuditLog(auditLog);
        this.updateDailyLimit(request.userId, request.amount);
      } else {
        auditLog = this.createAuditLog(request, 'TRANSFER_FAILED', transferResult.error!.code);
        this.saveAuditLog(auditLog);
      }

      return transferResult;

    } catch (error) {
      // System error handling
      auditLog = this.createAuditLog(request, 'TRANSFER_FAILED', 'SYSTEM_ERROR');
      this.saveAuditLog(auditLog);
      
      console.error('Transfer system error:', error);
      return {
        success: false,
        message: 'System error occurred. Please try again later.',
        error: {
          code: 'SYSTEM_ERROR',
          message: 'Internal system error'
        }
      };
    }
  }

  /**
   * Validate transfer request with comprehensive checks
   */
  private static validateTransferRequest(request: TransferRequest): { isValid: boolean; error?: TransferError } {
    // Check required fields
    if (!request.fromAccountId || !request.toAccountNumber || !request.userId) {
      return {
        isValid: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields: fromAccountId, toAccountNumber, or userId'
        }
      };
    }

    // Validate amount
    if (typeof request.amount !== 'number' || isNaN(request.amount)) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_AMOUNT_FORMAT',
          message: 'Transfer amount must be a valid number'
        }
      };
    }

    // Check amount range
    if (request.amount < this.MIN_TRANSFER_AMOUNT) {
      return {
        isValid: false,
        error: {
          code: 'AMOUNT_TOO_SMALL',
          message: `Minimum transfer amount is $${this.MIN_TRANSFER_AMOUNT.toFixed(2)}`
        }
      };
    }

    if (request.amount > this.MAX_TRANSFER_AMOUNT) {
      return {
        isValid: false,
        error: {
          code: 'AMOUNT_TOO_LARGE',
          message: `Maximum transfer amount is $${this.MAX_TRANSFER_AMOUNT.toFixed(2)}`
        }
      };
    }

    // Validate decimal places (max 2)
    if (Math.round(request.amount * 100) !== request.amount * 100) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_DECIMAL_PLACES',
          message: 'Amount cannot have more than 2 decimal places'
        }
      };
    }

    // Validate account number format
    if (!/^\d{10}$/.test(request.toAccountNumber)) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_ACCOUNT_FORMAT',
          message: 'Account number must be 10 digits'
        }
      };
    }

    // Sanitize description
    if (request.description) {
      request.description = this.sanitizeInput(request.description);
      if (request.description.length > 100) {
        return {
          isValid: false,
          error: {
            code: 'DESCRIPTION_TOO_LONG',
            message: 'Description cannot exceed 100 characters'
          }
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Check rate limiting for user
   */
  private static checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
    const now = new Date();
    const entry = this.rateLimitMap.get(userId);

    if (!entry) {
      // First attempt
      this.rateLimitMap.set(userId, {
        userId,
        attempts: 1,
        windowStart: now,
        lastAttempt: now
      });
      return { allowed: true };
    }

    // Check if window has expired
    const windowAge = now.getTime() - entry.windowStart.getTime();
    if (windowAge > this.RATE_LIMIT_WINDOW) {
      // Reset window
      this.rateLimitMap.set(userId, {
        userId,
        attempts: 1,
        windowStart: now,
        lastAttempt: now
      });
      return { allowed: true };
    }

    // Check if limit exceeded
    if (entry.attempts >= this.MAX_ATTEMPTS_PER_WINDOW) {
      const retryAfter = Math.ceil((this.RATE_LIMIT_WINDOW - windowAge) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment attempts
    entry.attempts++;
    entry.lastAttempt = now;
    return { allowed: true };
  }

  /**
   * Authenticate user and authorize account access
   */
  private static authenticateUser(userId: string, accountId: string): { authorized: boolean; user?: User } {
    try {
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      const user = users.find((u: User) => u.id === userId);
      
      if (!user) {
        return { authorized: false };
      }

      // Check if user owns the account
      const hasAccess = user.accounts?.some((acc: BankAccount) => acc.id === accountId);
      
      return { authorized: hasAccess, user };
    } catch (error) {
      console.error('Authentication error:', error);
      return { authorized: false };
    }
  }

  /**
   * Check daily transfer limits
   */
  private static checkDailyLimit(userId: string, amount: number): { allowed: boolean; remaining: number } {
    try {
      const today = new Date().toDateString();
      const dailyLimits = JSON.parse(localStorage.getItem('dailyTransferLimits') || '{}');
      const userLimit = dailyLimits[userId] || { date: today, used: 0 };

      // Reset if new day
      if (userLimit.date !== today) {
        userLimit.date = today;
        userLimit.used = 0;
      }

      const remaining = this.DAILY_TRANSFER_LIMIT - userLimit.used;
      const allowed = amount <= remaining;

      return { allowed, remaining };
    } catch (error) {
      console.error('Daily limit check error:', error);
      return { allowed: false, remaining: 0 };
    }
  }

  /**
   * Update daily transfer limits
   */
  private static updateDailyLimit(userId: string, amount: number): void {
    try {
      const today = new Date().toDateString();
      const dailyLimits = JSON.parse(localStorage.getItem('dailyTransferLimits') || '{}');
      
      if (!dailyLimits[userId] || dailyLimits[userId].date !== today) {
        dailyLimits[userId] = { date: today, used: 0 };
      }
      
      dailyLimits[userId].used += amount;
      localStorage.setItem('dailyTransferLimits', JSON.stringify(dailyLimits));
    } catch (error) {
      console.error('Daily limit update error:', error);
    }
  }

  /**
   * Execute atomic transfer with proper locking
   */
  private static async executeAtomicTransfer(request: TransferRequest): Promise<TransferResponse> {
    const lockKey = `${request.fromAccountId}-${request.toAccountNumber}`;
    
    // Prevent concurrent transfers on same accounts
    if (this.transferLocks.has(lockKey)) {
      await this.transferLocks.get(lockKey);
    }

    const transferPromise = this.performTransfer(request);
    this.transferLocks.set(lockKey, transferPromise);

    try {
      const result = await transferPromise;
      return result;
    } finally {
      this.transferLocks.delete(lockKey);
    }
  }

  /**
   * Perform the actual transfer operation
   */
  private static async performTransfer(request: TransferRequest): Promise<TransferResponse> {
    try {
      // Get current data
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');

      // Find source account
      let sourceUser: User | null = null;
      let sourceAccount: BankAccount | null = null;
      
      for (const user of users) {
        const account = user.accounts?.find((acc: BankAccount) => acc.id === request.fromAccountId);
        if (account) {
          sourceUser = user;
          sourceAccount = account;
          break;
        }
      }

      if (!sourceAccount || !sourceUser) {
        return {
          success: false,
          message: 'Source account not found',
          error: {
            code: 'SOURCE_ACCOUNT_NOT_FOUND',
            message: 'Source account does not exist'
          }
        };
      }

      // Find destination account
      let destinationUser: User | null = null;
      let destinationAccount: BankAccount | null = null;
      
      for (const user of users) {
        const account = user.accounts?.find((acc: BankAccount) => acc.accountNumber === request.toAccountNumber);
        if (account) {
          destinationUser = user;
          destinationAccount = account;
          break;
        }
      }

      if (!destinationAccount || !destinationUser) {
        return {
          success: false,
          message: 'Destination account not found',
          error: {
            code: 'DESTINATION_ACCOUNT_NOT_FOUND',
            message: 'Destination account does not exist'
          }
        };
      }

      // Check for self-transfer
      if (sourceAccount.accountNumber === destinationAccount.accountNumber) {
        return {
          success: false,
          message: 'Cannot transfer to the same account',
          error: {
            code: 'SELF_TRANSFER_NOT_ALLOWED',
            message: 'Source and destination accounts cannot be the same'
          }
        };
      }

      // Check sufficient funds
      if (sourceAccount.balance < request.amount) {
        return {
          success: false,
          message: `Insufficient funds. Available: $${sourceAccount.balance.toFixed(2)}`,
          error: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Not enough balance in source account',
            details: { available: sourceAccount.balance, requested: request.amount }
          }
        };
      }

      // Perform atomic balance updates
      const newSourceBalance = Math.round((sourceAccount.balance - request.amount) * 100) / 100;
      const newDestinationBalance = Math.round((destinationAccount.balance + request.amount) * 100) / 100;

      // Update balances
      sourceAccount.balance = newSourceBalance;
      destinationAccount.balance = newDestinationBalance;

      // Create transaction record
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newTransaction: Transaction = {
        id: transactionId,
        fromAccountNumber: sourceAccount.accountNumber,
        toAccountNumber: destinationAccount.accountNumber,
        amount: request.amount,
        description: request.description || 'Money transfer',
        timestamp: new Date(),
        type: 'debit'
      };

      transactions.push(newTransaction);

      // Save all changes atomically
      localStorage.setItem('bankingUsers', JSON.stringify(users));
      localStorage.setItem('transactions', JSON.stringify(transactions));

      // Update current user session if applicable
      const currentUser = JSON.parse(localStorage.getItem('bankingUser') || 'null');
      if (currentUser) {
        // Update the current user session with the latest account balances
        if (currentUser.id === sourceUser.id) {
          localStorage.setItem('bankingUser', JSON.stringify(sourceUser));
        } else if (currentUser.id === destinationUser.id) {
          localStorage.setItem('bankingUser', JSON.stringify(destinationUser));
        }
      }

      return {
        success: true,
        transactionId,
        message: `Successfully transferred $${request.amount.toFixed(2)} to account ${request.toAccountNumber}`,
        newBalance: newSourceBalance
      };

    } catch (error) {
      console.error('Transfer execution error:', error);
      return {
        success: false,
        message: 'Transfer failed due to system error',
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute transfer'
        }
      };
    }
  }

  /**
   * Create audit log entry
   */
  private static createAuditLog(
    request: TransferRequest, 
    action: AuditLog['action'], 
    errorCode?: string
  ): AuditLog {
    return {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      action,
      fromAccount: request.fromAccountId,
      toAccount: request.toAccountNumber,
      amount: request.amount,
      timestamp: new Date(),
      errorCode,
      metadata: {
        description: request.description,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
      }
    };
  }

  /**
   * Save audit log
   */
  private static saveAuditLog(auditLog: AuditLog): void {
    try {
      const auditLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      auditLogs.push(auditLog);
      
      // Keep only last 1000 audit logs to prevent storage bloat
      if (auditLogs.length > 1000) {
        auditLogs.splice(0, auditLogs.length - 1000);
      }
      
      localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
    } catch (error) {
      console.error('Failed to save audit log:', error);
    }
  }

  /**
   * Sanitize user input to prevent XSS
   */
  private static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Get transfer history for audit purposes
   */
  static getTransferHistory(userId: string, limit: number = 50): AuditLog[] {
    try {
      const auditLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      return auditLogs
        .filter((log: AuditLog) => log.userId === userId)
        .sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get transfer history:', error);
      return [];
    }
  }

  /**
   * Get system health metrics
   */
  static getSystemMetrics(): any {
    try {
      const auditLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentLogs = auditLogs.filter((log: AuditLog) => 
        new Date(log.timestamp) > oneHourAgo
      );

      const successCount = recentLogs.filter((log: AuditLog) => 
        log.action === 'TRANSFER_SUCCESS'
      ).length;

      const failureCount = recentLogs.filter((log: AuditLog) => 
        log.action === 'TRANSFER_FAILED'
      ).length;

      return {
        totalTransfers: recentLogs.length,
        successfulTransfers: successCount,
        failedTransfers: failureCount,
        successRate: recentLogs.length > 0 ? (successCount / recentLogs.length) * 100 : 0,
        activeLocks: this.transferLocks.size,
        rateLimitEntries: this.rateLimitMap.size
      };
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      return null;
    }
  }
}