import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, User, X } from 'lucide-react';

interface Account {
  accountNumber: string;
  accountName: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface AccountDropdownProps {
  value: string;
  onChange: (accountNumber: string) => void;
  currentUserAccountNumber?: string;
  className?: string;
}

export default function AccountDropdown({ 
  value, 
  onChange, 
  currentUserAccountNumber,
  className = "" 
}: AccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const ACCOUNTS_PER_PAGE = 100;

  // Load accounts from system
  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      const allAccounts: Account[] = [];
      
      users.forEach((user: any) => {
        if (user.accounts) {
          user.accounts.forEach((account: any) => {
            // Only include active accounts and exclude current user's account
            if (account.accountNumber !== currentUserAccountNumber) {
              allAccounts.push({
                accountNumber: account.accountNumber,
                accountName: account.accountName,
                firstName: user.firstName,
                lastName: user.lastName,
                isActive: true // Assuming all accounts are active for demo
              });
            }
          });
        }
      });
      
      // Sort alphabetically by account holder name
      allAccounts.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setAccounts(allAccounts);
      setFilteredAccounts(allAccounts);
    } catch (err) {
      setError('Failed to load accounts');
      console.error('Error loading accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter accounts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAccounts(accounts);
    } else {
      const filtered = accounts.filter(account => {
        const fullName = `${account.firstName} ${account.lastName}`.toLowerCase();
        const accountNumber = account.accountNumber.toLowerCase();
        const accountName = account.accountName.toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return fullName.includes(search) || 
               accountNumber.includes(search) || 
               accountName.includes(search);
      });
      setFilteredAccounts(filtered);
    }
    setCurrentPage(0);
  }, [searchTerm, accounts]);

  // Load accounts when component mounts or when dropdown opens
  useEffect(() => {
    if (isOpen && accounts.length === 0) {
      loadAccounts();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleAccountSelect = (accountNumber: string) => {
    onChange(accountNumber);
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearSelection = () => {
    onChange('');
    setSearchTerm('');
  };

  // Get display text for selected account
  const getSelectedAccountDisplay = () => {
    if (!value) return '';
    const selectedAccount = accounts.find(acc => acc.accountNumber === value);
    if (selectedAccount) {
      return `${selectedAccount.accountNumber} - ${selectedAccount.firstName} ${selectedAccount.lastName}`;
    }
    return value; // Fallback to just account number
  };

  // Get paginated accounts
  const paginatedAccounts = filteredAccounts.slice(
    currentPage * ACCOUNTS_PER_PAGE,
    (currentPage + 1) * ACCOUNTS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredAccounts.length / ACCOUNTS_PER_PAGE);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {value ? getSelectedAccountDisplay() : 'Select Account'}
          </span>
          <div className="absolute right-2 top-2 flex items-center space-x-1">
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search accounts..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Loading accounts...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 text-center text-red-600">
              <p>{error}</p>
              <button
                onClick={loadAccounts}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Try again
              </button>
            </div>
          )}

          {/* No Accounts Available */}
          {!isLoading && !error && filteredAccounts.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'No accounts match your search' : 'No accounts available'}
            </div>
          )}

          {/* Account List */}
          {!isLoading && !error && paginatedAccounts.length > 0 && (
            <div className="max-h-60 overflow-y-auto">
              {paginatedAccounts.map((account) => (
                <button
                  key={account.accountNumber}
                  type="button"
                  onClick={() => handleAccountSelect(account.accountNumber)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                    value === account.accountNumber ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                  }`}
                  role="option"
                  aria-selected={value === account.accountNumber}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {account.accountNumber} - {account.firstName} {account.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account.accountName}
                      </div>
                    </div>
                    {value === account.accountNumber && (
                      <div className="text-blue-600">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {currentPage * ACCOUNTS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ACCOUNTS_PER_PAGE, filteredAccounts.length)} of {filteredAccounts.length}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}