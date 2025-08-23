import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Filter, ArrowUpDown, Clock, Search, X, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../context/AuthContext';

interface EnhancedTransaction extends Transaction {
  senderName?: string;
  receiverName?: string;
  transactionType: 'Incoming' | 'Outgoing' | 'Internal Transfer';
}

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<EnhancedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, activeAccount } = useAuth();

  // Filter states
  const [filters, setFilters] = useState({
    accountFilter: 'current', // 'current', 'all', or specific account ID
    senderFilter: '',
    receiverFilter: '',
    dateFrom: '',
    dateTo: '',
    transactionType: 'all' // 'all', 'Incoming', 'Outgoing', 'Internal Transfer'
  });

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof EnhancedTransaction;
    direction: 'asc' | 'desc';
  }>({ key: 'timestamp', direction: 'desc' });

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, activeAccount]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  // BUG #9: Transaction history loads all at once without pagination (simulated slow load)
  const loadTransactions = async () => {
    setIsLoading(true);
    
    // Reduced loading time for better user experience
    await new Promise(resolve => setTimeout(resolve, 800));
    
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

    // Get transactions based on current filter
    let relevantTransactions = [];
    
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

    // Enhance transactions with sender/receiver names and transaction types
    const enhancedTransactions: EnhancedTransaction[] = relevantTransactions.map((t: any) => {
      const senderInfo = accountToUserMap.get(t.fromAccountNumber);
      const receiverInfo = accountToUserMap.get(t.toAccountNumber);
      
      // Determine transaction type
      let transactionType: 'Incoming' | 'Outgoing' | 'Internal Transfer';
      const isUserSender = user?.accounts?.some(acc => acc.accountNumber === t.fromAccountNumber);
      const isUserReceiver = user?.accounts?.some(acc => acc.accountNumber === t.toAccountNumber);
      
      if (isUserSender && isUserReceiver) {
        transactionType = 'Internal Transfer';
      } else if (isUserSender) {
        transactionType = 'Outgoing';
      } else {
        transactionType = 'Incoming';
      }

      return {
        ...t,
        timestamp: new Date(t.timestamp),
        senderName: senderInfo ? `${senderInfo.firstName} ${senderInfo.lastName}` : 'Unknown',
        receiverName: receiverInfo ? `${receiverInfo.firstName} ${receiverInfo.lastName}` : 'Unknown',
        transactionType,
        type: transactionType === 'Incoming' ? 'credit' : 'debit'
      };
    });

    // BUG #3: Transaction history shows transfers in wrong order (newest last instead of first)
    // Sort transactions by timestamp in descending order (newest first)
    const sortedTransactions = enhancedTransactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setTransactions(sortedTransactions);
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply sender filter
    if (filters.senderFilter.trim()) {
      filtered = filtered.filter(t => 
        t.senderName?.toLowerCase().includes(filters.senderFilter.toLowerCase()) ||
        t.fromAccountNumber.includes(filters.senderFilter)
      );
    }

    // Apply receiver filter
    if (filters.receiverFilter.trim()) {
      filtered = filtered.filter(t => 
        t.receiverName?.toLowerCase().includes(filters.receiverFilter.toLowerCase()) ||
        t.toAccountNumber.includes(filters.receiverFilter)
      );
    }

    // Apply transaction type filter
    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(t => t.transactionType === filters.transactionType);
    }

    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(t => t.timestamp >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(t => t.timestamp <= toDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTransactions(filtered);
  };

  const handleSort = (key: keyof EnhancedTransaction) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({
      accountFilter: 'current',
      senderFilter: '',
      receiverFilter: '',
      dateFrom: '',
      dateTo: '',
      transactionType: 'all'
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Reload transactions if account filter changes
    if (key === 'accountFilter') {
      loadTransactions();
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Please Log In</h3>
        <p className="text-gray-600">You need to be logged in to view transaction history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
          <div className="flex items-center mt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm transition-colors duration-200"
              aria-label="Go back to dashboard"
            >
              <ArrowUpDown className="h-4 w-4 mr-1 rotate-180" />
              Back to Dashboard
            </button>
          </div>
          <p className="text-gray-600 mt-1">
            {filters.accountFilter === 'all' 
              ? 'All Accounts' 
              : `${activeAccount?.accountName} (****${activeAccount?.accountNumber.slice(-4)})`
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={loadTransactions}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Account Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account
              </label>
              <select
                value={filters.accountFilter}
                onChange={(e) => handleFilterChange('accountFilter', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="current">Current Account</option>
                <option value="all">All Accounts</option>
                {user.accounts?.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.accountName} (****{account.accountNumber.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            {/* Sender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sender
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.senderFilter}
                  onChange={(e) => handleFilterChange('senderFilter', e.target.value)}
                  placeholder="Search by sender name or account"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {filters.senderFilter && (
                  <button
                    onClick={() => handleFilterChange('senderFilter', '')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Receiver Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receiver
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.receiverFilter}
                  onChange={(e) => handleFilterChange('receiverFilter', e.target.value)}
                  placeholder="Search by receiver name or account"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {filters.receiverFilter && (
                  <button
                    onClick={() => handleFilterChange('receiverFilter', '')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <select
                value={filters.transactionType}
                onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="Incoming">Incoming</option>
                <option value="Outgoing">Outgoing</option>
                <option value="Internal Transfer">Internal Transfer</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Loading transactions...</span>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {!isLoading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <ArrowUpDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">
                {transactions.length === 0 
                  ? 'Your transaction history will appear here.' 
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => handleSort('timestamp')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        Date & Time
                        <ArrowUpDown className="h-3 w-3 ml-1" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('senderName')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        Sender
                        <ArrowUpDown className="h-3 w-3 ml-1" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('receiverName')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        Receiver
                        <ArrowUpDown className="h-3 w-3 ml-1" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit/Debit
                    </th>
                    <th 
                      onClick={() => handleSort('amount')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        Amount
                        <ArrowUpDown className="h-3 w-3 ml-1" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('transactionType')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        Transaction Type
                        <ArrowUpDown className="h-3 w-3 ml-1" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
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
                          <div className="font-medium">{transaction.senderName}</div>
                          <div className="text-xs text-gray-500">
                            ****{transaction.fromAccountNumber?.slice(-4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{transaction.receiverName}</div>
                          <div className="text-xs text-gray-500">
                            ****{transaction.toAccountNumber?.slice(-4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'credit' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'credit' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.transactionType === 'Incoming' ? 'bg-blue-100 text-blue-800' :
                          transaction.transactionType === 'Outgoing' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {transaction.transactionType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}