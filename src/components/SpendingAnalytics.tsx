import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Calendar, 
  Target, 
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AnalyticsService, SpendingData, TimeSeriesData, SpendingInsight, BudgetGoal, PredictionData } from '../services/AnalyticsService';
import SpendingChart from './SpendingChart';
import BudgetManager from './BudgetManager';
import PredictiveAnalytics from './PredictiveAnalytics';

type ViewMode = 'overview' | 'categories' | 'trends' | 'budget' | 'predictions';
type TimePeriod = 'week' | 'month' | 'quarter' | 'year';

export default function SpendingAnalytics() {
  const navigate = useNavigate();
  const { user, activeAccount } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });

  // Analytics data
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    if (user && activeAccount) {
      loadAnalyticsData();
    }
  }, [user, activeAccount, timePeriod, customDateRange]);

  const loadAnalyticsData = async () => {
    if (!user || !activeAccount) return;

    setIsLoading(true);
    try {
      // Get date range based on selected period
      const { startDate, endDate } = getDateRange();
      
      // Load transaction data
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      
      // Get spending by category
      const categoryData = AnalyticsService.getSpendingByCategory(
        transactions,
        user.id,
        startDate,
        endDate,
        activeAccount.id
      );
      setSpendingData(categoryData);

      // Get time series data
      const timeData = AnalyticsService.getSpendingTimeSeries(
        transactions,
        user.id,
        startDate,
        endDate,
        timePeriod === 'week' ? 'daily' : timePeriod === 'month' ? 'daily' : 'monthly'
      );
      setTimeSeriesData(timeData);

      // Load budget goals
      const goals = AnalyticsService.getBudgetGoals(user.id);
      setBudgetGoals(goals);

      // Generate insights
      const insightData = AnalyticsService.generateInsights(transactions, user.id, goals);
      setInsights(insightData);

      // Get predictions
      const predictionData = AnalyticsService.predictSpending(transactions, user.id);
      setPredictions(predictionData);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      addNotification('Failed to load analytics data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    if (customDateRange.start && customDateRange.end) {
      startDate = new Date(customDateRange.start);
      endDate = new Date(customDateRange.end);
    } else {
      switch (timePeriod) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    return { startDate, endDate };
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const exportData = {
        period: timePeriod,
        dateRange: getDateRange(),
        spendingByCategory: spendingData,
        timeSeriesData: timeSeriesData,
        insights: insights,
        budgetGoals: budgetGoals,
        predictions: predictions,
        exportedAt: new Date().toISOString()
      };

      const result = await AnalyticsService.exportData(
        format,
        exportData,
        `spending-analytics-${timePeriod}-${new Date().toISOString().split('T')[0]}`
      );

      // Download the file
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addNotification(`Analytics data exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      addNotification('Failed to export data', 'error');
    }
  };

  const getTotalSpending = () => {
    return spendingData.reduce((sum, item) => sum + item.amount, 0);
  };

  const getInsightIcon = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning': return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'info': return <Info className="h-5 w-5 text-blue-600" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'tip': return <Lightbulb className="h-5 w-5 text-purple-600" />;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-red-500" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!user || !activeAccount) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Account</h3>
        <p className="text-gray-600">Please select an account to view spending analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spending Analytics</h1>
          <p className="text-gray-600 mt-1">
            Insights for {activeAccount.accountName} (****{activeAccount.accountNumber.slice(-4)})
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Period Selector */}
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          {/* Export Options */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadAnalyticsData}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'categories', label: 'Categories', icon: PieChart },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'budget', label: 'Budget', icon: Target },
            { id: 'predictions', label: 'Predictions', icon: Calendar }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as ViewMode)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Loading analytics data...</span>
          </div>
        </div>
      )}

      {/* Content based on selected view */}
      {!isLoading && (
        <>
          {/* Overview Tab */}
          {viewMode === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Spending</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${getTotalSpending().toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{timePeriod} period</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <PieChart className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Categories</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {spendingData.filter(d => d.amount > 0).length}
                      </p>
                      <p className="text-xs text-gray-500">Active spending areas</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Budget Goals</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {budgetGoals.filter(g => g.isActive).length}
                      </p>
                      <p className="text-xs text-gray-500">Active budgets</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-medium text-gray-900">Spending Insights</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {insights.slice(0, 5).map((insight) => (
                      <div key={insight.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{insight.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                          {insight.actionable && (
                            <button className="text-xs text-blue-600 hover:text-blue-700 mt-2">
                              Take Action →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Categories */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-medium text-gray-900">Top Spending Categories</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {spendingData.slice(0, 5).map((category) => {
                      const categoryInfo = AnalyticsService.getCategoryById(category.category);
                      return (
                        <div key={category.category} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: categoryInfo?.color || '#6B7280' }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {categoryInfo?.icon} {categoryInfo?.name || category.category}
                              </p>
                              <p className="text-xs text-gray-500">
                                {category.count} transactions
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                ${category.amount.toFixed(2)}
                              </span>
                              {getTrendIcon(category.trend)}
                            </div>
                            <p className="text-xs text-gray-500">
                              {category.percentage.toFixed(1)}% of total
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {viewMode === 'categories' && (
            <SpendingChart 
              data={spendingData}
              timeSeriesData={timeSeriesData}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          )}

          {/* Trends Tab */}
          {viewMode === 'trends' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Spending Trends</h3>
              <SpendingChart 
                data={spendingData}
                timeSeriesData={timeSeriesData}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                chartType="line"
              />
            </div>
          )}

          {/* Budget Tab */}
          {viewMode === 'budget' && (
            <BudgetManager 
              budgetGoals={budgetGoals}
              spendingData={spendingData}
              onBudgetUpdate={loadAnalyticsData}
            />
          )}

          {/* Predictions Tab */}
          {viewMode === 'predictions' && (
            <PredictiveAnalytics 
              predictions={predictions}
              historicalData={spendingData}
            />
          )}
        </>
      )}
    </div>
  );
}