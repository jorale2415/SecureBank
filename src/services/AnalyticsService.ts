import { Transaction, BankAccount, User } from '../context/AuthContext';

export interface SpendingCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  keywords: string[];
}

export interface SpendingData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface TimeSeriesData {
  date: string;
  amount: number;
  category?: string;
}

export interface BudgetGoal {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  currentSpent: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  notifications: boolean;
}

export interface SpendingInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  description: string;
  actionable: boolean;
  category?: string;
  amount?: number;
}

export interface PredictionData {
  category: string;
  predictedAmount: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: string[];
}

export class AnalyticsService {
  private static readonly SPENDING_CATEGORIES: SpendingCategory[] = [
    {
      id: 'groceries',
      name: 'Groceries & Food',
      color: '#10B981',
      icon: '🛒',
      keywords: ['grocery', 'food', 'restaurant', 'cafe', 'market', 'supermarket', 'dining']
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      color: '#8B5CF6',
      icon: '🎬',
      keywords: ['movie', 'cinema', 'theater', 'concert', 'game', 'entertainment', 'streaming']
    },
    {
      id: 'utilities',
      name: 'Utilities',
      color: '#F59E0B',
      icon: '⚡',
      keywords: ['electric', 'gas', 'water', 'internet', 'phone', 'utility', 'bill']
    },
    {
      id: 'transportation',
      name: 'Transportation',
      color: '#3B82F6',
      icon: '🚗',
      keywords: ['gas', 'fuel', 'uber', 'taxi', 'bus', 'train', 'parking', 'transport']
    },
    {
      id: 'shopping',
      name: 'Shopping',
      color: '#EC4899',
      icon: '🛍️',
      keywords: ['store', 'shop', 'retail', 'amazon', 'clothing', 'fashion', 'purchase']
    },
    {
      id: 'healthcare',
      name: 'Healthcare',
      color: '#EF4444',
      icon: '🏥',
      keywords: ['hospital', 'doctor', 'pharmacy', 'medical', 'health', 'clinic', 'medicine']
    },
    {
      id: 'education',
      name: 'Education',
      color: '#06B6D4',
      icon: '📚',
      keywords: ['school', 'university', 'course', 'book', 'education', 'tuition', 'learning']
    },
    {
      id: 'other',
      name: 'Other',
      color: '#6B7280',
      icon: '📦',
      keywords: []
    }
  ];

  /**
   * Categorize a transaction based on description and merchant data
   */
  static categorizeTransaction(transaction: Transaction): string {
    const description = (transaction.description || '').toLowerCase();
    
    for (const category of this.SPENDING_CATEGORIES) {
      if (category.id === 'other') continue;
      
      for (const keyword of category.keywords) {
        if (description.includes(keyword.toLowerCase())) {
          return category.id;
        }
      }
    }
    
    return 'other';
  }

