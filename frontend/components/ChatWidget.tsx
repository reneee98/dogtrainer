import { useState } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Dobrý deň! Ako vám môžem pomôcť?',
      sender: 'support',
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate support response
    setTimeout(() => {
      const response: Message = {
        id: Date.now() + 1,
        text: 'Ďakujem za vašu správu! Náš tím vám odpovie čo najskôr.',
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary-600 text-white p-3 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl w-80 max-w-sm">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-medium">Podpora</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    message.sender === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Napíšte správu..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 