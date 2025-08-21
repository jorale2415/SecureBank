import React, { useState } from 'react';
import { Send, DollarSign, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AccountDropdown from './AccountDropdown';

export default function TransferForm() {
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, activeAccount, updateBalance, getAllAccountNumbers } = useAuth();
  const { addNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !activeAccount) return;

    setIsLoading(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const transferAmount = parseFloat(amount);
    const allAccountNumbers = getAllAccountNumbers();

    // Validate recipient account exists in system
    if (!allAccountNumbers.includes(recipientAccount)) {
      addNotification('Recipient account not found in system', 'error');
      setIsLoading(false);
      return;
    }
    // BUG #1: Transfer to self should be blocked but isn't
    // This check is commented out
    // if (recipientAccount === activeAccount.accountNumber) {
    //   addNotification('Cannot transfer to your own account', 'error');
    //   setIsLoading(false);
    //   return;
    // }

    // BUG #2: Negative transfer amounts are accepted
    // The check below is commented out
    // if (transferAmount <= 0) {
    //   addNotification('Transfer amount must be positive', 'error');
    //   setIsLoading(false);
    //   return;
    // }

    if (transferAmount > activeAccount.balance) {
      addNotification('Insufficient funds', 'error');
      setIsLoading(false);
      return;
    }

    // Process transfer
    const newBalance = activeAccount.balance - transferAmount;
    updateBalance(activeAccount.id, newBalance);

    // Save transaction
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const newTransaction = {
      id: Date.now().toString(),
      fromAccountNumber: activeAccount.accountNumber,
      toAccountNumber: recipientAccount,
      amount: transferAmount,
      description: description || 'Money transfer',
      timestamp: new Date(),
      type: 'debit'
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
                min="0"
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
          <div className="flex justify-between items-center pt-4 border-t space-x-4 overflow-hidden">
            <div className="text-sm text-gray-600 whitespace-nowrap min-w-0 flex-shrink-0">
              Transfer fee: $0.00
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center whitespace-nowrap"
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