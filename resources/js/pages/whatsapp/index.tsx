"use client";

import AppLayout from "@/layouts/app-layout";
import { Head, usePage } from "@inertiajs/react";
import { useState, useEffect, useRef, useMemo } from "react";
import { type BreadcrumbItem } from "@/types";
import { Check, CheckCheck } from "lucide-react";

interface Chat {
  id: number;
  to: string;
  client_name: string;
  store_name: string;
  status: string;
  sid: string;
  message: string;
  created_at: string;
  updated_at: string;
  type?: string;
}

interface Conversation {
  phone: string;
  client_name: string;
  store_name: string;
  messages: Chat[];
  latest_at: string;
}

const BREADCRUMBS: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "WhatsApp Chats", href: "/whatsapp" },
];

// ✅ Status icon mapping
const STATUS_ICONS = {
  sent: <Check className="w-4 h-4 text-gray-500 inline-block ml-1" />,
  delivered: <CheckCheck className="w-4 h-4 text-gray-500 inline-block ml-1" />,
  read: <CheckCheck className="w-4 h-4 text-blue-500 inline-block ml-1" />,
};

function ChatItem({
  conversation,
  selected,
  onClick,
}: {
  conversation: Conversation;
  selected?: Conversation | null;
  onClick: () => void;
}) {
  const lastMsg = conversation.messages[conversation.messages.length - 1];
  return (
    <div
      onClick={onClick}
      className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
        selected?.phone === conversation.phone ? "bg-gray-200" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">{conversation.client_name || conversation.phone}</span>
          {lastMsg?.type === "1" && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
        </div>
        <span className="text-xs text-gray-400">
          {new Date(conversation.latest_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="text-sm text-gray-600 truncate">{lastMsg?.message}</div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Chat }) {
  const isOutgoing = ["sent", "delivered", "read"].includes(msg.status);
  return (
    <div
      className={`p-3 rounded-lg max-w-md break-words ${
        isOutgoing ? "bg-green-100 self-end ml-auto" : "bg-gray-100 self-start"
      }`}
    >
      <div>{msg.message}</div>
      <div className="flex items-center justify-end text-xs text-gray-400 mt-1">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {STATUS_ICONS[msg.status]}
      </div>
    </div>
  );
}

export default function WhatsAppPage() {
  const { conversations } = usePage<{ conversations: Conversation[] }>().props;
  const [selected, setSelected] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <Head title="WhatsApp Chats" />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-1/4 border-r flex flex-col">
          <div className="p-4 border-b font-bold text-lg">Chats</div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-gray-500">No chats available</div>
            ) : (
              conversations.map((conv) => (
                <ChatItem
                  key={conv.phone}
                  conversation={conv}
                  selected={selected}
                  onClick={() => setSelected(conv)}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          {selected ? (
            <>
              {/* Header */}
              <div className="p-4 border-b font-semibold bg-white">
                {selected.client_name || selected.phone} ({selected.phone})
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-white">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
