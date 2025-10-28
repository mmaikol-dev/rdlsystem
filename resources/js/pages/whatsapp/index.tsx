"use client";

import AppLayout from "@/layouts/app-layout";
import { Head, usePage } from "@inertiajs/react";
import { useState, useRef, useEffect } from "react";
import { type BreadcrumbItem } from "@/types";
import { 
  Check, 
  CheckCheck, 
  Send, 
  Search, 
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  Clock,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Chat {
  id: number;
  to: string;
  client_name: string;
  store_name: string;
  status: string; // sent | delivered | read
  sid: string;
  message: string;
  created_at: string;
  updated_at: string;
  type?: string; // 1 for green dot
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

export default function WhatsAppPage() {
  const { conversations: initialConversations } = usePage<{ conversations: Conversation[] }>().props;
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when chat changes or messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages, selected]);

  // Update selected conversation when conversations change
  useEffect(() => {
    if (selected) {
      const updatedSelected = conversations.find(conv => conv.phone === selected.phone);
      if (updatedSelected) {
        setSelected(updatedSelected);
      }
    }
  }, [conversations, selected?.phone]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phone.includes(searchQuery) ||
    conv.messages.some(msg => msg.message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
        case "read":
        return <CheckCheck className="w-3 h-3 text-red-500" />;
      case "failed":
        return <Clock className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getInitials = (name: string, phone: string) => {
    if (name && name !== phone) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return phone.slice(-2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleSend = async () => {
    if (!selected || !message.trim()) return;

    const newMsg: Chat = {
      id: Date.now(),
      to: selected.phone,
      client_name: selected.client_name,
      store_name: selected.store_name,
      status: "pending",
      sid: "",
      message: message.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type: "1",
    };

    // Update conversations with the new message (optimistic update)
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.phone === selected.phone 
          ? {
              ...conv,
              messages: [...conv.messages, newMsg],
              latest_at: newMsg.created_at,
            }
          : conv
      )
    );
    
    setMessage("");

    try {
      const res = await fetch("/api/whatsapp/send-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
        },
        body: JSON.stringify({ to: selected.phone, message: newMsg.message }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowModal(true);
        // Update message status to sent
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.phone === selected.phone 
              ? {
                  ...conv,
                  messages: conv.messages.map(msg => 
                    msg.id === newMsg.id ? { ...msg, status: "sent", sid: data.sid || "" } : msg
                  )
                }
              : conv
          )
        );
      } else {
        alert("Failed to send message.");
        // Rollback optimistic update
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.phone === selected.phone 
              ? {
                  ...conv,
                  messages: conv.messages.filter(msg => msg.id !== newMsg.id)
                }
              : conv
          )
        );
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while sending the message.");
      // Rollback optimistic update
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.phone === selected.phone 
            ? {
                ...conv,
                messages: conv.messages.filter(msg => msg.id !== newMsg.id)
              }
            : conv
        )
      );
    }
  };

  const getUnreadCount = (conversation: Conversation) => {
    return conversation.messages.filter(msg => 
      !["sent", "delivered", "read", "pending"].includes(msg.status)
    ).length;
  };

  return (
    <AppLayout breadcrumbs={BREADCRUMBS}>
      <Head title="WhatsApp Chats" />

      {/* Success Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-green-500" />
              Message Sent
            </DialogTitle>
            <DialogDescription>
              Your WhatsApp message has been sent successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-[calc(100vh-120px)] bg-background rounded-lg border overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b bg-background/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                WhatsApp Chats
              </h2>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No chats available</p>
                {searchQuery && (
                  <p className="text-sm mt-1">Try a different search term</p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv, idx) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  const unreadCount = getUnreadCount(conv);
                  const isSelected = selected?.phone === conv.phone;
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelected(conv)}
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        isSelected && "bg-muted border-r-2 border-r-primary"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-600 text-white font-medium">
                            {getInitials(conv.client_name, conv.phone)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {conv.client_name || conv.phone}
                              </span>
                              {lastMsg?.type === "1" && (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(conv.latest_at)}
                              </span>
                              {unreadCount > 0 && (
                                <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-green-600">
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <p className="text-sm text-muted-foreground truncate flex-1">
                              {lastMsg?.message}
                            </p>
                            {lastMsg && renderStatusIcon(lastMsg.status)}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            {conv.store_name}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          {selected ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-background/95 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-600 text-white">
                        {getInitials(selected.client_name, selected.phone)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">
                        {selected.client_name || selected.phone}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selected.phone} • {selected.store_name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {selected.messages.map((msg, index) => {
                    const isOutgoing = ["sent", "delivered", "read", "pending"].includes(msg.status);
                    const showTimestamp = index === 0 || 
                      new Date(msg.created_at).getDate() !== new Date(selected.messages[index - 1].created_at).getDate();
                    
                    return (
                      <div key={msg.id}>
                        {showTimestamp && (
                          <div className="text-center my-4">
                            <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        
                        <div
                          className={cn(
                            "flex",
                            isOutgoing ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2 relative",
                              isOutgoing
                                ? "bg-green-600 text-white rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            )}
                          >
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={cn(
                                "text-xs",
                                isOutgoing ? "text-green-100" : "text-muted-foreground"
                              )}>
                                {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </span>
                              {isOutgoing && (
                                <div className="text-green-100">
                                  {renderStatusIcon(msg.status)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-background/95 backdrop-blur-sm">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="sm" className="mb-1">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex-1 relative">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      className="pr-10 min-h-[40px] resize-none rounded-full bg-muted"
                      multiline
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim()}
                    size="sm"
                    className="mb-1 rounded-full w-10 h-10 p-0 bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Welcome to WhatsApp Business</h3>
              <p className="text-center max-w-md">
                Select a chat from the sidebar to start messaging your customers. 
                All your conversations are organized and ready for you.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
