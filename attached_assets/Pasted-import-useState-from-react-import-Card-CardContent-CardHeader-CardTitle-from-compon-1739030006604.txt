import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Video, Upload, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function FormCheck() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a video smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    const videoUrl = URL.createObjectURL(file);
    setVideoPreview(videoUrl);
    setIsAnalyzing(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('/api/form-check', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze video');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze video');
      }

      setFeedback(data.analysis);
      toast({
        title: "Analysis complete",
        description: "Check out your form feedback below",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze video",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Video className="h-5 w-5" />
          Form Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <label htmlFor="video-upload" className="w-full">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <div className="text-sm text-center">
                  <span className="font-medium text-primary">Click to upload</span> or drag and drop
                  <p className="text-xs text-gray-500">MP4 or MOV up to 50MB</p>
                </div>
              </div>
            </div>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoUpload}
              disabled={isAnalyzing}
            />
          </label>

          {videoPreview && (
            <div className="w-full max-w-lg mx-auto mt-4">
              <video 
                src={videoPreview} 
                controls 
                className="w-full rounded-lg shadow-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing your form...</span>
            </div>
          )}

          {feedback && (
            <div className="w-full p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">AI Form Analysis</h3>
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{feedback}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
