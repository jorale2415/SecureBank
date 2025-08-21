import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accounts: BankAccount[];
  activeAccountId: string;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'business';
  balance: number;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  fromAccountNumber: string;
  toAccountNumber: string;
  amount: number;
  description: string;
  timestamp: Date;
  type: 'debit' | 'credit';
}

interface AuthContextType {
  user: User | null;
  activeAccount: BankAccount | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id' | 'accountNumber' | 'balance'> & { password: string }) => Promise<boolean>;
  logout: () => void;
  updateBalance: (accountId: string, newBalance: number) => void;
  switchAccount: (accountId: string) => void;
  addAccount: (accountData: Omit<BankAccount, 'id' | 'isActive'>) => void;
  getAllAccountNumbers: () => string[];
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const activeAccount = user?.accounts?.find(acc => acc.id === user.activeAccountId) || null;

  useEffect(() => {
    const savedUser = localStorage.getItem('bankingUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Initialize demo user if not exists
    const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
    if (users.length === 0) {
      const demoUser = {
        id: 'demo-user-1',
        email: 'demo@bank.com',
        password: 'demo123',
        firstName: 'Demo',
        lastName: 'User',
        accounts: [
          {
            id: 'acc-1',
            accountNumber: '1234567890',
            accountName: 'Primary Checking',
            accountType: 'checking' as const,
            balance: 1000.00,
            isActive: true
          },
          {
            id: 'acc-2', 
            accountNumber: '1234567891',
            accountName: 'Savings Account',
            accountType: 'savings' as const,
            balance: 2500.00,
            isActive: false
          }
        ],
        activeAccountId: 'acc-1'
      };
      users.push(demoUser);
      localStorage.setItem('bankingUsers', JSON.stringify(users));
    }
    
    const foundUser = users.find((u: any) => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('bankingUser', JSON.stringify(userWithoutPassword));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const register = async (userData: Omit<User, 'id' | 'accountNumber' | 'balance'> & { password: string }): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
    
    // Check if user already exists
    if (users.some((u: any) => u.email === userData.email)) {
      setIsLoading(false);
      return false;
    }
    
    const newUser = {
      ...userData,
      id: Date.now().toString(),
      accounts: [
        {
          id: 'acc-' + Date.now(),
          accountNumber: Math.random().toString().substr(2, 10),
          accountName: 'Primary Checking',
          accountType: 'checking' as const,
          balance: 1000.00,
          isActive: true
        }
      ],
      activeAccountId: 'acc-' + Date.now()
    };
    
    users.push(newUser);
    localStorage.setItem('bankingUsers', JSON.stringify(users));
    
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    localStorage.setItem('bankingUser', JSON.stringify(userWithoutPassword));
    
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bankingUser');
    setIsLoading(false); // Clear loading state on logout
  };

  const updateBalance = (accountId: string, newBalance: number) => {
    if (user) {
      const updatedAccounts = user.accounts.map(acc => 
        acc.id === accountId ? { ...acc, balance: newBalance } : acc
      );
      const updatedUser = { ...user, accounts: updatedAccounts };
      setUser(updatedUser);
      localStorage.setItem('bankingUser', JSON.stringify(updatedUser));
      
      // Update in users array
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? { ...u, accounts: updatedAccounts } : u
      );
      localStorage.setItem('bankingUsers', JSON.stringify(updatedUsers));
    }
  };

  const switchAccount = (accountId: string) => {
    if (user) {
      const updatedUser = { ...user, activeAccountId: accountId };
      setUser(updatedUser);
      localStorage.setItem('bankingUser', JSON.stringify(updatedUser));
      
      // Update in users array
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? { ...u, activeAccountId: accountId } : u
      );
      localStorage.setItem('bankingUsers', JSON.stringify(updatedUsers));
    }
  };

  const addAccount = (accountData: Omit<BankAccount, 'id' | 'isActive'>) => {
    if (user) {
      const newAccount: BankAccount = {
        ...accountData,
        id: 'acc-' + Date.now(),
        isActive: false
      };
      
      const updatedAccounts = [...(user.accounts || []), newAccount];
      const updatedUser = { ...user, accounts: updatedAccounts };
      setUser(updatedUser);
      localStorage.setItem('bankingUser', JSON.stringify(updatedUser));
      
      // Update in users array
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? { ...u, accounts: updatedAccounts } : u
      );
      localStorage.setItem('bankingUsers', JSON.stringify(updatedUsers));
    }
  };

  const getAllAccountNumbers = (): string[] => {
    const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
    const allAccountNumbers: string[] = [];
    
    users.forEach((u: any) => {
      if (u.accounts) {
        u.accounts.forEach((acc: BankAccount) => {
          allAccountNumbers.push(acc.accountNumber);
        });
      }
    });
    
    return allAccountNumbers;
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeAccount,
      login,
      register,
      logout,
      updateBalance,
      switchAccount,
      addAccount,
      getAllAccountNumbers,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}