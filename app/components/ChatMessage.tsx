import React from 'react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User } from 'lucide-react'

interface ChatMessageProps {
  message: string;
  isUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser }) => {
  return (
    <div className="flex items-start mb-4">
      <Avatar className={isUser ? 'bg-blue-500' : 'bg-green-500'}>
        <AvatarFallback>{isUser ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}</AvatarFallback>
      </Avatar>
      <div className={`rounded-2xl p-3 ${
        isUser 
          ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white' 
          : 'bg-white dark:bg-black text-black dark:text-white border border-gray-200 dark:border-gray-800'
      }`}>
        {message.includes('plotly-chart') && (
          <div className="w-full h-full">
            <div 
              className="plot-container plotly w-full h-full"
              dangerouslySetInnerHTML={{ __html: message }}
            />
          </div>
        )}
        <Latex>{message}</Latex>
      </div>
    </div>
  );
};

export default ChatMessage;
