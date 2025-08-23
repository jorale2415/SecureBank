import React, { useState } from 'react';
import { Download, Mail, Calendar, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { StatementService, StatementRequest } from '../services/StatementService';

export default function StatementGenerator() {
  const { user, activeAccount } = useAuth();
  const { addNotification } = useNotification();
  
  const [formData, setFormData] = useState({
    dateFrom: '',
    dateTo: '',
    format: 'pdf',
    includeTransactions: true,
    emailDelivery: false,
    email: user?.email || ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [showEmailHistory, setShowEmailHistory] = useState(false);

  React.useEffect(() => {
    if (user) {
      loadEmailHistory();
    }
  }, [user]);

  const loadEmailHistory = () => {
    if (user) {
      const history = StatementService.getEmailDeliveryHistory(user.id);
      setEmailHistory(history);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.dateFrom || !formData.dateTo) {
      return 'Please select both start and end dates';
    }

    const fromDate = new Date(formData.dateFrom);
    const toDate = new Date(formData.dateTo);

    if (fromDate > toDate) {
      return 'Start date cannot be after end date';
    }

    if (toDate > new Date()) {
      return 'End date cannot be in the future';
    }

    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return 'Date range cannot exceed 365 days';
    }

    if (formData.emailDelivery && !formData.email) {
      return 'Email address is required for email delivery';
    }

    if (formData.emailDelivery && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    return null;
  };

  const handleGenerateStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !activeAccount) {
      addNotification('Please select an account', 'error');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      addNotification(validationError, 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const request: StatementRequest = {
        userId: user.id,
        accountId: activeAccount.id,
        dateFrom: new Date(formData.dateFrom),
        dateTo: new Date(formData.dateTo),
        format: formData.format as 'pdf' | 'csv' | 'excel',
        includeTransactions: formData.includeTransactions,
        emailDelivery: {
          enabled: formData.emailDelivery,
          email: formData.emailDelivery ? formData.email : undefined
        }
      };

      const result = await StatementService.generateStatement(request);

      if (result.success && result.data && result.filename) {
        // Download the file
        const url = window.URL.createObjectURL(result.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        addNotification(result.message, 'success');
        
        // Reload email history if email was sent
        if (formData.emailDelivery) {
          setTimeout(() => {
            loadEmailHistory();
          }, 1000);
        }
      } else {
        addNotification(result.message, 'error');
      }
    } catch (error) {
      console.error('Statement generation error:', error);
      addNotification('Failed to generate statement', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatOptions = StatementService.getAvailableFormats();

  if (!user || !activeAccount) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Account</h3>
        <p className="text-gray-600">Please select an account from the dashboard to generate statements.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Generate Account Statement</h2>
        <p className="text-gray-600 mt-1">
          Download official statements for {activeAccount.accountName} (****{activeAccount.accountNumber.slice(-4)})
        </p>
      </div>

      {/* Statement Generation Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Statement Options</h3>
        </div>
        
        <form onSubmit={handleGenerateStatement} className="p-6 space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                From Date
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={formData.dateFrom}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                To Date
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={formData.dateTo}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Statement Format
            </label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeTransactions"
                name="includeTransactions"
                checked={formData.includeTransactions}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeTransactions" className="ml-2 text-sm text-gray-700">
                Include detailed transaction history
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="emailDelivery"
                name="emailDelivery"
                checked={formData.emailDelivery}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="emailDelivery" className="ml-2 text-sm text-gray-700">
                Send statement by email
              </label>
            </div>

            {formData.emailDelivery && (
              <div className="ml-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={formData.emailDelivery}
                />
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              <div>• Statements include bank branding and digital signatures</div>
              <div>• Maximum date range: 365 days</div>
              <div>• All formats include account summary and transaction details</div>
            </div>
            
            <button
              type="submit"
              disabled={isGenerating}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Statement
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Email Delivery History */}
      {emailHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Email Delivery History</h3>
              <button
                onClick={() => setShowEmailHistory(!showEmailHistory)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showEmailHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
          </div>
          
          {showEmailHistory && (
            <div className="p-6">
              <div className="space-y-3">
                {emailHistory.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.filename}
                        </div>
                        <div className="text-xs text-gray-500">
                          Sent to {log.recipient} • {(log.fileSize / 1024).toFixed(2)} KB
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(log.sentAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              
              {emailHistory.length > 5 && (
                <div className="text-center mt-4">
                  <span className="text-sm text-gray-500">
                    Showing 5 of {emailHistory.length} email deliveries
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Security & Authenticity</div>
            <div>
              All generated statements include digital signatures and watermarks for authenticity verification. 
              Statements are generated in real-time and reflect the most current account information. 
              For official purposes, PDF format is recommended as it maintains formatting and includes security features.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}