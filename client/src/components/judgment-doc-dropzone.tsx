// client/src/components/judgment-doc-dropzone.tsx
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ExtractedJudgmentFields = {
  debtorName: string;
  caseNumber: string | null;
  judgmentAmount: number;
  notes?: string | null;
};

type Props = {
  onExtract: (data: ExtractedJudgmentFields) => void;
};

export function JudgmentDocDropzone({ onExtract }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("auth_token")
          : null;

      const res = await fetch("/api/judgments/extract-from-doc", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }

      return (await res.json()) as ExtractedJudgmentFields;
    },
    onSuccess: (data) => {
      onExtract(data);
      toast({
        title: "Judgment data extracted",
        description:
          "We filled the form from your document. Please review before saving.",
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: "Could not extract data",
        description:
          error?.message ||
          "We couldn’t extract judgment fields from this document. Please check the file and try again.",
        variant: "destructive",
      });
    },
  });

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    setFileName(file.name);
    extractMutation.mutate(file);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "border-2 border-dashed rounded-md p-4 text-center text-sm cursor-pointer transition-colors",
          dragActive ? "border-primary bg-muted" : "border-muted-foreground/30",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="font-medium">Drag & drop a judgment PDF / Word doc here</p>
        <p className="text-xs text-muted-foreground">
          or click to browse. We read only real data from the document—no mock
          values.
        </p>
        {fileName && (
          <p className="text-xs text-muted-foreground mt-2 truncate">
            Selected: {fileName}
          </p>
        )}
        {extractMutation.isPending && (
          <p className="text-xs text-muted-foreground mt-2">
            Extracting judgment fields…
          </p>
        )}
      </div>
    </div>
  );
}
