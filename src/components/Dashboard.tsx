import React from 'react';
import { DollarSign, TrendingUp, ArrowUpDown, Clock, CreditCard, Plus, ArrowRight } from 'lucide-react';
import { useAuth, Transaction } from '../context/AuthContext';
import AddAccountForm from './AddAccountForm';

export default function Dashboard() {
  const { user, activeAccount, switchAccount } = useAuth();
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [emergencyMode, setEmergencyMode] = React.useState(false);
  const [recentTransactions, setRecentTransactions] = React.useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = React.useState(true);

  // Check for emergency mode
  React.useEffect(() => {
    const isEmergency = localStorage.getItem('EMERGENCY_MODE') === 'true';
    setEmergencyMode(isEmergency);
  }, []);

  // Load real transactions
  React.useEffect(() => {
    if (user && activeAccount) {
      loadRecentTransactions();
    }
  }, [user, activeAccount]);

  const loadRecentTransactions = async () => {
    setIsLoadingTransactions(true);
    
    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      
      // Create a map of account numbers to user info for quick lookup
      const accountToUserMap = new Map();
      users.forEach((u: any) => {
        if (u.accounts) {
          u.accounts.forEach((acc: any) => {
            accountToUserMap.set(acc.accountNumber, {
              firstName: u.firstName,
              lastName: u.lastName,
              accountName: acc.accountName
            });
          });
        }
      });

      // Get transactions for active account
      let relevantTransactions;
      
      if (filters.accountFilter === 'all') {
        // Show all transactions for all user's accounts
        relevantTransactions = allTransactions.filter((t: Transaction) => 
          user?.accounts?.some(acc => 
            t.fromAccountNumber === acc.accountNumber || t.toAccountNumber === acc.accountNumber
          )
        );
      } else {
        // Show transactions for active account only
        relevantTransactions = allTransactions.filter((t: Transaction) => 
          t.fromAccountNumber === activeAccount?.accountNumber || t.toAccountNumber === activeAccount?.accountNumber
        );
      }

      // Enhance transactions with sender/receiver names
      const enhancedTransactions = relevantTransactions.map((t: any) => {
        const senderInfo = accountToUserMap.get(t.fromAccountNumber);
        const receiverInfo = accountToUserMap.get(t.toAccountNumber);
        
        // Determine transaction type and credit/debit from active account perspective
        const isUserSender = activeAccount?.accountNumber === t.fromAccountNumber;
        const isUserReceiver = activeAccount?.accountNumber === t.toAccountNumber;
        
        let creditDebitType: 'credit' | 'debit';
        
        if (isUserSender) {
          creditDebitType = 'debit'; // Money leaving user's account
        } else if (isUserReceiver) {
          creditDebitType = 'credit'; // Money coming into user's account
        } else {
          // For 'all accounts' view, determine based on which account is the user's
          const userAccountNumbers = user?.accounts?.map(acc => acc.accountNumber) || [];
          if (userAccountNumbers.includes(t.fromAccountNumber)) {
            creditDebitType = 'debit';
          } else {
            creditDebitType = 'credit';
          }
        }
        
        return {
          ...t,
          timestamp: new Date(t.timestamp),
          senderName: senderInfo ? `${senderInfo.firstName} ${senderInfo.lastName}` : 'External Account',
          receiverName: receiverInfo ? `${receiverInfo.firstName} ${receiverInfo.lastName}` : 'External Account',
          creditDebitType,
          transactionType: 'Internal Transfer' as const
        };
      });

      // Sort by timestamp (newest first) and take only the 3 most recent
      const sortedTransactions = enhancedTransactions
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 3);

      setRecentTransactions(sortedTransactions);
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
      setRecentTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  if (!user) return null;

  // Emergency mode banner
  if (emergencyMode) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">System Emergency Mode</h2>
          <p className="text-red-700 mb-4">
            All financial operations have been temporarily suspended for security reasons.
          </p>
          <p className="text-sm text-red-600">
            Please contact system administrator immediately.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-gray-600">Here's what's happening with your accounts.</p>
      </div>

      {/* Account Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Your Accounts</h3>
          <button 
            onClick={() => setShowAddAccount(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Account
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(user?.accounts || []).map((account) => (
            <div
              key={account.id}
              onClick={() => switchAccount(account.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all w-full ${
                account.id === user.activeAccountId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center mb-2">
                <CreditCard className={`h-5 w-5 mr-2 ${
                  account.id === user.activeAccountId ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className="font-medium text-gray-900">{account.accountName}</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                ****{account.accountNumber.slice(-4)}
              </p>
              <p className="text-lg font-bold text-gray-900">
                ${account.balance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {account.accountType} Account
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Account Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                ${activeAccount?.balance.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-500">
                {activeAccount?.accountName}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Account Number</p>
              <p className="text-xl font-bold text-gray-900">
                ****{activeAccount?.accountNumber.slice(-4)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowUpDown className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Quick Transfer</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'transfer' }))}
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm transition-colors duration-200"
                aria-label="Go to transfer money page"
              >
                Send Money
                <ArrowRight className="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'history' }))}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label="View all transactions in history page"
            >
              View All
              <ArrowUpDown className="ml-1.5 h-4 w-4" />
            </button>
          </div>
        </div>
        
        {isLoadingTransactions ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <span className="text-gray-600">Loading recent transactions...</span>
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <ArrowUpDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recent transactions</h3>
            <p className="text-gray-600 mb-4">Your recent transactions will appear here.</p>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'transfer' }))}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label="Start your first money transfer"
            >
              Make Your First Transfer
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receiver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit/Debit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => {
                  const enhancedTransaction = transaction as any;

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div>{transaction.timestamp.toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              {transaction.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{(transaction as any).senderName}</div>
                          <div className="text-xs text-gray-500">
                            ****{(transaction as any).fromAccountNumber?.slice(-4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{(transaction as any).receiverName}</div>
                          <div className="text-xs text-gray-500">
                            ****{(transaction as any).toAccountNumber?.slice(-4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          enhancedTransaction.creditDebitType === 'credit' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {enhancedTransaction.creditDebitType === 'credit' ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={enhancedTransaction.creditDebitType === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {enhancedTransaction.creditDebitType === 'credit' ? '+' : '-'}${Math.abs((transaction as any).amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          {enhancedTransaction.transactionType}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddAccount && (
        <AddAccountForm onClose={() => setShowAddAccount(false)} />
      )}
    </div>
  );
}