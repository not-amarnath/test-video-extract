// app/api/analyze-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 20MB for better performance)
    const maxSize = 20 * 1024 * 1024; // 20MB
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
      // Try different model names - use the one that works for your API key
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

      // Combined prompt for better efficiency (single API call)
      const combinedPrompt = `Analyze this video and provide your response in the following JSON format:

{
  "transcript": "Complete transcription of all spoken content in the video",
  "analytics": "Detailed analysis including:\\n1. Summary of main topics\\n2. Key themes and subjects\\n3. Sentiment analysis (tone and mood)\\n4. Important keywords and phrases\\n5. Speaker characteristics\\n6. Content categorization\\n7. Actionable insights\\n8. Notable timestamps or segments"
}

Important: Return ONLY the JSON object, no additional text or markdown formatting.`;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: file.type,
            data: videoData,
          },
        },
        combinedPrompt,
      ]);

      const responseText = result.response.text();
      
      console.log('Raw API Response:', responseText); // Debug log
      
      // Clean up response text (remove markdown code blocks if present)
      let jsonString = responseText.trim();
      jsonString = jsonString.replace(/^```json\s*\n?/, '');
      jsonString = jsonString.replace(/^```\s*\n?/, ''); // Also try without 'json'
      jsonString = jsonString.replace(/\n?```\s*$/, '');
      jsonString = jsonString.trim();

      let parsedData;
      let transcript = '';
      let analytics = '';
      
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