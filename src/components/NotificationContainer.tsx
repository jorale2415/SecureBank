import React from 'react';
import { X, CheckCircle, XCircle, Info } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => {
        const Icon = notification.type === 'success' ? CheckCircle : 
                   notification.type === 'error' ? XCircle : Info;
        
        const bgColor = notification.type === 'success' ? 'bg-green-50 border-green-200' :
                       notification.type === 'error' ? 'bg-red-50 border-red-200' :
                       'bg-blue-50 border-blue-200';
        
        const textColor = notification.type === 'success' ? 'text-green-800' :
                         notification.type === 'error' ? 'text-red-800' :
                         'text-blue-800';
        
        const iconColor = notification.type === 'success' ? 'text-green-600' :
                         notification.type === 'error' ? 'text-red-600' :
                         'text-blue-600';

        return (
          <div
            key={notification.id}
            className={`${bgColor} border rounded-lg p-4 shadow-lg max-w-sm flex items-center space-x-3`}
          >
            <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
            <p className={`text-sm font-medium ${textColor} flex-1`}>
              {notification.message}
            </p>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`${textColor} hover:opacity-75 flex-shrink-0`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}