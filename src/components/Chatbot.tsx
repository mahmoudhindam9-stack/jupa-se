import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, X, MessageSquare, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [model, setModel] = useState("gemini-3.5-flash");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hello! I am the Restocash Assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const botMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botMessageId, role: "model", text: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          botText += decoder.decode(value, { stream: true });

          setMessages((prev) =>
            prev.map((msg) => (msg.id === botMessageId ? { ...msg, text: botText } : msg)),
          );
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? { ...msg, text: "Sorry, I encountered an error while processing your request." }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-105 transition-transform bg-primary text-primary-foreground"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col shadow-xl transition-all duration-300 ease-in-out border overflow-hidden bg-background",
        isMaximized
          ? "w-[90vw] h-[90vh] right-[5vw] bottom-[5vh]"
          : "w-[380px] h-[600px] max-h-[85vh] max-w-[90vw]",
      )}
    >
      <CardHeader className="flex flex-col space-y-2 p-4 border-b bg-muted/50 shrink-0">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-md font-medium">Restocash Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMaximized(!isMaximized)}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted rounded-tl-sm border",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {msg.role === "user" ? (
                  <>
                    <span className="font-semibold text-xs opacity-80 ml-auto">You</span>
                    <User className="h-3 w-3 opacity-80" />
                  </>
                ) : (
                  <>
                    <Bot className="h-3 w-3 opacity-80" />
                    <span className="font-semibold text-xs opacity-80">Assistant</span>
                  </>
                )}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "model" && (
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%] border flex items-center gap-2">
              <Bot className="h-4 w-4 opacity-50" />
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-3 border-t bg-background shrink-0">
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Restocash..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
