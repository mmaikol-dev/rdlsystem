"use client";

import { useState, useEffect, useRef } from "react";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem } from "@/types";
import { Head, usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Package,
  Calendar,
  MessageCircle,
  Store,
  BarChart,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  id: number;
  type: "user" | "ai";
  content: string;
  created_at: string;
  loading?: boolean; // NEW: mark as thinking
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "RDL Ai", href: "/rdl-ai" },
];

export default function RdlAi() {
  const { auth } = usePage().props;
  const username = auth?.user?.name || "User";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (preset?: string) => {
    const content = preset || input;
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: "user",
      content,
      created_at: new Date().toISOString(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Add placeholder "thinking..." AI message
    const thinkingId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      {
        id: thinkingId,
        type: "ai",
        content: "Thinking...",
        created_at: new Date().toISOString(),
        loading: true,
      },
    ]);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });
      const data = await response.json();

      // Replace the "thinking" message with actual reply
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingId
            ? {
                ...msg,
                content: data.reply || "AI did not respond.",
                loading: false,
              }
            : msg
        )
      );
    } catch (error) {
      toast.error("Failed to get AI response");

      // Replace with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingId
            ? { ...msg, content: "⚠️ Failed to respond", loading: false }
            : msg
        )
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    { icon: <Search size={20} />, text: "Find an order by number (e.g. ODD123)" },
    { icon: <Package size={20} />, text: "Check pending or delivered orders" },
    { icon: <Calendar size={20} />, text: "Show today’s delivery schedule" },
    { icon: <MessageCircle size={20} />, text: "Search by customer name or phone" },
    { icon: <Store size={20} />, text: "Filter orders by merchant" },
    { icon: <BarChart size={20} />, text: "Get order & product counts" },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="RDL Ai" />

      <div className="flex flex-col h-full p-4 gap-4">
        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto border rounded-lg p-6 flex flex-col gap-3 bg-white">
          {messages.length === 0 ? (
            <div className="text-center mt-10">
              <h1 className="text-2xl font-bold mb-2">
                Hi, {username} 👋 my name is <span className="text-blue-600">Elly</span>, your AI assistant
              </h1>
              <p className="text-gray-500 mb-6">Want to try out a few things?</p>

              {/* Suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 transition rounded-xl shadow-sm cursor-pointer"
                  >
                    <div className="text-blue-500">{s.icon}</div>
                    <p className="text-gray-700 font-medium">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.type === "user"
                    ? "self-end bg-blue-500 text-white"
                    : "self-start bg-gray-200 text-gray-800"
                }`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Thinking...</span>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
                <span className="text-xs text-gray-500 mt-1 block">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask Elly anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Button onClick={() => sendMessage()}>Send</Button>
        </div>
      </div>
    </AppLayout>
  );
}
