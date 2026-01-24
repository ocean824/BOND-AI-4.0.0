import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Search, Filter, ChevronLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Document {
  id: number;
  name: string;
  type: string;
  bondName: string;
  bondId: number;
  size: string;
  uploadedAt: string;
  category: string;
}

export default function InvestorDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, categoryFilter, documents]);

  const loadDocuments = async () => {
    try {
      const data = await apiRequest("GET", "/api/investor/documents");
      setDocuments(data.documents || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchQuery) {
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.bondName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((doc) => doc.category === categoryFilter);
    }

    setFilteredDocuments(filtered);
  };

  const downloadDocument = async (documentId: number, documentName: string) => {
    try {
      const response = await fetch(`/api/investor/documents/${documentId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      prospectus: "bg-blue-600",
      "term-sheet": "bg-purple-600",
      "legal-opinion": "bg-green-600",
      settlement: "bg-orange-600",
      other: "bg-gray-600",
    };

    return (
      <Badge className={colors[category] || colors.other}>
        {category.replace("-", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading documents...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        onClick={() => setLocation("/exchange/overview")}
        className="mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Exchange Overview
      </Button>

      <div>
        <h1 className="text-3xl font-bold">My Documents</h1>
        <p className="text-muted-foreground mt-2">
          Access all your bond-related documents in one place
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents or bonds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="prospectus">Prospectus</SelectItem>
                <SelectItem value="term-sheet">Term Sheet</SelectItem>
                <SelectItem value="legal-opinion">Legal Opinion</SelectItem>
                <SelectItem value="settlement">Settlement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {documents.length === 0 ? "No Documents Yet" : "No Matching Documents"}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {documents.length === 0
                ? "Your documents will appear here once you own bonds."
                : "Try adjusting your search or filter criteria."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <h3 className="font-semibold text-lg">{doc.name}</h3>
                        <p className="text-sm text-muted-foreground">{doc.bondName}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        {getCategoryBadge(doc.category)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => downloadDocument(doc.id, doc.name)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold">Document Security</h4>
              <p className="text-sm text-muted-foreground">
                All documents are encrypted and securely stored. You can only access documents for bonds you own or have participated in.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
