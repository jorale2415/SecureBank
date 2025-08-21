import React, { useState, useEffect } from 'react';
import { Clock, Shield, AlertTriangle, CheckCircle, XCircle, Filter, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TransferService, AuditLog } from '../services/TransferService';

export default function TransferHistory() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTransferHistory();
      loadSystemMetrics();
    }
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [auditLogs, filter]);

  const loadTransferHistory = async () => {
    setIsLoading(true);
    try {
      const history = TransferService.getTransferHistory(user!.id, 100);
      setAuditLogs(history);
    } catch (error) {
      console.error('Failed to load transfer history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemMetrics = () => {
    try {
      const metrics = TransferService.getSystemMetrics();
      setSystemMetrics(metrics);
    } catch (error) {
      console.error('Failed to load system metrics:', error);
    }
  };

  const applyFilter = () => {
    let filtered = [...auditLogs];
    
    if (filter === 'success') {
      filtered = filtered.filter(log => log.action === 'TRANSFER_SUCCESS');
    } else if (filter === 'failed') {
      filtered = filtered.filter(log => log.action === 'TRANSFER_FAILED');
    }
    
    setFilteredLogs(filtered);
  };

  const exportHistory = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'From Account', 'To Account', 'Amount', 'Status', 'Error Code'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.fromAccount,
        log.toAccount,
        log.amount.toString(),
        log.action === 'TRANSFER_SUCCESS' ? 'Success' : 'Failed',
        log.errorCode || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfer_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (action: AuditLog['action']) => {
    switch (action) {
      case 'TRANSFER_SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'TRANSFER_FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'TRANSFER_ATTEMPT':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (action: AuditLog['action']) => {
    switch (action) {
      case 'TRANSFER_SUCCESS':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'TRANSFER_FAILED':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'TRANSFER_ATTEMPT':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getErrorMessage = (errorCode?: string) => {
    const errorMessages: { [key: string]: string } = {
      'INSUFFICIENT_FUNDS': 'Insufficient funds',
      'RATE_LIMIT_EXCEEDED': 'Rate limit exceeded',
      'DAILY_LIMIT_EXCEEDED': 'Daily limit exceeded',
      'UNAUTHORIZED': 'Unauthorized access',
      'DESTINATION_ACCOUNT_NOT_FOUND': 'Account not found',
      'SELF_TRANSFER_NOT_ALLOWED': 'Self-transfer blocked',
      'INVALID_AMOUNT_FORMAT': 'Invalid amount',
      'SYSTEM_ERROR': 'System error'
    };
    
    return errorMessages[errorCode || ''] || errorCode || 'Unknown error';
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Please Log In</h3>
        <p className="text-gray-600">You need to be logged in to view transfer history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer History & Audit Log</h1>
          <div className="flex items-center mt-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm transition-colors duration-200"
              aria-label="Go back to dashboard"
            >
              <Shield className="h-4 w-4 mr-1" />
              Back to Dashboard
            </button>
          </div>
          <p className="text-gray-600 mt-1">Comprehensive record of all transfer activities</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportHistory}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={loadTransferHistory}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Metrics */}
      {systemMetrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Health (Last Hour)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{systemMetrics.totalTransfers}</div>
              <div className="text-sm text-gray-600">Total Attempts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemMetrics.successfulTransfers}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{systemMetrics.failedTransfers}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{systemMetrics.successRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex space-x-2">
              {(['all', 'success', 'failed'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    filter === filterOption
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {auditLogs.length} records
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Loading transfer history...</span>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      {!isLoading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transfer records found</h3>
              <p className="text-gray-600">
                {auditLogs.length === 0 
                  ? 'Your transfer history will appear here.' 
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(log.action)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(log.action)}`}>
                            {log.action.replace('TRANSFER_', '').toLowerCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-mono">****{log.fromAccount.slice(-4)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-mono">****{log.toAccount.slice(-4)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={log.action === 'TRANSFER_SUCCESS' ? 'text-green-600' : 'text-gray-900'}>
                          ${log.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.action === 'TRANSFER_FAILED' && log.errorCode && (
                          <div className="text-red-600">
                            {getErrorMessage(log.errorCode)}
                          </div>
                        )}
                        {log.metadata?.description && (
                          <div className="text-gray-600 truncate max-w-xs">
                            {log.metadata.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          ID: {log.id.slice(-8)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Security & Compliance</div>
            <div>
              All transfer activities are logged and monitored for security purposes. 
              This audit trail helps ensure transaction integrity and regulatory compliance.
              Records are retained for 7 years as per banking regulations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}