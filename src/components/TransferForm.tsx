import React, { useState } from 'react';
import { Send, DollarSign, AlertCircle, Shield, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AccountDropdown from './AccountDropdown';
import { TransferService, TransferRequest } from '../services/TransferService';

export default function TransferForm() {
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const { user, activeAccount, updateBalance } = useAuth();
  const { addNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !activeAccount) return;

    setIsLoading(true);

    try {
      const transferRequest: TransferRequest = {
        fromAccountId: activeAccount.id,
        toAccountNumber: recipientAccount,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        userId: user.id
      };

      const result = await TransferService.executeTransfer(transferRequest);

      if (result.success) {
        addNotification(result.message, 'success');
        
        // Update local balance
        if (result.newBalance !== undefined) {
          updateBalance(activeAccount.id, result.newBalance);
        }
        
        // Reset form
        setRecipientAccount('');
        setAmount('');
        setDescription('');
      } else {
        addNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      addNotification('System error occurred. Please try again later.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getDailyLimitInfo = () => {
    try {
      const today = new Date().toDateString();
      const dailyLimits = JSON.parse(localStorage.getItem('dailyTransferLimits') || '{}');
      const userLimit = dailyLimits[user?.id] || { date: today, used: 0 };
      
      if (userLimit.date !== today) {
        return { used: 0, remaining: 50000 };
      }
      
      return { used: userLimit.used, remaining: 50000 - userLimit.used };
    } catch {
      return { used: 0, remaining: 50000 };
    }
  };

  const getRateLimitInfo = () => {
    // This would typically come from the service, but for demo purposes
    return { remaining: 8, resetTime: '45 seconds' };
  };

  const limitInfo = getDailyLimitInfo();
  const rateLimitInfo = getRateLimitInfo();

  if (!activeAccount) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Account</h3>
          <p className="text-gray-600">Please select an account from the dashboard to make transfers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Security & Limits Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">Secure Transfer System</span>
          </div>
          <button
            onClick={() => setShowLimits(!showLimits)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showLimits ? 'Hide' : 'Show'} Limits
          </button>
        </div>
        
        {showLimits && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-green-600 mr-2" />
              <div>
                <div className="font-medium text-gray-900">Daily Limit</div>
                <div className="text-gray-600">${limitInfo.remaining.toLocaleString()} remaining</div>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-600 mr-2" />
              <div>
                <div className="font-medium text-gray-900">Rate Limit</div>
                <div className="text-gray-600">{rateLimitInfo.remaining} attempts left</div>
              </div>
            </div>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-purple-600 mr-2" />
              <div>
                <div className="font-medium text-gray-900">Max Amount</div>
                <div className="text-gray-600">$10,000 per transfer</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Transfer Money</h2>
          <p className="text-gray-600 mt-1">
            From: {activeAccount.accountName} (****{activeAccount.accountNumber.slice(-4)})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="recipientAccount" className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Account Number *
            </label>
            <AccountDropdown
              value={recipientAccount}
              onChange={setRecipientAccount}
              currentUserAccountNumber={activeAccount?.accountNumber}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be a valid 10-digit account number
            </p>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                max="10000"
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.value.includes('e') || target.value.includes('E')) {
                    target.value = target.value.replace(/[eE]/g, '');
                    setAmount(target.value);
                  }
                }}
                required
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>Available: ${activeAccount.balance.toFixed(2)}</span>
              <span>Min: $0.01 | Max: $10,000</span>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What's this for?"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/100 characters
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-4 border-t space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              <div>Transfer fee: $0.00</div>
              <div className="text-xs text-gray-500">All transfers are logged for security</div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !recipientAccount || !amount}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Transfer Money
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security Features */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Security Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            End-to-end encryption
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Real-time fraud detection
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Atomic transactions
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Comprehensive audit logging
          </div>
        </div>
      </div>
    </div>
  );
}

    };
    
    transactions.push(newTransaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    addNotification(`Successfully transferred $${transferAmount.toFixed(2)}`, 'success');
    
    // Reset form
    setRecipientAccount('');
    setAmount('');
    setDescription('');
    setIsLoading(false);
  };

  if (!activeAccount) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Account</h3>
          <p className="text-gray-600">Please select an account from the dashboard to make transfers.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Transfer Money</h2>
          <p className="text-gray-600 mt-1">
            From: {activeAccount.accountName} (****{activeAccount.accountNumber.slice(-4)})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="recipientAccount" className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Account Number
            </label>
            <AccountDropdown
              value={recipientAccount}
              onChange={setRecipientAccount}
              currentUserAccountNumber={activeAccount?.accountNumber}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                onInput={(e) => {
                  // Prevent scientific notation input
                  const target = e.target as HTMLInputElement;
                  if (target.value.includes('e') || target.value.includes('E')) {
                    target.value = target.value.replace(/[eE]/g, '');
                    setAmount(target.value);
                  }
                }}
                required
              />
            </div>
            {activeAccount && (
              <p className="text-sm text-gray-500 mt-1">
                Available balance: ${activeAccount.balance.toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What's this for?"
            />
          </div>

          {/* BUG #6: Mobile responsive layout breaks on transfer form */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-4 border-t space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              Transfer fee: $0.00
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Transfer Money
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}