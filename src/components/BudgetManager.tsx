import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Target, AlertTriangle, CheckCircle, Bell, BellOff } from 'lucide-react';
import { BudgetGoal, SpendingData, AnalyticsService } from '../services/AnalyticsService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

interface BudgetManagerProps {
  budgetGoals: BudgetGoal[];
  spendingData: SpendingData[];
  onBudgetUpdate: () => void;
}

export default function BudgetManager({ budgetGoals, spendingData, onBudgetUpdate }: BudgetManagerProps) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<BudgetGoal | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    monthlyLimit: '',
    notifications: true
  });

  const categories = AnalyticsService.getSpendingCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const goalData = {
        userId: user.id,
        category: formData.category,
        monthlyLimit: parseFloat(formData.monthlyLimit),
        currentSpent: 0,
        startDate: new Date(),
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        isActive: true,
        notifications: formData.notifications
      };

      if (editingGoal) {
        AnalyticsService.updateBudgetGoal(editingGoal.id, goalData);
        addNotification('Budget goal updated successfully', 'success');
      } else {
        AnalyticsService.saveBudgetGoal(goalData);
        addNotification('Budget goal created successfully', 'success');
      }

      resetForm();
      onBudgetUpdate();
    } catch (error) {
      addNotification('Failed to save budget goal', 'error');
    }
  };

  const handleEdit = (goal: BudgetGoal) => {
    setEditingGoal(goal);
    setFormData({
      category: goal.category,
      monthlyLimit: goal.monthlyLimit.toString(),
      notifications: goal.notifications
    });
    setShowAddForm(true);
  };

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this budget goal?')) {
      try {
        AnalyticsService.deleteBudgetGoal(goalId);
        addNotification('Budget goal deleted successfully', 'success');
        onBudgetUpdate();
      } catch (error) {
        addNotification('Failed to delete budget goal', 'error');
      }
    }
  };

  const toggleNotifications = async (goal: BudgetGoal) => {
    try {
      AnalyticsService.updateBudgetGoal(goal.id, { notifications: !goal.notifications });
      addNotification(`Notifications ${!goal.notifications ? 'enabled' : 'disabled'}`, 'success');
      onBudgetUpdate();
    } catch (error) {
      addNotification('Failed to update notifications', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      monthlyLimit: '',
      notifications: true
    });
    setShowAddForm(false);
    setEditingGoal(null);
  };

  const getBudgetStatus = (goal: BudgetGoal) => {
    const categorySpending = spendingData.find(s => s.category === goal.category);
    const spent = categorySpending?.amount || 0;
    const percentage = (spent / goal.monthlyLimit) * 100;

    if (percentage >= 100) {
      return { status: 'over', color: 'red', icon: AlertTriangle };
    } else if (percentage >= 75) {
      return { status: 'warning', color: 'yellow', icon: AlertTriangle };
    } else {
      return { status: 'good', color: 'green', icon: CheckCircle };
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Budget Management</h3>
          <p className="text-sm text-gray-600">Set spending limits and track your progress</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Budget Goal
        </button>
      </div>

      {/* Budget Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgetGoals.filter(goal => goal.isActive).map((goal) => {
          const categoryInfo = AnalyticsService.getCategoryById(goal.category);
          const categorySpending = spendingData.find(s => s.category === goal.category);
          const spent = categorySpending?.amount || 0;
          const percentage = Math.min((spent / goal.monthlyLimit) * 100, 100);
          const remaining = Math.max(goal.monthlyLimit - spent, 0);
          const budgetStatus = getBudgetStatus(goal);
          const StatusIcon = budgetStatus.icon;

          return (
            <div key={goal.id} className="bg-white rounded-lg shadow p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryInfo?.color || '#6B7280' }}
                  />
                  <h4 className="text-sm font-medium text-gray-900">
                    {categoryInfo?.icon} {categoryInfo?.name || goal.category}
                  </h4>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => toggleNotifications(goal)}
                    className={`p-1 rounded ${goal.notifications ? 'text-blue-600' : 'text-gray-400'}`}
                    title={goal.notifications ? 'Disable notifications' : 'Enable notifications'}
                  >
                    {goal.notifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(goal)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <div className="flex items-center space-x-1">
                    <StatusIcon className={`h-4 w-4 text-${budgetStatus.color}-600`} />
                    <span className="text-sm font-medium text-gray-900">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Amounts */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Spent</span>
                  <span className="font-medium text-gray-900">${spent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Budget</span>
                  <span className="font-medium text-gray-900">${goal.monthlyLimit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining</span>
                  <span className={`font-medium ${remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${remaining.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status Message */}
              {percentage >= 90 && (
                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-800">
                    {percentage >= 100 ? 'Budget exceeded!' : 'Approaching budget limit'}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {budgetGoals.filter(goal => goal.isActive).length === 0 && (
          <div className="col-span-full bg-white rounded-lg shadow p-8 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Goals</h3>
            <p className="text-gray-600 mb-4">
              Create budget goals to track your spending and stay on target.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Budget Goal
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingGoal ? 'Edit Budget Goal' : 'Add Budget Goal'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Budget Limit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.monthlyLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={formData.notifications}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifications: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notifications" className="ml-2 text-sm text-gray-700">
                  Enable budget notifications
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}