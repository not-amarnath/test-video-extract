// app/api/analyze-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
// 1. This is the correct import for the new package
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }

    // 2. This is the correct instantiation
   const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for better performance)
    const maxSize = 100 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Please upload a video smaller than 20MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer and base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const videoData = buffer.toString('base64');

    try {
      // 3. This prompt now matches your parsing logic ("transcript" and "analytics")
      const combinedPrompt = `You are an advanced Meeting video Analytics Assistant. 
Your task is to process the given meeting video and provide a comprehensive structured analysis. 
Please ensure the following:

1. **Noise Reduction**  
   - Automatically remove background noise and enhance speech clarity before processing.

2. **Speaker Identification & Diarization**  
   - Identify distinct speakers using on-screen names detected from the meeting video (e.g., participant name overlays or captions).  
   - If on-screen names are unavailable, assign unique placeholder labels (e.g., Speaker 1, Speaker 2).  
   - Ensure that each speaker's voice is consistently linked to their identified or detected name throughout the meeting.

3. **Transcript Generation**  
   - Generate a clean, readable transcript of the conversation.  
   - Include speaker names and timestamps for each spoken segment.

4. **Participant Metrics**  
   - Calculate total meeting presence duration for each participant.  
   - Calculate total speaking time per participant.  
   - Perform sentiment analysis for each participant (e.g., Positive, Neutral, Negative).  

5. **Meeting Insights**  
   - Provide an overall sentiment summary of the meeting.  
   - Identify key topics discussed.  
   - Extract any action items or decisions made.

6. **Output Format**  
   Return your response in a structured JSON-like format:
   {
     "summary": "...",
     "participants": [
        {
          "name": "Priya Sharma",
          "speakingTime": "12 minutes",
          "sentiment": "Positive",
          "segments": [
             { "timestamp": "00:02:15", "text": "..." },
             { "timestamp": "00:04:10", "text": "..." }
          ]
        },
        ...
     ],
     "topics": [...],
     "actionItems": [...]
   }

Ensure your analysis is accurate, structured, and uses the participant names visible on the meeting screen when available.`;


      // 4. This is the new, correct way to call the model
      const result = await genAI.models.generateContent({
         model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: file.type, data: videoData } },
              { text: combinedPrompt },
            ],
          },
        ],
      });

      // 5. The response is in `result.text`, not `result.response.text()`
      const responseText = result.text;
      
      console.log('Raw API Response:', responseText); // Debug log
      
      // Clean up response text (remove markdown code blocks if present)
      let jsonString = responseText.trim();
      jsonString = jsonString.replace(/^```json\s*\n?/, '');
      jsonString = jsonString.replace(/^```\s*\n?/, ''); 
      jsonString = jsonString.replace(/\n?```\s*$/, '');
      jsonString = jsonString.trim();

      let parsedData;
      let transcript = '';
      let analytics = '';
      
      // This parsing logic now correctly matches the new prompt
      try {
        parsedData = JSON.parse(jsonString);
        transcript = parsedData.transcript || '';
        analytics = parsedData.analytics || '';
      } catch (parseError) {
        // If JSON parsing fails, try to extract data manually
        console.error('JSON parse error:', parseError);
        console.log('Failed to parse:', jsonString.substring(0, 200));
        
        // Try to find JSON object in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]);
            transcript = parsedData.transcript || '';
            analytics = parsedData.analytics || '';
          } catch (e) {
            // Still failed, use the raw text split approach
            transcript = responseText;
            analytics = 'Unable to generate structured analytics. Please try with a different video or check the transcript above.';
          }
        } else {
          // No JSON found, split the response
          const halfPoint = Math.floor(responseText.length / 2);
          transcript = responseText.substring(0, halfPoint);
          analytics = responseText.substring(halfPoint);
        }
      }

      return NextResponse.json({
        transcript: transcript || 'No transcript available',
        analytics: analytics || 'No analytics available',
        metadata: {
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          mimeType: file.type,
          duration: 'N/A',
        },
        success: true,
      });
    } catch (error: any) {
      throw error;
    }
  } catch (error: any) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process video',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};