  /**
   * Get spending data by category for a specific time period
   */
  static getSpendingByCategory(
    transactions: Transaction[],
    userId: string,
    startDate: Date,
    endDate: Date,
    accountId?: string
  ): SpendingData[] {
    // Filter transactions for the specified period and user
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      const isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
      
      // Only include outgoing transactions (debits)
      const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
      const user = users.find((u: User) => u.id === userId);
      const isUserDebit = user?.accounts?.some(acc => 
        acc.accountNumber === t.fromAccountNumber && 
        (!accountId || acc.id === accountId)
      );
      
      return isInDateRange && isUserDebit;
    });

    // Group by category
    const categoryTotals = new Map<string, { amount: number; count: number }>();
    
    filteredTransactions.forEach(transaction => {
      const category = this.categorizeTransaction(transaction);
      const current = categoryTotals.get(category) || { amount: 0, count: 0 };
      categoryTotals.set(category, {
        amount: current.amount + transaction.amount,
        count: current.count + 1
      });
    });

    const totalSpent = Array.from(categoryTotals.values())
      .reduce((sum, cat) => sum + cat.amount, 0);

    // Calculate previous period for trend analysis
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime());
    
    const prevPeriodData = this.getSpendingByCategory(
      transactions, userId, prevStartDate, prevEndDate, accountId
    );
    const prevTotalsByCategory = new Map(
      prevPeriodData.map(d => [d.category, d.amount])
    );

    // Convert to SpendingData array
    const result: SpendingData[] = [];
    
    this.SPENDING_CATEGORIES.forEach(categoryDef => {
      const data = categoryTotals.get(categoryDef.id) || { amount: 0, count: 0 };
      const prevAmount = prevTotalsByCategory.get(categoryDef.id) || 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;
      
      if (prevAmount > 0) {
        trendPercentage = ((data.amount - prevAmount) / prevAmount) * 100;
        if (Math.abs(trendPercentage) > 5) {
          trend = trendPercentage > 0 ? 'up' : 'down';
        }
      } else if (data.amount > 0) {
        trend = 'up';
        trendPercentage = 100;
      }

      if (data.amount > 0 || prevAmount > 0) {
        result.push({
          category: categoryDef.id,
          amount: data.amount,
          count: data.count,
          percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
          trend,
          trendPercentage: Math.abs(trendPercentage)
        });
      }
    });

    return result.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get time series data for spending trends
   */
  static getSpendingTimeSeries(
    transactions: Transaction[],
    userId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
    category?: string
  ): TimeSeriesData[] {
    const users = JSON.parse(localStorage.getItem('bankingUsers') || '[]');
    const user = users.find((u: User) => u.id === userId);
    
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      const isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
      const isUserDebit = user?.accounts?.some(acc => acc.accountNumber === t.fromAccountNumber);
      const matchesCategory = !category || this.categorizeTransaction(t) === category;
      
      return isInDateRange && isUserDebit && matchesCategory;
    });

    // Group by time period
    const timeGroups = new Map<string, number>();
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.timestamp);
      let key: string;
      
      switch (granularity) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      timeGroups.set(key, (timeGroups.get(key) || 0) + transaction.amount);
    });

    // Fill in missing periods with zero values
    const result: TimeSeriesData[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      let key: string;
      
      switch (granularity) {
        case 'daily':
          key = current.toISOString().split('T')[0];
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          const weekStart = new Date(current);
          weekStart.setDate(current.getDate() - current.getDay());
          key = weekStart.toISOString().split('T')[0];
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          key = current.toISOString().split('T')[0];
          current.setDate(current.getDate() + 1);
      }
      
      result.push({
        date: key,
        amount: timeGroups.get(key) || 0,
        category
      });
    }

    return result;
  }

  /**
   * Generate spending insights and recommendations
   */
  static generateInsights(
    transactions: Transaction[],
    userId: string,
    budgetGoals: BudgetGoal[]
  ): SpendingInsight[] {
    const insights: SpendingInsight[] = [];
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Get current month spending
    const currentSpending = this.getSpendingByCategory(
      transactions, userId, currentMonth, now
    );

    // Budget alerts
    budgetGoals.forEach(goal => {
      if (!goal.isActive) return;
      
      const categorySpending = currentSpending.find(s => s.category === goal.category);
      const spent = categorySpending?.amount || 0;
      const percentage = (spent / goal.monthlyLimit) * 100;
      
      if (percentage >= 90) {
        insights.push({
          id: `budget-alert-${goal.id}`,
          type: 'warning',
          title: 'Budget Alert',
          description: `You've spent ${percentage.toFixed(0)}% of your ${this.getCategoryName(goal.category)} budget this month.`,
          actionable: true,
          category: goal.category,
          amount: spent
        });
      } else if (percentage >= 75) {
        insights.push({
          id: `budget-warning-${goal.id}`,
          type: 'info',
          title: 'Budget Warning',
          description: `You're approaching your ${this.getCategoryName(goal.category)} budget limit (${percentage.toFixed(0)}% used).`,
          actionable: true,
          category: goal.category,
          amount: spent
        });
      }
    });

    // Spending trend insights
    currentSpending.forEach(spending => {
      if (spending.trend === 'up' && spending.trendPercentage > 20) {
        insights.push({
          id: `trend-${spending.category}`,
          type: 'info',
          title: 'Spending Increase',
          description: `Your ${this.getCategoryName(spending.category)} spending increased by ${spending.trendPercentage.toFixed(0)}% compared to last period.`,
          actionable: true,
          category: spending.category,
          amount: spending.amount
        });
      }
    });

    // Positive insights
    const totalSpent = currentSpending.reduce((sum, s) => sum + s.amount, 0);
    const avgDailySpending = totalSpent / now.getDate();
    
    if (avgDailySpending < 50) {
      insights.push({
        id: 'low-spending',
        type: 'success',
        title: 'Great Spending Control',
        description: `You're maintaining excellent spending discipline with an average of $${avgDailySpending.toFixed(2)} per day this month.`,
        actionable: false
      });
    }

    // Tips and recommendations
    const topCategory = currentSpending[0];
    if (topCategory && topCategory.percentage > 40) {
      insights.push({
        id: 'diversify-spending',
        type: 'tip',
        title: 'Spending Concentration',
        description: `${topCategory.percentage.toFixed(0)}% of your spending is on ${this.getCategoryName(topCategory.category)}. Consider reviewing this category for potential savings.`,
        actionable: true,
        category: topCategory.category
      });
    }

    return insights.sort((a, b) => {
      const priority = { warning: 0, info: 1, tip: 2, success: 3 };
      return priority[a.type] - priority[b.type];
    });
  }

  /**
   * Predict future spending based on historical data
   */
  static predictSpending(
    transactions: Transaction[],
    userId: string,
    months: number = 3
  ): PredictionData[] {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    
    // Get historical spending data
    const historicalSpending = this.getSpendingByCategory(
      transactions, userId, sixMonthsAgo, now
    );

    // Get monthly trends for each category
    const predictions: PredictionData[] = [];
    
    historicalSpending.forEach(categoryData => {
      if (categoryData.amount === 0) return;
      
      // Simple linear regression for trend prediction
      const monthlyData: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthSpending = this.getSpendingByCategory(
          transactions, userId, monthStart, monthEnd
        );
        const categoryMonth = monthSpending.find(s => s.category === categoryData.category);
        monthlyData.push(categoryMonth?.amount || 0);
      }

      // Calculate trend
      const avgSpending = monthlyData.reduce((sum, val) => sum + val, 0) / monthlyData.length;
      const recentAvg = monthlyData.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
      const olderAvg = monthlyData.slice(0, 3).reduce((sum, val) => sum + val, 0) / 3;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let predictedAmount = avgSpending;
      
      if (recentAvg > olderAvg * 1.1) {
        trend = 'increasing';
        predictedAmount = recentAvg * 1.05; // 5% increase
      } else if (recentAvg < olderAvg * 0.9) {
        trend = 'decreasing';
        predictedAmount = recentAvg * 0.95; // 5% decrease
      } else {
        predictedAmount = recentAvg;
      }

      // Calculate confidence based on data consistency
      const variance = monthlyData.reduce((sum, val) => sum + Math.pow(val - avgSpending, 2), 0) / monthlyData.length;
      const stdDev = Math.sqrt(variance);
      const confidence = Math.max(0.3, Math.min(0.95, 1 - (stdDev / avgSpending)));

      predictions.push({
        category: categoryData.category,
        predictedAmount: Math.max(0, predictedAmount),
        confidence,
        trend,
        factors: this.getPredictionFactors(categoryData.category, trend, monthlyData)
      });
    });

    return predictions.sort((a, b) => b.predictedAmount - a.predictedAmount);
  }

  /**
   * Get budget goals for a user
   */
  static getBudgetGoals(userId: string): BudgetGoal[] {
    try {
      const budgets = JSON.parse(localStorage.getItem('budgetGoals') || '[]');
      return budgets.filter((budget: BudgetGoal) => budget.userId === userId);
    } catch (error) {
      console.error('Error loading budget goals:', error);
      return [];
    }
  }

  /**
   * Save or update a budget goal
   */
  static saveBudgetGoal(goal: Omit<BudgetGoal, 'id'>): BudgetGoal {
    try {
      const budgets = JSON.parse(localStorage.getItem('budgetGoals') || '[]');
      const newGoal: BudgetGoal = {
        ...goal,
        id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      budgets.push(newGoal);
      localStorage.setItem('budgetGoals', JSON.stringify(budgets));
      
      return newGoal;
    } catch (error) {
      console.error('Error saving budget goal:', error);
      throw error;
    }
  }

  /**
   * Update budget goal
   */
  static updateBudgetGoal(goalId: string, updates: Partial<BudgetGoal>): boolean {
    try {
      const budgets = JSON.parse(localStorage.getItem('budgetGoals') || '[]');
      const index = budgets.findIndex((budget: BudgetGoal) => budget.id === goalId);
      
      if (index === -1) return false;
      
      budgets[index] = { ...budgets[index], ...updates };
      localStorage.setItem('budgetGoals', JSON.stringify(budgets));
      
      return true;
    } catch (error) {
      console.error('Error updating budget goal:', error);
      return false;
    }
  }

  /**
   * Delete budget goal
   */
  static deleteBudgetGoal(goalId: string): boolean {
    try {
      const budgets = JSON.parse(localStorage.getItem('budgetGoals') || '[]');
      const filtered = budgets.filter((budget: BudgetGoal) => budget.id !== goalId);
      
      localStorage.setItem('budgetGoals', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting budget goal:', error);
      return false;
    }
  }

  /**
   * Export analytics data
   */
  static async exportData(
    format: 'csv' | 'json',
    data: any,
    filename: string
  ): Promise<{ blob: Blob; filename: string }> {
    let blob: Blob;
    let finalFilename: string;

    if (format === 'csv') {
      const csvContent = this.convertToCSV(data);
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      finalFilename = `${filename}.csv`;
    } else {
      const jsonContent = JSON.stringify(data, null, 2);
      blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      finalFilename = `${filename}.json`;
    }

    return { blob, filename: finalFilename };
  }

  // Helper methods
  private static getCategoryName(categoryId: string): string {
    const category = this.SPENDING_CATEGORIES.find(c => c.id === categoryId);
    return category?.name || categoryId;
  }

  private static getPredictionFactors(
    category: string,
    trend: string,
    monthlyData: number[]
  ): string[] {
    const factors = [];
    
    if (trend === 'increasing') {
      factors.push('Recent spending increase detected');
      if (category === 'utilities') factors.push('Seasonal utility costs may be higher');
      if (category === 'entertainment') factors.push('Increased leisure activities');
    } else if (trend === 'decreasing') {
      factors.push('Recent spending decrease detected');
      factors.push('Improved spending discipline');
    }
    
    const variance = monthlyData.reduce((sum, val, i, arr) => {
      const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
      return sum + Math.pow(val - avg, 2);
    }, 0) / monthlyData.length;
    
    if (variance > 1000) {
      factors.push('High spending variability in this category');
    }
    
    return factors;
  }

  private static convertToCSV(data: any): string {
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          }).join(',')
        )
      ];
      return csvRows.join('\n');
    }
    return '';
  }

  /**
   * Get all spending categories
   */
  static getSpendingCategories(): SpendingCategory[] {
    return [...this.SPENDING_CATEGORIES];
  }

  /**
   * Get category by ID
   */
  static getCategoryById(categoryId: string): SpendingCategory | undefined {
    return this.SPENDING_CATEGORIES.find(c => c.id === categoryId);
  }
}