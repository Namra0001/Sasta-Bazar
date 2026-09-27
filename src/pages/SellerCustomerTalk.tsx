import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";

export const SellerCustomerTalk = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    checkSellerAndFetch();
  }, []);

  const checkSellerAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/seller/auth');
        return;
      }
      
      const { data, error } = await supabase
        .from("product_questions")
        .select(`
          id,
          question,
          answer,
          created_at,
          answered_at,
          buyer_id,
          product_id,
          products (
            name,
            image_url
          )
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const buyerIds = [...new Set((data || []).map(q => q.buyer_id))];
      let profilesMap: Record<string, string> = {};
      
      if (buyerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", buyerIds);
          
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
        }
      }

      const questionsWithProfiles = (data || []).map(q => ({
        ...q,
        profiles: { full_name: profilesMap[q.buyer_id] || "Customer" }
      }));

      setQuestions(questionsWithProfiles);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({ title: "Error", description: "Could not load questions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (questionId: string) => {
    const answer = answers[questionId];
    if (!answer?.trim()) return;

    setSubmittingId(questionId);
    try {
      const { error } = await supabase
        .from("product_questions")
        .update({
          answer: answer.trim(),
          answered_at: new Date().toISOString()
        })
        .eq("id", questionId);

      if (error) throw error;

      toast({ title: "Answer sent!", description: "Your response has been published." });
      checkSellerAndFetch(); // Refresh
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } catch (error) {
      console.error("Failed to submit answer:", error);
      toast({ title: "Error", description: "Failed to submit answer", variant: "destructive" });
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/seller")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Customer Talk
          </h1>
          <p className="text-muted-foreground mt-2">
            Respond to questions from buyers about your products.
          </p>
        </div>

        <div className="space-y-12">
          {/* Pending Questions Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              Needs Answer <Badge variant="destructive">{unanswered.length}</Badge>
            </h2>
            {unanswered.length === 0 ? (
              <p className="text-muted-foreground">You're all caught up! No pending questions.</p>
            ) : (
              <div className="grid gap-4">
                {unanswered.map((q) => (
                  <Card key={q.id} className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-4">
                        <img 
                          src={q.products?.image_url || "/placeholder.svg"} 
                          alt={q.products?.name} 
                          className="w-16 h-16 rounded object-cover cursor-pointer"
                          onClick={() => window.open(`/product/${q.product_id}`, '_blank')}
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
                        />
                        <div>
                          <CardTitle className="text-lg">{q.products?.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Asked by: {q.profiles?.full_name || "Customer"} • {new Date(q.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-secondary/50 p-4 rounded-md">
                        <p className="font-semibold mb-1">Question:</p>
                        <p>{q.question}</p>
                      </div>
                      <div className="flex gap-2">
                        <Textarea 
                          placeholder="Type your answer here..."
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => handleAnswerSubmit(q.id)}
                          disabled={!answers[q.id]?.trim() || submittingId === q.id}
                        >
                          {submittingId === q.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                          Submit Answer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Answered Questions Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              Previously Answered <Badge variant="secondary">{answered.length}</Badge>
            </h2>
            {answered.length === 0 ? (
              <p className="text-muted-foreground">No questions answered yet.</p>
            ) : (
              <div className="grid gap-4">
                {answered.map((q) => (
                  <Card key={q.id} className="opacity-80">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4 mb-4">
                        <img 
                          src={q.products?.image_url || "/placeholder.svg"} 
                          alt={q.products?.name} 
                          className="w-12 h-12 rounded object-cover cursor-pointer"
                          onClick={() => window.open(`/product/${q.product_id}`, '_blank')}
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
                        />
                        <div>
                          <CardTitle className="text-md">{q.products?.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(q.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-secondary/50 p-3 rounded-md text-sm">
                          <span className="font-semibold">Q: </span>{q.question}
                        </div>
                        <div className="bg-primary/5 p-3 rounded-md text-sm border border-primary/20">
                          <span className="font-semibold text-primary">A: </span>{q.answer}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
