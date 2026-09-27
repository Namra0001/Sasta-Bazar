import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2, Link as LinkIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const CustomerQA = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
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
          products (
            id,
            name,
            image_url
          )
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error fetching Q&A:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-6">
          <MessageSquare className="h-8 w-8 text-primary" />
          My Q&A
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : questions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">No questions asked yet!</h2>
              <p className="text-muted-foreground mb-6">
                When you ask a seller a question about a product, you'll see the history here.
              </p>
              <Link to="/shop" className="text-primary hover:underline">
                Explore Products
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => (
              <Card key={q.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <div className="flex justify-between items-start">
                    <Link to={`/product/${q.products?.id}`} className="flex items-center gap-4 group hover:opacity-80 transition-opacity">
                      <img 
                        src={q.products?.image_url || "/placeholder.svg"} 
                        alt={q.products?.name} 
                        className="w-12 h-12 rounded object-cover"
                        onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
                      />
                      <div>
                        <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                          {q.products?.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" /> View Product
                        </p>
                      </div>
                    </Link>
                    <Badge variant={q.answer ? "success" : "secondary"}>
                      {q.answer ? "Answered" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="bg-secondary/30 p-4 rounded-lg">
                      <p className="text-sm font-semibold mb-1">Your Question:</p>
                      <p className="text-foreground">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(q.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    {q.answer && (
                      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg ml-6 relative">
                        <div className="absolute top-4 -left-3 w-3 h-[1px] bg-primary/20"></div>
                        <p className="text-sm font-semibold mb-1 text-primary">Seller's Answer:</p>
                        <p className="text-foreground">{q.answer}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(q.answered_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
