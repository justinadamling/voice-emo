import { useEffect, useState } from 'react';
import { typography } from '@/styles/typography';

interface ToastProps {
  message: string;
  status?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

const statusStyles = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
};

export const Toast = ({ message, status = 'info', duration = 3000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 transform transition-all duration-300 ease-in-out 
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <div className={`${statusStyles[status]} text-white px-6 py-3 rounded-lg shadow-lg ${typography.bodyText}`}>
        {message}
      </div>
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Array<{ id: string; props: ToastProps }>>([]);

  const toast = ({ message, status, duration }: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { 
      id, 
      props: { 
        message, 
        status, 
        duration, 
        onClose: () => setToasts((prev) => prev.filter((t) => t.id !== id))
      } 
    }]);
  };

  const ToastContainer = () => (
    <>
      {toasts.map(({ id, props }) => (
        <Toast key={id} {...props} />
      ))}
    </>
  );

  return { toast, ToastContainer };
}; 