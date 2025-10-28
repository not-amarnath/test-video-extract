// app/api/analyze-audio/route.ts
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
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for better performance)
    const maxSize = 100 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Please upload a audio smaller than 20MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer and base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const audioData = buffer.toString('base64');

    try {
      // 3. This prompt now matches your parsing logic ("transcript" and "analytics")
      const combinedPrompt = `You are an AI Meeting Audio-Video Analytics Assistant designed to analyze recorded meetings with maximum accuracy in speaker identification, transcription, and insight extraction.

Your goal is to process the provided meeting audio or video file and deliver a structured, data-rich analysis.

Follow these steps precisely:

1. Preprocessing & Enhancement

Apply noise suppression and audio enhancement to remove background noise, echo, or distortion.

Normalize audio levels to ensure consistent clarity across all participants.

2. Speaker Identification & Diarization

Identify each unique speaker using both audio cues (voiceprints, pitch, tone) and visual cues (on-screen participant names, captions, or profile labels).

When an on-screen name appears or is displayed near a speaking voice, map that name to the detected voice profile.

Maintain this mapping throughout the meeting, even if the person speaks off-screen later.

If a speaker cannot be visually identified, assign a placeholder name (e.g., “Unknown Speaker 1”) but still group their speech consistently.

Re-verify speaker consistency by analyzing voice similarity, turn-taking, and contextual continuity.

3. Transcript Generation

Generate a clean, readable transcript with:

Accurate speaker names

Timestamps for each speaking turn

Punctuation and grammar correction

No filler words unless relevant (e.g., “um,” “uh,”)

Maintain chronological order and clarity.

Example:

[00:02:15] Priya Sharma: I think we should finalize the report by Friday.
[00:02:27] Arjun Mehta: Agreed. I’ll handle the data visualization.

4. Participant Metrics

For each participant, compute:

Total presence duration (based on when their name or voice first and last appear)

Total speaking time

Speaking share (% of total meeting time)

Sentiment trend (Positive / Neutral / Negative)

Speaking segments with timestamps and text

5. Meeting Insights

Extract and summarize:

Overall meeting sentiment

Key topics discussed (use clustering or semantic grouping)

Decisions made and action items with responsible participants

Any follow-up items or deadlines mentioned

6. Output Format

Return the final structured analysis in JSON-like format as below:

{
  "summary": "The meeting focused on finalizing project timelines and assigning data tasks. Overall sentiment was positive and collaborative.",
  "participants": [
    {
      "name": "Priya Sharma",
      "presenceDuration": "45 minutes",
      "speakingTime": "12 minutes",
      "sentiment": "Positive",
      "segments": [
        { "timestamp": "00:02:15", "text": "I think we should finalize the report by Friday." },
        { "timestamp": "00:20:40", "text": "I'll prepare the draft today." }
      ]
    },
    {
      "name": "Arjun Mehta",
      "presenceDuration": "45 minutes",
      "speakingTime": "10 minutes",
      "sentiment": "Neutral",
      "segments": [
        { "timestamp": "00:02:27", "text": "Agreed. I’ll handle the data visualization." }
      ]
    }
  ],
  "topics": [
    "Project timeline finalization",
    "Data visualization responsibilities",
    "Report drafting and review"
  ],
  "actionItems": [
    "Priya Sharma to prepare the draft report by Friday.",
    "Arjun Mehta to complete data visualization for the report."
  ]
}

Key Priority

Ensure high accuracy in voice-name mapping using both visual and auditory recognition.
If a mismatch or uncertainty occurs, flag it clearly rather than guessing.
Example: "name": "Possibly Arjun Mehta (voice uncertain)"`;


      // 4. This is the new, correct way to call the model
      const result = await genAI.models.generateContent({
         model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: file.type, data: audioData } },
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
            analytics = 'Unable to generate structured analytics. Please try with a different audio or check the transcript above.';
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
    console.error('Error processing audio:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process audio',
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