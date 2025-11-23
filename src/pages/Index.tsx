import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Send, Heart, Activity, Shield, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const HEALTH_TOPICS = [
  { icon: Activity, label: "COVID-19", prompt: "Tell me about COVID-19 symptoms and prevention" },
  { icon: Heart, label: "Heart Health", prompt: "What are common heart disease risk factors?" },
  { icon: Shield, label: "Vaccination", prompt: "Why are vaccinations important?" },
  { icon: Users, label: "Mental Health", prompt: "How can I maintain good mental health?" },
];

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantMessage;
                    return newMessages;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleTopicClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-health-light to-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-health-blue to-health-teal mb-4 shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-health-blue to-health-teal bg-clip-text text-transparent mb-2">
            Public Health Assistant
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get reliable information about diseases, prevention, and health awareness. 
            Always consult healthcare professionals for medical advice.
          </p>
        </header>

        {/* Main Chat Area */}
        <Card className="mb-6 shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          {messages.length === 0 ? (
            <div className="p-8 space-y-6">
              <h2 className="text-xl font-semibold text-center mb-4">
                Choose a topic to get started
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {HEALTH_TOPICS.map((topic, index) => (
                  <Button
                    key={index}
                    onClick={() => handleTopicClick(topic.prompt)}
                    variant="outline"
                    className="h-auto py-6 px-6 flex flex-col items-center gap-3 hover:bg-health-light hover:border-health-blue transition-all duration-300 hover:shadow-md group"
                  >
                    <topic.icon className="w-8 h-8 text-health-blue group-hover:scale-110 transition-transform" />
                    <span className="font-medium">{topic.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[500px] p-6" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    } animate-fade-in`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-health-blue to-health-teal text-white ml-auto"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-muted rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-health-blue rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-health-teal rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-health-blue rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Input Area */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about health topics, symptoms, or prevention..."
                disabled={isLoading}
                className="flex-1 border-health-blue/20 focus:border-health-blue transition-colors"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-health-blue to-health-teal hover:opacity-90 transition-opacity shadow-md"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Card>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground mt-4 max-w-2xl mx-auto">
          This chatbot provides general health information only. It is not a substitute for professional medical advice, 
          diagnosis, or treatment. Always seek the advice of your physician or qualified health provider.
        </p>
      </div>
    </div>
  );
};

export default Index;
