import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useToast } from '../hooks/use-toast';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    // Get backend URL from environment variable
    // Socket.IO connects to the same backend server (e.g., https://api.infinitelaundrysolutions.com.au)
    const socketUrl = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:8000';

    console.log('Socket.IO connecting to:', socketUrl);

    // Initialize socket connection
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket.io connected');
      setConnected(true);
      
      // Join user-specific room if user is logged in
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        newSocket.emit('join_room', { user_id: user.id });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.io disconnected');
      setConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('Socket.io server message:', data.message);
    });

    newSocket.on('room_joined', (data) => {
      console.log('Joined room:', data.room);
    });

    newSocket.on('notification', (notification) => {
      console.log('Received notification:', notification);
      
      // Add notification to state
      setNotifications(prev => [notification, ...prev]);
      
      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'order_locked' ? 'destructive' : 'default',
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [toast]);

  const joinRoom = useCallback((userId) => {
    if (socket && connected) {
      socket.emit('join_room', { user_id: userId });
    }
  }, [socket, connected]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      )
    );
  }, []);

  const value = {
    socket,
    connected,
    notifications,
    joinRoom,
    clearNotifications,
    markNotificationAsRead,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
