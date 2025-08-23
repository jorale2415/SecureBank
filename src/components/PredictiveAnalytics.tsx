import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Brain, AlertTriangle, Info, Calendar, Target } from 'lucide-react';
import { PredictionData, SpendingData, AnalyticsService } from '../services/AnalyticsService';

interface PredictiveAnalyticsProps {
  predictions: PredictionData[];
  historicalData: SpendingData[];
}

export default function PredictiveAnalytics({ predictions, historicalData }: PredictiveAnalyticsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1month' | '3months' | '6months'>('3months');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const getTrendIcon = (trend: PredictionData['trend']) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-5 w-5 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      case 'stable':
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getTotalPredictedSpending = () => {
    return predictions.reduce((sum, pred) => sum + pred.predictedAmount, 0);
  };

  const getHistoricalTotal = () => {
    return historicalData.reduce((sum, data) => sum + data.amount, 0);
  };

  const getPredictedChange = () => {
    const predicted = getTotalPredictedSpending();
    const historical = getHistoricalTotal();
    if (historical === 0) return 0;
    return ((predicted - historical) / historical) * 100;
  };

  const getTimeframeMultiplier = () => {
    switch (selectedTimeframe) {
      case '1month': return 1;
      case '3months': return 3;
      case '6months': return 6;
      default: return 3;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Predictive Analytics</h3>
            <p className="text-sm text-gray-600">AI-powered spending forecasts based on your history</p>
          </div>
        </div>
        
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="1month">Next Month</option>
          <option value="3months">Next 3 Months</option>
          <option value="6months">Next 6 Months</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Predicted Spending</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(getTotalPredictedSpending() * getTimeframeMultiplier()).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 capitalize">{selectedTimeframe.replace('months', ' months')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Trend Change</p>
              <p className={`text-2xl font-bold ${getPredictedChange() >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {getPredictedChange() >= 0 ? '+' : ''}{getPredictedChange().toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">vs. current period</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Confidence</p>
              <p className="text-2xl font-bold text-gray-900">
                {predictions.length > 0 
                  ? (predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100).toFixed(0)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500">Prediction accuracy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Predictions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h4 className="text-lg font-medium text-gray-900">Category Predictions</h4>
        </div>
        
        <div className="divide-y divide-gray-200">
          {predictions.map((prediction) => {
            const categoryInfo = AnalyticsService.getCategoryById(prediction.category);
            const historicalAmount = historicalData.find(h => h.category === prediction.category)?.amount || 0;
            const change = historicalAmount > 0 ? ((prediction.predictedAmount - historicalAmount) / historicalAmount) * 100 : 0;
            const projectedAmount = prediction.predictedAmount * getTimeframeMultiplier();
            
            return (
              <div key={prediction.category} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: categoryInfo?.color || '#6B7280' }}
                    />
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">
                        {categoryInfo?.icon} {categoryInfo?.name || prediction.category}
                      </h5>
                      <div className="flex items-center space-x-2 mt-1">
                        {getTrendIcon(prediction.trend)}
                        <span className="text-xs text-gray-500 capitalize">
                          {prediction.trend} trend
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(prediction.confidence)}`}>
                          {getConfidenceLabel(prediction.confidence)} confidence
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-gray-900">
                        ${projectedAmount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setShowDetails(showDetails === prediction.category ? null : prediction.category)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Details
                      </button>
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className={`text-sm ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">vs. current</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                {showDetails === prediction.category && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h6 className="text-sm font-medium text-gray-900 mb-2">Prediction Factors</h6>
                        <ul className="space-y-1">
                          {prediction.factors.map((factor, index) => (
                            <li key={index} className="text-xs text-gray-600 flex items-start">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h6 className="text-sm font-medium text-gray-900 mb-2">Breakdown</h6>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monthly prediction:</span>
                            <span className="font-medium">${prediction.predictedAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Current monthly avg:</span>
                            <span className="font-medium">${historicalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Confidence level:</span>
                            <span className="font-medium">{(prediction.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-600">Total projected:</span>
                            <span className="font-semibold">${projectedAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h4 className="text-lg font-medium text-gray-900">AI Insights & Recommendations</h4>
        </div>
        
        <div className="p-6 space-y-4">
          {/* High spending prediction warning */}
          {getPredictedChange() > 10 && (
            <div className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-orange-800">Spending Increase Alert</h5>
                <p className="text-sm text-orange-700 mt-1">
                  Our AI predicts a {getPredictedChange().toFixed(1)}% increase in spending. 
                  Consider reviewing your budget goals and identifying areas for potential savings.
                </p>
              </div>
            </div>
          )}

          {/* Low confidence warning */}
          {predictions.some(p => p.confidence < 0.6) && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-yellow-800">Limited Data Notice</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  Some predictions have lower confidence due to limited historical data. 
                  Predictions will become more accurate as you use the app longer.
                </p>
              </div>
            </div>
          )}

          {/* Positive trend */}
          {getPredictedChange() < -5 && (
            <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <TrendingDown className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-green-800">Positive Trend Detected</h5>
                <p className="text-sm text-green-700 mt-1">
                  Great job! Our AI predicts a {Math.abs(getPredictedChange()).toFixed(1)}% decrease in spending. 
                  Your financial discipline is paying off.
                </p>
              </div>
            </div>
          )}

          {/* General recommendations */}
          <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-blue-800">Smart Recommendations</h5>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Set budget alerts for categories with increasing trends</li>
                <li>• Review high-confidence predictions for budget planning</li>
                <li>• Consider automated savings for predicted surplus months</li>
                <li>• Monitor actual vs. predicted spending to improve accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600">
          <strong>Disclaimer:</strong> Predictions are based on historical spending patterns and machine learning algorithms. 
          Actual spending may vary due to life changes, economic conditions, and personal decisions. 
          Use these predictions as guidance for financial planning, not as absolute forecasts.
        </p>
      </div>
    </div>
  );
}