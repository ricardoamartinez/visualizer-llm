'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card"
import { ScrollArea } from "../components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Separator } from "../components/ui/separator"
import { Send, Bot, User, Image, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import ChatMessage from './components/ChatMessage';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

const ThinkingMessage = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center space-x-2 text-gray-500 dark:text-gray-400"
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="font-medium">Thinking{dots}</span>
    </motion.div>
  );
};

export default function Home() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [visualizationData, setVisualizationData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch response')
      }

      const data = await response.json()
      const assistantMessage = { role: 'assistant', content: data.response }
      setMessages(prev => [...prev, assistantMessage])

      if (data.visualizationData) {
        setVisualizationData(JSON.parse(data.visualizationData))
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessage = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...props }) => <p className="mb-2" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-2" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-2" {...props} />,
          code: ({ node, inline, ...props }) => 
            inline ? (
              <code className="bg-gray-200 dark:bg-gray-700 rounded px-1" {...props} />
            ) : (
              <pre className="bg-gray-200 dark:bg-gray-700 rounded p-2 overflow-x-auto mb-2">
                <code {...props} />
              </pre>
            ),
          // @ts-ignore
          inlineMath: ({ value }) => <InlineMath math={value} />,
          // @ts-ignore
          math: ({ value }) => <BlockMath math={value} />,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-black p-4">
      <div className="flex w-full max-w-[1800px] mx-auto space-x-4">
        <Card className="w-1/3 h-[90vh] flex flex-col bg-white dark:bg-black border-gray-200 dark:border-gray-800 shadow-lg">
          <CardHeader className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="text-center text-2xl font-bold text-black dark:text-white flex items-center justify-center">
              <Bot className="mr-2 text-blue-500" /> AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="mb-4"
                  >
                    <ChatMessage 
                      message={message.content} 
                      isUser={message.role === 'user'} 
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex justify-start mb-4"
                >
                  <div className="flex items-start space-x-2 max-w-[80%]">
                    <Avatar className="bg-green-500">
                      <AvatarFallback><Bot size={20} className="text-white" /></AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl p-3 bg-white dark:bg-black text-black dark:text-white border border-gray-200 dark:border-gray-800">
                      <ThinkingMessage />
                    </div>
                  </div>
                </motion.div>
              )}
            </ScrollArea>
          </CardContent>
          <Separator className="bg-gray-200 dark:bg-gray-800" />
          <CardFooter className="p-4 bg-white dark:bg-black">
            <form onSubmit={handleSubmit} className="flex w-full space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-gray-400 dark:focus:border-gray-600 transition-all duration-300"
                disabled={isLoading}
              />
              <Button type="submit" className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-black transition-all duration-300" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={18} className="text-current" />}
              </Button>
            </form>
          </CardFooter>
        </Card>

        <Card className="w-2/3 h-[90vh] flex flex-col bg-white dark:bg-black border-gray-200 dark:border-gray-800 shadow-lg">
          <CardHeader className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="text-center text-2xl font-bold text-black dark:text-white flex items-center justify-center">
              <Image className="mr-2 text-purple-500" /> Visualization
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow p-4 flex items-center justify-center bg-black">
            <AnimatePresence mode="wait">
              {visualizationData ? (
                <motion.div
                  key="plot"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="w-full h-full"
                >
                  <Plot
                    data={visualizationData.data}
                    layout={{
                      ...visualizationData.layout,
                      autosize: true,
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0)',
                      font: { color: '#fff' },
                      margin: { l: 40, r: 40, t: 40, b: 40 },
                      xaxis: { ...visualizationData.layout.xaxis, color: '#fff', gridcolor: '#444' },
                      yaxis: { ...visualizationData.layout.yaxis, color: '#fff', gridcolor: '#444' },
                      zaxis: { ...visualizationData.layout.zaxis, color: '#fff', gridcolor: '#444' },
                      legend: { ...visualizationData.layout.legend, font: { color: '#fff' } },
                      scene: {
                        xaxis: { gridcolor: '#444', zerolinecolor: '#444' },
                        yaxis: { gridcolor: '#444', zerolinecolor: '#444' },
                        zaxis: { gridcolor: '#444', zerolinecolor: '#444' },
                      }
                    }}
                    config={{ responsive: true }}
                    style={{ width: "100%", height: "100%" }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-gray-500 dark:text-gray-400 text-center"
                >
                  <Image size={64} className="mx-auto mb-4 text-purple-500 animate-pulse" />
                  <p>No visualization available. Start a conversation to generate visualizations.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
