import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { BankAccount, Transaction, User } from '../context/AuthContext';

export interface StatementRequest {
  userId: string;
  accountId: string;
  dateFrom: Date;
  dateTo: Date;
  format: 'pdf' | 'csv' | 'excel';
  includeTransactions: boolean;
  emailDelivery?: {
    enabled: boolean;
    email?: string;
  };
}

export interface StatementData {
  account: BankAccount;
  user: User;
  transactions: Transaction[];
  dateRange: {
    from: Date;
    to: Date;
  };
  summary: {
    openingBalance: number;
    closingBalance: number;
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
  };
  generatedAt: Date;
}

export class StatementService {
  private static readonly BANK_NAME = 'SecureBank';
  private static readonly BANK_ADDRESS = '123 Financial District, Banking City, BC 12345';
  private static readonly BANK_PHONE = '1-800-SECURE-1';
  private static readonly BANK_EMAIL = 'statements@securebank.com';

  /**
   * Generate account statement in specified format
   */
  static async generateStatement(request: StatementRequest): Promise<{
    success: boolean;
    data?: Blob;
    filename?: string;
    message: string;
  }> {
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Invalid request'
        };
      }

      // Gather statement data
      const statementData = await this.gatherStatementData(request);
      if (!statementData) {
        return {
          success: false,
          message: 'Unable to gather statement data'
        };
      }

      // Generate statement based on format
      let result;
      switch (request.format) {
        case 'pdf':
          result = await this.generatePDFStatement(statementData);
          break;
        case 'csv':
          result = await this.generateCSVStatement(statementData);
          break;
        case 'excel':
          result = await this.generateExcelStatement(statementData);
          break;
        default:
          return {
            success: false,
            message: 'Unsupported format'
          };
      }

      // Handle email delivery if requested
      if (request.emailDelivery?.enabled && request.emailDelivery.email) {
        await this.sendStatementByEmail(request.emailDelivery.email, result, statementData);
      }

      return {
        success: true,
        data: result.blob,
        filename: result.filename,
        message: `Statement generated successfully${request.emailDelivery?.enabled ? ' and sent by email' : ''}`
      };

    } catch (error) {
      console.error('Statement generation error:', error);
      return {
        success: false,
        message: 'Failed to generate statement due to system error'
      };
    }
  }

  /**
   * Validate statement request
   */
  private static validateRequest(request: StatementRequest): { isValid: boolean; error?: string } {
    if (!request.userId || !request.accountId) {
      return { isValid: false, error: 'User ID and Account ID are required' };
    }

    if (!request.dateFrom || !request.dateTo) {
      return { isValid: false, error: 'Date range is required' };
    }

    if (request.dateFrom > request.dateTo) {
      return { isValid: false, error: 'From date cannot be after To date' };
    }

    const daysDiff = Math.ceil((request.dateTo.getTime() - request.dateFrom.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return { isValid: false, error: 'Date range cannot exceed 365 days' };
    }

    if (!['pdf', 'csv', 'excel'].includes(request.format)) {
      return { isValid: false, error: 'Invalid format specified' };
    }

    if (request.emailDelivery?.enabled && !request.emailDelivery.email) {
      return { isValid: false, error: 'Email address required for email delivery' };
    }

    return { isValid: true };
  }

  /**
   * Gather all data needed for statement generation
   */
  private static async gatherStatementData(request: StatementRequest): Promise<StatementData | null> {
    try {
      // Get user and account data
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      const user = users.find((u: User) => u.id === request.userId);
      if (!user) return null;

      const account = user.accounts?.find(acc => acc.id === request.accountId);
      if (!account) return null;

      // Get transactions within date range
      const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      const accountTransactions = allTransactions.filter((t: any) => {
        const transactionDate = new Date(t.timestamp);
        return (t.fromAccountNumber === account.accountNumber || t.toAccountNumber === account.accountNumber) &&
               transactionDate >= request.dateFrom &&
               transactionDate <= request.dateTo;
      }).map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp)
      }));

      // Sort transactions by date (oldest first for statement)
      accountTransactions.sort((a: Transaction, b: Transaction) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      // Calculate summary
      let totalCredits = 0;
      let totalDebits = 0;
      
      accountTransactions.forEach((t: Transaction) => {
        if (t.toAccountNumber === account.accountNumber) {
          totalCredits += t.amount;
        } else {
          totalDebits += t.amount;
        }
      });

      // Calculate opening balance (current balance minus net change)
      const netChange = totalCredits - totalDebits;
      const openingBalance = account.balance - netChange;

      return {
        account,
        user,
        transactions: accountTransactions,
        dateRange: {
          from: request.dateFrom,
          to: request.dateTo
        },
        summary: {
          openingBalance,
          closingBalance: account.balance,
          totalCredits,
          totalDebits,
          transactionCount: accountTransactions.length
        },
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Error gathering statement data:', error);
      return null;
    }
  }

  /**
   * Generate PDF statement
   */
  private static async generatePDFStatement(data: StatementData): Promise<{ blob: Blob; filename: string }> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // Add watermark
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(50);
    doc.text('OFFICIAL', pageWidth / 2, pageHeight / 2, { 
      align: 'center', 
      angle: 45 
    });

    // Reset color for content
    doc.setTextColor(0, 0, 0);

    // Header with bank branding
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(this.BANK_NAME, 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(this.BANK_ADDRESS, 20, yPosition);
    yPosition += 5;
    doc.text(`Phone: ${this.BANK_PHONE} | Email: ${this.BANK_EMAIL}`, 20, yPosition);

    // Statement title
    yPosition += 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT STATEMENT', 20, yPosition);

    // Account information
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Account Holder:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.user.firstName} ${data.user.lastName}`, 80, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Account Name:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.account.accountName, 80, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Account Number:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`****${data.account.accountNumber.slice(-4)}`, 80, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Statement Period:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.dateRange.from.toLocaleDateString()} - ${data.dateRange.to.toLocaleDateString()}`, 80, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Generated On:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.generatedAt.toLocaleString(), 80, yPosition);

    // Account summary
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT SUMMARY', 20, yPosition);

    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Opening Balance:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${data.summary.openingBalance.toFixed(2)}`, 80, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Credits:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${data.summary.totalCredits.toFixed(2)}`, 80, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Debits:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${data.summary.totalDebits.toFixed(2)}`, 80, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Closing Balance:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${data.summary.closingBalance.toFixed(2)}`, 80, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Transactions:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.summary.transactionCount.toString(), 80, yPosition);

    // Transaction details
    if (data.transactions.length > 0) {
      yPosition += 20;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TRANSACTION DETAILS', 20, yPosition);

      yPosition += 10;
      doc.setFontSize(9);
      
      // Table headers
      doc.setFont('helvetica', 'bold');
      doc.text('Date', 20, yPosition);
      doc.text('Description', 50, yPosition);
      doc.text('Debit', 120, yPosition);
      doc.text('Credit', 150, yPosition);
      doc.text('Balance', 170, yPosition);

      yPosition += 5;
      doc.line(20, yPosition, 190, yPosition); // Header line

      // Transaction rows
      doc.setFont('helvetica', 'normal');
      let runningBalance = data.summary.openingBalance;

      for (const transaction of data.transactions) {
        yPosition += 8;
        
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
          
          // Repeat headers on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Date', 20, yPosition);
          doc.text('Description', 50, yPosition);
          doc.text('Debit', 120, yPosition);
          doc.text('Credit', 150, yPosition);
          doc.text('Balance', 170, yPosition);
          yPosition += 5;
          doc.line(20, yPosition, 190, yPosition);
          yPosition += 8;
          doc.setFont('helvetica', 'normal');
        }

        const isCredit = transaction.toAccountNumber === data.account.accountNumber;
        if (isCredit) {
          runningBalance += transaction.amount;
        } else {
          runningBalance -= transaction.amount;
        }

        doc.text(transaction.timestamp.toLocaleDateString(), 20, yPosition);
        doc.text(transaction.description || 'Transfer', 50, yPosition);
        
        if (isCredit) {
          doc.text(`$${transaction.amount.toFixed(2)}`, 150, yPosition);
        } else {
          doc.text(`$${transaction.amount.toFixed(2)}`, 120, yPosition);
        }
        
        doc.text(`$${runningBalance.toFixed(2)}`, 170, yPosition);
      }
    }

    // Footer with digital signature
    const finalY = Math.max(yPosition + 30, pageHeight - 40);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('This is an official statement generated electronically by SecureBank.', 20, finalY);
    doc.text(`Digital Signature: SB-${data.generatedAt.getTime()}-${data.account.id.slice(-6)}`, 20, finalY + 5);
    doc.text('For verification, contact SecureBank customer service.', 20, finalY + 10);

    const pdfBlob = doc.output('blob');
    const filename = `statement_${data.account.accountNumber}_${data.dateRange.from.toISOString().split('T')[0]}_${data.dateRange.to.toISOString().split('T')[0]}.pdf`;

    return { blob: pdfBlob, filename };
  }

  /**
   * Generate CSV statement
   */
  private static async generateCSVStatement(data: StatementData): Promise<{ blob: Blob; filename: string }> {
    const csvRows = [];
    
    // Header information
    csvRows.push([this.BANK_NAME]);
    csvRows.push([this.BANK_ADDRESS]);
    csvRows.push([`Phone: ${this.BANK_PHONE}`]);
    csvRows.push(['']);
    csvRows.push(['ACCOUNT STATEMENT']);
    csvRows.push(['']);
    csvRows.push(['Account Holder', `${data.user.firstName} ${data.user.lastName}`]);
    csvRows.push(['Account Name', data.account.accountName]);
    csvRows.push(['Account Number', `****${data.account.accountNumber.slice(-4)}`]);
    csvRows.push(['Statement Period', `${data.dateRange.from.toLocaleDateString()} - ${data.dateRange.to.toLocaleDateString()}`]);
    csvRows.push(['Generated On', data.generatedAt.toLocaleString()]);
    csvRows.push(['']);
    
    // Account summary
    csvRows.push(['ACCOUNT SUMMARY']);
    csvRows.push(['Opening Balance', `$${data.summary.openingBalance.toFixed(2)}`]);
    csvRows.push(['Total Credits', `$${data.summary.totalCredits.toFixed(2)}`]);
    csvRows.push(['Total Debits', `$${data.summary.totalDebits.toFixed(2)}`]);
    csvRows.push(['Closing Balance', `$${data.summary.closingBalance.toFixed(2)}`]);
    csvRows.push(['Total Transactions', data.summary.transactionCount.toString()]);
    csvRows.push(['']);
    
    // Transaction details
    if (data.transactions.length > 0) {
      csvRows.push(['TRANSACTION DETAILS']);
      csvRows.push(['Date', 'Time', 'Description', 'From Account', 'To Account', 'Debit', 'Credit', 'Running Balance']);
      
      let runningBalance = data.summary.openingBalance;
      
      for (const transaction of data.transactions) {
        const isCredit = transaction.toAccountNumber === data.account.accountNumber;
        if (isCredit) {
          runningBalance += transaction.amount;
        } else {
          runningBalance -= transaction.amount;
        }
        
        csvRows.push([
          transaction.timestamp.toLocaleDateString(),
          transaction.timestamp.toLocaleTimeString(),
          transaction.description || 'Transfer',
          `****${transaction.fromAccountNumber.slice(-4)}`,
          `****${transaction.toAccountNumber.slice(-4)}`,
          isCredit ? '' : `$${transaction.amount.toFixed(2)}`,
          isCredit ? `$${transaction.amount.toFixed(2)}` : '',
          `$${runningBalance.toFixed(2)}`
        ]);
      }
    }
    
    // Footer
    csvRows.push(['']);
    csvRows.push(['This is an official statement generated electronically by SecureBank.']);
    csvRows.push([`Digital Signature: SB-${data.generatedAt.getTime()}-${data.account.id.slice(-6)}`]);
    
    const csvContent = csvRows.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `statement_${data.account.accountNumber}_${data.dateRange.from.toISOString().split('T')[0]}_${data.dateRange.to.toISOString().split('T')[0]}.csv`;
    
    return { blob: csvBlob, filename };
  }

  /**
   * Generate Excel statement
   */
  private static async generateExcelStatement(data: StatementData): Promise<{ blob: Blob; filename: string }> {
    const workbook = XLSX.utils.book_new();
    
    // Account Information Sheet
    const accountInfoData = [
      [this.BANK_NAME],
      [this.BANK_ADDRESS],
      [`Phone: ${this.BANK_PHONE}`],
      [''],
      ['ACCOUNT STATEMENT'],
      [''],
      ['Account Holder', `${data.user.firstName} ${data.user.lastName}`],
      ['Account Name', data.account.accountName],
      ['Account Number', `****${data.account.accountNumber.slice(-4)}`],
      ['Statement Period', `${data.dateRange.from.toLocaleDateString()} - ${data.dateRange.to.toLocaleDateString()}`],
      ['Generated On', data.generatedAt.toLocaleString()],
      [''],
      ['ACCOUNT SUMMARY'],
      ['Opening Balance', data.summary.openingBalance],
      ['Total Credits', data.summary.totalCredits],
      ['Total Debits', data.summary.totalDebits],
      ['Closing Balance', data.summary.closingBalance],
      ['Total Transactions', data.summary.transactionCount]
    ];
    
    const accountInfoSheet = XLSX.utils.aoa_to_sheet(accountInfoData);
    XLSX.utils.book_append_sheet(workbook, accountInfoSheet, 'Account Summary');
    
    // Transactions Sheet
    if (data.transactions.length > 0) {
      const transactionData = [
        ['Date', 'Time', 'Description', 'From Account', 'To Account', 'Debit', 'Credit', 'Running Balance']
      ];
      
      let runningBalance = data.summary.openingBalance;
      
      for (const transaction of data.transactions) {
        const isCredit = transaction.toAccountNumber === data.account.accountNumber;
        if (isCredit) {
          runningBalance += transaction.amount;
        } else {
          runningBalance -= transaction.amount;
        }
        
        transactionData.push([
          transaction.timestamp.toLocaleDateString(),
          transaction.timestamp.toLocaleTimeString(),
          transaction.description || 'Transfer',
          `****${transaction.fromAccountNumber.slice(-4)}`,
          `****${transaction.toAccountNumber.slice(-4)}`,
          isCredit ? '' : transaction.amount,
          isCredit ? transaction.amount : '',
          runningBalance
        ]);
      }
      
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');
    }
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `statement_${data.account.accountNumber}_${data.dateRange.from.toISOString().split('T')[0]}_${data.dateRange.to.toISOString().split('T')[0]}.xlsx`;
    
    return { blob: excelBlob, filename };
  }

  /**
   * Send statement by email (simulated)
   */
  private static async sendStatementByEmail(
    email: string, 
    statementFile: { blob: Blob; filename: string }, 
    data: StatementData
  ): Promise<void> {
    // In a real application, this would integrate with an email service
    // For demo purposes, we'll simulate the email sending
    
    console.log(`Simulating email delivery to: ${email}`);
    console.log(`Statement file: ${statementFile.filename}`);
    console.log(`File size: ${(statementFile.blob.size / 1024).toFixed(2)} KB`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log email delivery for audit purposes
    const emailLog = {
      id: `email_${Date.now()}`,
      recipient: email,
      subject: `Account Statement - ${data.account.accountName}`,
      filename: statementFile.filename,
      fileSize: statementFile.blob.size,
      sentAt: new Date(),
      accountId: data.account.id,
      userId: data.user.id
    };
    
    const emailLogs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
    emailLogs.push(emailLog);
    localStorage.setItem('emailLogs', JSON.stringify(emailLogs));
  }

  /**
   * Get available statement formats
   */
  static getAvailableFormats(): Array<{ value: string; label: string; description: string }> {
    return [
      {
        value: 'pdf',
        label: 'PDF',
        description: 'Professional format with bank branding and digital signature'
      },
      {
        value: 'csv',
        label: 'CSV',
        description: 'Comma-separated values for spreadsheet applications'
      },
      {
        value: 'excel',
        label: 'Excel',
        description: 'Microsoft Excel format with multiple sheets'
      }
    ];
  }

  /**
   * Get email delivery history
   */
  static getEmailDeliveryHistory(userId: string): any[] {
    try {
      const emailLogs = JSON.parse(localStorage.getItem('emailLogs') || '[]');
      return emailLogs
        .filter((log: any) => log.userId === userId)
        .sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    } catch (error) {
      console.error('Error getting email delivery history:', error);
      return [];
    }
  }
}